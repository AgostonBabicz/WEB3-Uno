import { GameRuntime, PublishFn, Round } from 'src/types/types'
import { syncHandCounts } from './syncHandCounts'
import { gameView } from './views'
import { mkDeck } from './makeDeck'
import { v4 as uuid } from 'uuid'

export function beginRound(rt: GameRuntime, startIndex: number, publish: PublishFn): void {
  rt.deck = mkDeck()
  rt.discard = []
  rt.hands = rt.g.players.map(() => [])
  rt.saidUno = rt.g.players.map(() => false)
  rt.direction = 'CW'

  // deal
  for (let i = 0; i < rt.g.cardsPerPlayer; i++) {
    for (let p = 0; p < rt.g.players.length; p++) {
      rt.hands[p].push(rt.deck.shift()!)
    }
  }

  // flip first card to discard
  const first = rt.deck.shift()!
  rt.discard.push(first)

  // set round
  const r: Round = {
    id: uuid(),
    playerInTurnIndex: startIndex % rt.g.players.length,
    discardTop: first,
    drawPileSize: rt.deck.length,
    currentColor:
      first.type === 'NUMBERED' ||
      first.type === 'SKIP' ||
      first.type === 'REVERSE' ||
      first.type === 'DRAW'
        ? first.color
        : null,
    direction: rt.direction,
    hasEnded: false,
  }
  rt.g.currentRound = r

  // sync and publish
  syncHandCounts(rt)
  publish({ __typename: 'GameStarted', gameId: rt.g.id, game: gameView(rt) })
  publish({ __typename: 'TurnChanged', gameId: rt.g.id, playerInTurnIndex: r.playerInTurnIndex! })
  publish({ __typename: 'GameUpdated', game: gameView(rt) })
}
