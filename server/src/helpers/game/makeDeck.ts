import { COLORS } from '../../models/colors'
import { NUMBERS } from '../../models/numbers'
import { Card } from '../../types/types'

export function mkDeck(): Card[] {
  const deck: Card[] = []
  for (const c of COLORS) {
    deck.push({ type: 'NUMBERED', color: c, number: 'N0' })
    for (const { asEnum } of NUMBERS.slice(1)) {
      deck.push({ type: 'NUMBERED', color: c, number: asEnum })
      deck.push({ type: 'NUMBERED', color: c, number: asEnum })
    }
    deck.push({ type: 'SKIP', color: c })
    deck.push({ type: 'SKIP', color: c })
    deck.push({ type: 'REVERSE', color: c })
    deck.push({ type: 'REVERSE', color: c })
    deck.push({ type: 'DRAW', color: c })
    deck.push({ type: 'DRAW', color: c })
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ type: 'WILD' })
    deck.push({ type: 'WILD_DRAW' })
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}
