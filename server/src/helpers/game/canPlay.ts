import { Card, Color } from '../../types/types'

export function canPlay(card: Card, top: Card | undefined, currentColor: Color | null): boolean {
  if (!top) return true
  if (card.type === 'WILD' || card.type === 'WILD_DRAW') return true
  if (top.type === 'WILD' || top.type === 'WILD_DRAW') {
    // match chosen color
    return 'color' in card && currentColor ? card.color === currentColor : false
  }
  // match color or number/type
  if ('color' in card && currentColor && card.color === currentColor) return true
  if (card.type === 'NUMBERED' && top.type === 'NUMBERED')
    return card.number === top.number || card.color === (top as any).color
  if (card.type !== 'NUMBERED' && top.type !== 'NUMBERED')
    return (
      card.type === top.type ||
      ('color' in top && 'color' in card && card.color === (top as any).color)
    )
  if ('color' in card && 'color' in top && card.color === (top as any).color) return true
  return false
}
