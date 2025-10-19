// store/unoGameStore.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Card, Color } from '../src/model/deck'
import type { Round } from '../src/model/interfaces/round_interface'
import { standardRandomizer, standardShuffler } from '../src/utils/random_utils'
import type { Game } from '../src/model/interfaces/game_interface'
import { makeGame } from '../src/model/uno'

type Opts = {
  players: string[]
  targetScore?: number
  cardsPerPlayer?: number
}

type GameLike = {
  startNewRound: () => void
  currentRound: () => Round | undefined
  winner: () => number | undefined
  score: (ix: number) => number
}

// lazy worker instance
let botWorker: Worker | null = null
function getBotWorker() {
  if (!botWorker) {
    botWorker = new Worker(new URL('../src/bot.worker.ts', import.meta.url), { type: 'module' })
  }
  return botWorker
}
function disposeWorker() {
  if (botWorker) {
    botWorker.terminate()
    botWorker = null
  }
}

// structured-clone safe serializer
function toPlain<T>(val: T): T {
  return deepStrip(val) as T
}
function deepStrip(input: any): any {
  if (input == null) return input
  if (Array.isArray(input)) return input.map(deepStrip)
  const t = typeof input
  if (t === 'function' || t === 'symbol') return undefined
  if (t !== 'object') return input

  // plain object check
  const isPlain = Object.prototype.toString.call(input) === '[object Object]'
  const src = isPlain ? input : Object.assign({}, input)

  const out: any = {}
  for (const k of Object.keys(src)) {
    const v = src[k]
    if (typeof v === 'function' || typeof v === 'symbol') continue
    out[k] = deepStrip(v)
  }
  return out
}

