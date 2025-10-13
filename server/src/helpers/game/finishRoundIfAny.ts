import { GameRuntime, PublishFn } from '../../types/types'
import { beginRound } from './beginRound'
import { computePointsFromHands } from './computePointsFromHands'
import { maybeGameWinner } from './maybeGameWinner'
import { persistRoundFinish, persistRoundStart } from './persistanceFunctions'
import { gameView } from './views'

export function finishRoundIfAny(
  rt: GameRuntime,
  winnerIndex: number,
  publish: PublishFn,
): boolean {
  const r = rt.g.currentRound
  if (!r) return false
  if (rt.hands[winnerIndex].length !== 0) return false

  r.hasEnded = true

  const { total: pointsAwarded } = computePointsFromHands(rt, winnerIndex)
  rt.g.players[winnerIndex].score += pointsAwarded

  rt.g.winnerIndex = maybeGameWinner(rt, winnerIndex)
  const scores = rt.g.players.map((p) => p.score)

  persistRoundFinish(rt, winnerIndex)


  publish({ __typename: 'RoundEnded', gameId: rt.g.id, winnerIndex, pointsAwarded, scores })


  if (rt.g.winnerIndex !== null) {
    publish({ __typename: 'GameEnded', gameId: rt.g.id, winnerIndex: rt.g.winnerIndex, scores })
    publish({ __typename: 'GameUpdated', game: gameView(rt) })
    return true
  }

  persistRoundStart(rt, (rt.g.currentRound ? 1 : 0) + 1)

  beginRound(rt, winnerIndex, publish)
  return true
}
