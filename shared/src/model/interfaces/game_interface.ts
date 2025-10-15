import { Round } from '../round'

export interface GameInterface {
  player: (player: number) => string
  score: (player: number) => number
  winner: () => number | undefined
  currentRound: () => Round | undefined
  toMemento: () => any
}
