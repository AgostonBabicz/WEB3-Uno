import { GameRuntime } from '../../types/types'
import { pointsForCard } from './pointsForCard'

export function computePointsFromHands(rt: GameRuntime, winnerIndex: number): { total: number; perPlayer: number[] } {
  const n = rt.g.players.length
    const perPlayer = new Array<number>(n).fill(0)
    let pool = 0
    for (let i = 0; i < n; i++) {
      if (i === winnerIndex) continue
      const sum = (rt.hands[i] ?? []).reduce((acc, c) => acc + pointsForCard(c), 0)
      pool += sum
    }
    perPlayer[winnerIndex] = pool
    return { total: pool, perPlayer }
}
