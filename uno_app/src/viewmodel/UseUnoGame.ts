import { ref } from 'vue'
import { Game } from '@uno/shared/model/uno'
import { standardRandomizer, standardShuffler } from '@uno/shared/utils/random_utils'
import type { Card, Color } from '@uno/shared/model/deck'
import { Round } from '@uno/shared/model/round'

type Opts = {
  players: string[]
  targetScore?: number
  cardsPerPlayer?: number
}

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

export function useUnoGame(opts: Opts) {
  // model, reactive box so vue tracks the reference and our getters read 'fresh' state with game.value
  const game = ref(
    new Game(
      opts.players,
      opts.targetScore ?? 500,
      standardRandomizer,
      standardShuffler,
      opts.cardsPerPlayer ?? 7,
    ),
  )
  function attachRoundListener(r: Round) {
    r.onEnd(({ winner }) => {
      setMessage('Round over', `${opts.players[winner]} wins the round!`)
    })
  }
  attachRoundListener(game.value.currentRound()!)
  const origStartNewRound = (game.value as any).startNewRound.bind(game.value)
  ;(game.value as any).startNewRound = () => {
    origStartNewRound()
    attachRoundListener(game.value.currentRound()!)
  }

  // read
  function round() {
    return game.value.currentRound()
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
    return game.value.winner()
  }
  function isGameOver(): boolean {
    return gameWinner() !== undefined
  }
  function scoreOf(ix: number): number {
    return game.value.score(ix)
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

  // write
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

  // bots are all players except the last one me since router builds players this way: [...bots, me]
  function isBot(ix: number) {
    return ix >= 0 && ix < opts.players.length - 1
  }

  // color choice for wilds: pick the most common in hand with fallback to red
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

  // try to accuse anybody
  function botTryAccuse(ix: number) {
    for (let t = 0; t < opts.players.length; t++) {
      if (t === ix) continue
      try {
        accuse(ix, t)
      } catch {
        // ignore
      }
    }
  }

  // Returns true if it actually played/drew
  async function botTakeTurn(): Promise<boolean> {
    const r = round()
    if (!r) return false

    const ix = r.playerInTurn()
    if (ix === undefined || !isBot(ix)) return false

    // slight delay to feel alive
    await new Promise((res) => setTimeout(res, 850))

    // opportunistic accusation before acting
    botTryAccuse(ix)

    // pick first legal card, else draw
    const hand = handOf(ix)
    let played = false
    for (let i = 0; i < hand.length; i++) {
      if (r.canPlay(i)) {
        const card = hand[i]
        if (card.type === 'WILD' || card.type === 'WILD_DRAW') {
          setMessage(
            'Bot plays',
            `Bot ${opts.players[ix]} plays ${card.type} and chooses ${chooseWildColor(ix)}`,
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

    // say UNO if on 1 card forget 4/10
    if (handCountOf(ix) === 1) {
      if (Math.random() > 0.4) {
        setMessage('Bot says UNO!', `Bot ${opts.players[ix]} says UNO!`)
        sayUno(ix)
      }
    }

    return true
  }

  return {
    // state
    game,
    // reads
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
    // writes
    playCard,
    draw,
    sayUno,
    accuse,
    // bot play
    botTakeTurn,
    // pop-up message
    showPopUpMessage,
    popUpMessage,
    popUpTitle,
    setMessage,
    clearMessage,
  }
}