export const useUnoGameStore = defineStore('unoGame', () => {
  const showPopUpMessage = ref<boolean | null>(null)
  const popUpMessage = ref<string | null>(null)
  const popUpTitle = ref<string | null>(null)

  function setMessage(title: string, msg: string) {
    popUpTitle.value = title
    popUpMessage.value = msg
    showPopUpMessage.value = true
  }
  function clearMessage() {
    showPopUpMessage.value = null
    popUpMessage.value = null
    popUpTitle.value = null
  }

  const optsRef = ref<Opts | null>(null)
  const game = ref<Game | null>(null)

  function attachRoundListener(r: Round) {
    r.onEnd?.(({ winner }) => {
      const opts = optsRef.value
      if (!opts) return
      setMessage('Round over', `${opts.players[winner]} wins the round!`)
    })
  }

  function wireStartNewRound(g: GameLike) {
    const origStartNewRound = g.startNewRound.bind(g)
      ; (g as any).startNewRound = () => {
        origStartNewRound()
        const cr = g.currentRound()
        if (cr) attachRoundListener(cr)
      }
  }

  function init(opts: Opts) {
    optsRef.value = toPlain(opts) // avoid proxies in players array
    game.value = makeGame(
      standardRandomizer,
      standardShuffler,
      opts.cardsPerPlayer ?? 7,
      opts.players,
      opts.targetScore ?? 500,
    )
    wireStartNewRound(game.value as unknown as GameLike)
    const r = (game.value as unknown as GameLike).currentRound()
    if (r) attachRoundListener(r)
    clearMessage()
  }

  // reads
  function round() {
    return (game.value as unknown as GameLike | null)?.currentRound()
  }
  function playerInTurn(): number | undefined {
    const r = round()
    if (!r) return undefined
    return r.playerInTurn()
  }
  function hasEnded(): boolean {
    const r = round()
    if (!r) return false
    return r.hasEnded()
  }
  function winner(): number | undefined {
    const r = round()
    if (!r) return undefined
    return r.winner()
  }
  function gameWinner(): number | undefined {
    const g = game.value as unknown as GameLike | null
    return g?.winner()
  }
  function isGameOver(): boolean {
    return gameWinner() !== undefined
  }
  function scoreOf(ix: number): number {
    const g = game.value as unknown as GameLike | null
    return g ? g.score(ix) : 0
  }
  function topDiscard(): Card | undefined {
    const r = round()
    if (!r) return undefined
    return r.discardPile().top()
  }
  function drawPileSize(): number {
    const r = round()
    if (!r) return 0
    return r.drawPile().size
  }
  function handOf(ix: number): Card[] {
    const r = round()
    if (!r) return []
    return r.playerHand(ix) ?? []
  }
  function handCountOf(ix: number): number {
    return handOf(ix).length
  }
  function canPlayAt(cardIx: number): boolean {
    const r = round()
    if (!r) return false
    return r.canPlay(cardIx)
  }

  // writes
  function playCard(cardIx: number, askedColor?: Color): void {
    const r = round()
    if (!r) return
    r.play(cardIx, askedColor)
  }
  function draw(): void {
    const r = round()
    if (!r) return
    r.draw()
  }
  function sayUno(playerIx: number): void {
    const r = round()
    if (!r) return
    r.sayUno(playerIx)
  }
  function accuse(accuser: number, accused: number): boolean {
    const r = round()
    if (!r) return false
    return r.catchUnoFailure({ accuser, accused })
  }

  // bot helpers
  function isBot(ix: number) {
    const opts = optsRef.value
    if (!opts) return false
    return ix >= 0 && ix < opts.players.length - 1
  }
  function buildCanPlayArray(r: Round, handLen: number): boolean[] {
    const res: boolean[] = []
    for (let i = 0; i < handLen; i++) res.push(r.canPlay(i))
    return res
  }
  function allOtherPlayers(ix: number): number[] {
    const opts = optsRef.value
    if (!opts) return []
    const arr: number[] = []
    for (let i = 0; i < opts.players.length; i++) if (i !== ix) arr.push(i)
    return arr
  }

  // worker-based bot
  async function botTakeTurn(): Promise<boolean> {
    const r = round()
    if (!r) return false

    const ix = r.playerInTurn()
    if (ix === undefined || !isBot(ix)) return false

    const opts = optsRef.value
    if (!opts) return false

    const worker = getBotWorker()

    const canBotPlayNow = () => {
      const rawHand = handOf(ix)
      return buildCanPlayArray(r, rawHand.length).some(Boolean)
    }

    const mkPayload = () => {
      const rawHand = handOf(ix)
      return {
        kind: 'TURN' as const,
        ix,
        players: toPlain(opts.players.slice()),
        hand: toPlain(rawHand),
        canPlay: toPlain(buildCanPlayArray(r, rawHand.length)),
        oneCardLeft: rawHand.length === 1,
        accuseCandidates: toPlain(allOtherPlayers(ix)),
      }
    }

    const reply: {
      action: 'play' | 'draw'
      cardIx?: number
      askedColor?: Color
      sayUno?: boolean
      accusations?: number[]
      message?: { title: string; text: string }
    } = await new Promise((resolve, reject) => {
      const onMsg = (ev: MessageEvent<any>) => {
        worker.removeEventListener('message', onMsg as any)
        resolve(ev.data)
      }
      const onErr = (e: any) => {
        worker.removeEventListener('error', onErr as any)
        reject(e)
      }
      worker.addEventListener('message', onMsg as any, { once: true })
      worker.addEventListener('error', onErr as any, { once: true })
      worker.postMessage(mkPayload())
    })

    for (const t of reply.accusations ?? []) {
      try {
        accuse(ix, t) && setMessage('You are accused!', `${opts.players[ix]} accuses ${opts.players[t]} of not saying UNO! Now Draw 4`)
      } catch { }
    }

    if (reply.message) setMessage(reply.message.title, reply.message.text)

    if (reply.action === 'play' && typeof reply.cardIx === 'number') {
      if (reply.askedColor) playCard(reply.cardIx, reply.askedColor)
      else playCard(reply.cardIx)
    } else {
      const MAX_EXTRA_DRAWS = 30
      let draws = 0
      do {
        const beforeTurn = r.playerInTurn()
        draw()
        draws++
        if (r.playerInTurn() !== beforeTurn) break
        if (canBotPlayNow()) break
      } while (draws < MAX_EXTRA_DRAWS)
    }

    if (reply.sayUno) {
      setMessage('Bot says UNO!', `Bot ${opts.players[ix]} says UNO!`)
      sayUno(ix)
    }

    return true
  }

  function reset() {
    const opts = optsRef.value
    if (!opts) return
    disposeWorker()
    init(opts)
  }

  return {
    init, reset,
    game,
    round, playerInTurn, hasEnded, winner, isGameOver, gameWinner, scoreOf, topDiscard, drawPileSize, handOf, handCountOf, canPlayAt,
    playCard, draw, sayUno, accuse,
    botTakeTurn,
    showPopUpMessage, popUpMessage, popUpTitle, setMessage, clearMessage,
  }
})
