import { GameRuntime } from '../types/types'
import { pointsForCard } from './pointsForCard'

export function computePointsFromHands(rt: GameRuntime, winnerIndex: number): number {
  let total = 0
  for (let i = 0; i < rt.hands.length; i++) {
    if (i === winnerIndex) continue
    for (const c of rt.hands[i]) total += pointsForCard(c)
  }
  return total
}
