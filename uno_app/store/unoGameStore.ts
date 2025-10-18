import { ref } from 'vue'
import { defineStore } from 'pinia'
import { Card, Color } from '@uno/shared/model/deck'
import { Round } from '@uno/shared/model/round'
import { Game } from '@uno/shared/model/uno'
import { standardRandomizer, standardShuffler } from '@uno/shared/utils/random_utils'
import { randomDelay } from '@uno/shared/utils/bot_delay'

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
  // keep the real instance, but expose as GameLike for helpers to avoid  mismatch
  const game = ref<Game | null>(null)

  function attachRoundListener(r: Round) {
    r.onEnd?.(({ winner }) => {
      const opts = optsRef.value
      if (!opts) return
      setMessage('Round over', `${opts.players[winner]} wins the round!`)
    })
  }

  // accept the minimal shape we patch
  function wireStartNewRound(g: GameLike) {
    const origStartNewRound = g.startNewRound.bind(g)
    ;(g as any).startNewRound = () => {
      origStartNewRound()
      const cr = g.currentRound()
      if (cr) attachRoundListener(cr)
    }
  }

  function init(opts: Opts) {
    optsRef.value = opts
    game.value = new Game(
      opts.players,
      opts.targetScore ?? 500,
      standardRandomizer,
      standardShuffler,
      opts.cardsPerPlayer ?? 7,
    )
    // cast to GameLike only where needed
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

  // bots
  function isBot(ix: number) {
    const opts = optsRef.value
    if (!opts) return false
    return ix >= 0 && ix < opts.players.length - 1
  }
  function chooseWildColor(ix: number): Color {
    const hand = handOf(ix)
    const counts: Record<Color, number> = { RED: 0, YELLOW: 0, GREEN: 0, BLUE: 0 }
    for (const c of hand) {
      if ('color' in c) counts[(c as any).color as Color]++
    }
    let best: Color = 'RED'
    let bestN = -1
    for (const k of Object.keys(counts) as Color[]) {
      if (counts[k] > bestN) {
        best = k
        bestN = counts[k]
      }
    }
    return best
  }
  function botTryAccuse(ix: number) {
    const opts = optsRef.value
    if (!opts) return
    for (let t = 0; t < opts.players.length; t++) {
      if (t === ix) continue
      try {
        accuse(ix, t)
          ? setMessage(
              'You are accused!',
              `${opts.players[ix]} accuses ${opts.players[t]} of not saying UNO! Now Draw 4`,
            )
          : null
      } catch (e) {
        // ignore, just means bot was wrong
      }
    }
  }
  async function botTakeTurn(): Promise<boolean> {
    const r = round()
    if (!r) return false
    const ix = r.playerInTurn()
    if (ix === undefined || !isBot(ix)) return false

    //changed the delay to vary
    await new Promise((res) => setTimeout(res, randomDelay()))
    botTryAccuse(ix)

    const hand = handOf(ix)
    let played = false
    for (let i = 0; i < hand.length; i++) {
      if (r.canPlay(i)) {
        const card = hand[i]
        if (card.type === 'WILD' || card.type === 'WILD_DRAW') {
          setMessage(
            'Bot plays',
            `Bot ${optsRef.value?.players[ix]} plays ${card.type} and chooses ${chooseWildColor(ix)}`,
          )
          playCard(i, chooseWildColor(ix))
        } else {
          playCard(i)
        }
        played = true
        break
      }
    }
    if (!played) {
      draw()
    }

    // 50% chance to say UNO when having one card left
    if (handCountOf(ix) === 1) {
      if (Math.random() > 0.5) {
        setMessage('Bot says UNO!', `Bot ${optsRef.value?.players[ix]} says UNO!`)
        sayUno(ix)
      }
    }
    return true
  }

  function reset() {
    const opts = optsRef.value
    if (!opts) return
    init(opts)
  }

  return {
    init,
    reset,
    game,
    round,
    playerInTurn,
    hasEnded,
    winner,
    isGameOver,
    gameWinner,
    scoreOf,
    topDiscard,
    drawPileSize,
    handOf,
    handCountOf,
    canPlayAt,
    playCard,
    draw,
    sayUno,
    accuse,
    botTakeTurn,
    showPopUpMessage,
    popUpMessage,
    popUpTitle,
    setMessage,
    clearMessage,
  }
})
