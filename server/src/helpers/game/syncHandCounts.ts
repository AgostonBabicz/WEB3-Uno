import { GameRuntime } from '../../types/types'

export function syncHandCounts(rt: GameRuntime) {
  rt.g.players.forEach((p, i) => {
    p.handCount = rt.hands[i].length
    p.saidUno = rt.saidUno[i]
  })
  if (rt.g.currentRound) {
    rt.g.currentRound.discardTop = rt.discard[rt.discard.length - 1] ?? null
    rt.g.currentRound.drawPileSize = rt.deck.length
    rt.g.currentRound.direction = rt.direction
  }
}
