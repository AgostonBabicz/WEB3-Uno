import { Shuffler } from '../../utils/random_utils'
import { Card, Deck } from '../deck'

export interface DeckInterface {
  deal: () => Card | undefined
  shuffle: (shuffler: Shuffler<Card>) => void
  filter: (predicate: (card: Card) => boolean) => Deck
  toMemento: () => Array<Record<string, string | number>>
  getDeck: () => Card[]
  readonly size: number
  top: () => Card | undefined
  getDeckUnderTop: () => Card[]
}
