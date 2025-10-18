import { Card, Deck, Color } from '../deck'

export interface RoundInterface {
  player: (num: number) => string
  playerHand: (num: number) => Card[]
  discardPile: () => Deck
  drawPile: () => Deck
  playerInTurn: () => number | undefined
  play: (cardIx: number, askedColor?: Color) => Card
  canPlay: (cardIx: number) => boolean
  canPlayAny: () => boolean
  draw: () => void
  catchUnoFailure: ({ accuser, accused }: { accuser: number; accused: number }) => boolean
  hasEnded: () => boolean
  winner: () => number | undefined
  score: () => number | undefined
  toMemento: () => any
  sayUno: (player: number) => void
}
