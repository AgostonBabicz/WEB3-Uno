import { ref } from 'vue'
import { Game } from '../model/uno'
import { standardRandomizer, standardShuffler } from '../utils/random_utils'
import type { Card, Color } from '../model/deck'

type Opts = {
  players: string[]           
  targetScore?: number
  cardsPerPlayer?: number
}

export function useUnoGame(opts: Opts) {
  // model, reactive box ? so vue tracks the reference and our getters read 'fresh' state with game.value
  const game = ref(
    new Game(
      opts.players,
      opts.targetScore ?? 500,
      standardRandomizer,
      standardShuffler,
      opts.cardsPerPlayer ?? 7,
    ),
  )

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

  // ----------- bot stuff --------
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
      if (counts[k] > bestN) { best = k; bestN = counts[k] }
    }
    return best
  }

  // try to accuse anybody 
  function botTryAccuse(ix: number) {
    for (let t = 0; t < opts.players.length; t++) {
      if (t === ix) continue
      try { accuse(ix, t) } catch { /* ignore */ }
    }
  }
  //ptt bot:
  // One bot turn. Returns true if it actually played/drew (i.e., it was a bot’s turn).
  async function botTakeTurn(): Promise<boolean> {
    const r = round()
    if (!r) return false

    const ix = r.playerInTurn()
    if (ix === undefined || !isBot(ix)) return false

    // slight delay to feel alive
    await new Promise(res => setTimeout(res, 450))

    // opportunistic accusation before acting, proably bot should watch this outside of its turn too? 
    botTryAccuse(ix)

    // pick first legal card, else draw
    const hand = handOf(ix)
    let played = false
    for (let i = 0; i < hand.length; i++) {
      if (r.canPlay(i)) {
        const card = hand[i]
        if (card.type === 'WILD' || card.type === 'WILD DRAW') {
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
      if (Math.random() > 0.40) {
        sayUno(ix)
      }
    }

    return true
  }

  return {
    // state
    game,
    // reads
    round, playerInTurn, hasEnded, topDiscard, drawPileSize, handOf, handCountOf, canPlayAt,
    // writes
    playCard, draw, sayUno, accuse,
    // bot play
    botTakeTurn,
  }
}
