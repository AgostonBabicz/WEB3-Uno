import { Card } from '../../types/types'

export function pointsForCard(card: Card): number {
  switch (card.type) {
    case 'NUMBERED': {
      const num = Number(String(card.number).slice(1))
      return isFinite(num) ? num : 0
    }
    case 'SKIP':
    case 'REVERSE':
    case 'DRAW':
      return 20
    case 'WILD':
    case 'WILD_DRAW':
      return 50
    default:
      return 0
  }
}
