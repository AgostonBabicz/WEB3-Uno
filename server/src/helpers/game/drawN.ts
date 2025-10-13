import { GameRuntime, PublishFn } from '../../types/types'
import { refeed } from './refeed'
import { syncHandCounts } from './syncHandCounts'

export function drawN(rt: GameRuntime, playerIndex: number, n: number, publish: PublishFn) {
  for (let i = 0; i < n; i++) {
    if (rt.deck.length === 0) refeed(rt)
    const c = rt.deck.shift()
    if (c) {
      rt.hands[playerIndex].push(c)
    } else {
      break
    }
  }
  rt.g.currentRound!.drawPileSize = rt.deck.length
  syncHandCounts(rt)
  publish({ __typename: 'CardDrawn', gameId: rt.g.id, playerIndex, drew: n })
}
