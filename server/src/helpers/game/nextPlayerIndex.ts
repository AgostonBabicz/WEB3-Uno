import { GameRuntime } from '../../types/types'

export function nextPlayerIndex(rt: GameRuntime, from: number): number {
  const n = rt.g.players.length
  if (n === 0) return 0
  const step = rt.direction === 'CW' ? 1 : -1
  return (from + step + n) % n
}
