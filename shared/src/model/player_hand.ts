import { Card, Color, isColored } from './deck'
import { PlayerHandInterface } from './interfaces/player_hand_interface'

export class PlayerHand implements PlayerHandInterface {
  private playerHand: Card[]

  constructor(playerHand: Card[] = []) {
    this.playerHand = playerHand
  }
  add(card: Card): void {
    this.playerHand.push(card)
  }
  getPlayerHand(): Card[] {
    return this.playerHand
  }
  playCard(cardIx: number): Card {
    return this.playerHand.splice(cardIx, 1)[0]
  }
  size(): number {
    return this.playerHand.length
  }
  hasColor(color: string): boolean {
    return this.playerHand.some((c) => isColored(c) && c.color === color)
  }
}
