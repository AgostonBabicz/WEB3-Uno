import { Card, Color } from '../deck'

export interface PlayerHandInterface {
  add: (card: Card) => void
  getPlayerHand: () => Card[]
  playCard: (cardIx: number) => Card
  size: () => number
  hasColor: (color: string) => boolean
}
