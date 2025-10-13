import { GameRuntime } from '../../types/types'

export function maybeGameWinner(rt: GameRuntime, roundWinner: number): number | null {
  const target = rt.g.targetScore ?? 500
  const score = rt.g.players[roundWinner].score
  return score >= target ? roundWinner : null
}
