import { GameRuntime, GameEvent } from '../../types/types'

export function advanceTurn(rt: GameRuntime, publish: (e: GameEvent) => void) {
  if (!rt.g.currentRound || rt.g.currentRound.hasEnded) return
  const n = rt.g.players.length
  const cur = rt.g.currentRound.playerInTurnIndex ?? 0
  const next = rt.direction === 'CW' ? (cur + 1) % n : (cur - 1 + n) % n
  rt.g.currentRound.playerInTurnIndex = next
  publish({ __typename: 'TurnChanged', gameId: rt.g.id, playerInTurnIndex: next })
}
