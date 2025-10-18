import { Shuffler } from '../utils/random_utils'
import { DeckInterface } from './interfaces/deck_interface'

export type Type = 'NUMBERED' | 'SKIP' | 'REVERSE' | 'DRAW' | 'WILD' | 'WILD_DRAW'
export const colors = ['BLUE', 'RED', 'GREEN', 'YELLOW'] as const
export type Color = (typeof colors)[number]
export const cardNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const
export type CardNumber = (typeof cardNumbers)[number]

type NumberCard = { type: 'NUMBERED'; color: Color; number: CardNumber }
type SpecialCard = { type: 'SKIP' | 'REVERSE' | 'DRAW'; color: Color }
type WildCard = { type: 'WILD' | 'WILD_DRAW' }
export type ColoredCard = Readonly<NumberCard | SpecialCard>

type TypedCard<T extends Type> = T extends 'NUMBERED'
  ? NumberCard
  : T extends 'SKIP' | 'REVERSE' | 'DRAW'
    ? SpecialCard
    : T extends 'WILD' | 'WILD_DRAW'
      ? WildCard
      : never
export type Card = Readonly<TypedCard<Type>>

export function toCard(raw: Record<string, string | number>): Card {
  const t = raw.type
  if (t === 'NUMBERED') {
    const color = raw.color
    const number = raw.number
    if (typeof color !== 'string' || typeof number !== 'number') {
      throw new Error('NUMBERED card must have color and number')
    }
    if (!['BLUE', 'RED', 'GREEN', 'YELLOW'].includes(color)) {
      throw new Error('Invalid color')
    }
    if (!Number.isInteger(number) || number < 0 || number > 9) {
      throw new Error('Invalid number')
    }
    return {
      type: 'NUMBERED',
      color: color as Color,
      number: number as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
    } as const
  }

  if (t === 'SKIP' || t === 'REVERSE' || t === 'DRAW') {
    const color = raw.color
    if (typeof color !== 'string' || !['BLUE', 'RED', 'GREEN', 'YELLOW'].includes(color)) {
      throw new Error('SpecialCard must have a valid color')
    }
    return { type: t, color: color as Color } as const
  }

  if (t === 'WILD' || t === 'WILD_DRAW') {
    if (raw.color !== undefined || raw.number !== undefined) {
      throw new Error('Wild card must not have color/number')
    }
    return { type: t } as const
  }

  throw new Error('Unknown card type')
}

export function isColored(c: Card): c is ColoredCard {
  return c.type !== 'WILD' && c.type !== 'WILD_DRAW'
}

export class Deck implements DeckInterface {
  private deck: Card[]
  constructor(cards: Card[] | Record<string, string | number>[]) {
    this.deck = cards.map(toCard)
  }

  deal(): Card | undefined {
    const card = this.deck.shift()
    if (!card) {
      return undefined
    }
    return card
  }
  shuffle(shuffler: Shuffler<Card>): void {
    shuffler(this.deck)
  }
  filter(predicate: (card: Card) => boolean): Deck {
    const newDeck: Card[] = this.deck.filter(predicate)
    return new Deck(newDeck)
  }
  toMemento(): Array<Record<string, string | number>> {
    return this.deck.map((c) => ({ ...c }))
  }
  getDeck(): Card[] {
    return this.deck.slice()
  }
  get size(): number {
    return this.deck.length
  }
  top(): Card | undefined {
    return this.deck[0]
  }
  getDeckUnderTop(): Card[] {
    return this.deck.splice(1, this.deck.length - 1)
  }
}

export function hasColor(card: Card, color: string) {
  if (
    card.type === 'NUMBERED' ||
    card.type === 'SKIP' ||
    card.type === 'REVERSE' ||
    card.type === 'DRAW'
  ) {
    return card.color === color
  }
  return false
}

export function hasNumber(card: Card, number: number) {
  if (card.type === 'NUMBERED') {
    return card.number === number
  }
  return false
}

export function createInitialDeck(): Deck {
  const deck: Card[] = []

  for (const n of cardNumbers.slice(1)) {
    for (const color of colors) {
      deck.push({ type: 'NUMBERED', color, number: n })
      deck.push({ type: 'NUMBERED', color, number: n })
    }
  }

  for (const color of ['BLUE', 'RED', 'GREEN', 'YELLOW'] as const) {
    for (let j = 0; j < 2; j++) {
      deck.push({ type: 'SKIP', color })
      deck.push({ type: 'REVERSE', color })
      deck.push({ type: 'DRAW', color })
    }
  }

  for (let i = 0; i < 4; i++) {
    deck.push({ type: 'WILD' })
    deck.push({ type: 'WILD_DRAW' })
  }

  deck.push({ type: 'NUMBERED', color: 'BLUE', number: 0 })
  deck.push({ type: 'NUMBERED', color: 'RED', number: 0 })
  deck.push({ type: 'NUMBERED', color: 'GREEN', number: 0 })
  deck.push({ type: 'NUMBERED', color: 'YELLOW', number: 0 })

  return new Deck(deck)
}
