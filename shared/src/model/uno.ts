import { Randomizer, Shuffler } from '../utils/random_utils'
import { Card, Color, Deck } from './deck'
import { GameInterface } from './interfaces/game_interface'
import { Round } from './round'

export class Game implements GameInterface {
  public playerCount: Readonly<number>
  public targetScore: Readonly<number>
  private players: string[]
  private scores: number[] = []
  private presentRound: Round | undefined
  private randomizer: Randomizer
  private shuffler: Shuffler<Card>
  private cardsPerPlayer: number

  constructor(
    players: string[] = ['A', 'B'],
    targetScore: number = 500,
    randomizer: Randomizer,
    shuffler: Shuffler<Card>,
    cardsPerPlayer: number,
    options?: { deferFirstRound?: boolean }
  ) {
    if (targetScore <= 0) {
      throw new Error('A Game requires a target score of more than 0')
    }
    this.players = players
    this.playerCount = players.length
    this.targetScore = targetScore
    this.players.forEach(() => this.scores.push(0))
    this.randomizer = randomizer
    this.shuffler = shuffler
    this.cardsPerPlayer = cardsPerPlayer
    this.scores = new Array(players.length).fill(0)
    if (this.scores.some((s) => s < 0)) {
      throw new Error('Scores must be non-negative')
    }
    if (cardsPerPlayer <= 0) {
      throw new Error('A Game requires dealing at least 1 card per player')
    }
    if (players.length !== this.scores.length) {
      console.log(players.length, this.scores.length)
      throw new Error('Scores length must match players length')
    }
    if (this.scores.filter((s) => s >= targetScore).length > 1) {
      throw new Error('There can be at most one winner')
    }
    if (!options?.deferFirstRound) {
      if (players.length < 2) {
        throw new Error('A Game requires at least 2 players to start')
      }
      const dealer = this.randomizer(this.playerCount)
      this.presentRound = new Round(this.players, dealer, this.shuffler, this.cardsPerPlayer)
      this.attachRoundHandlers()
    }
  }
  public addPlayer(name: string): void {
    if (this.presentRound) {
      throw new Error('Cannot join: round already started')
    }
    if (!name || !name.trim()) throw new Error('Player name required')
    if (this.players.length >= 4) throw new Error('Max 4 players')
    this.players.push(name)
    this.scores.push(0)
    ;(this as any).playerCount = this.players.length
  }
  
  player(player: number): string {
    if (player < 0 || player >= this.playerCount) throw new Error('Player index is out of bounds')
    return this.players[player]
  }
  score(player: number): number {
    this.attachRoundHandlers()
    return this.scores[player]
  }
  winner(): number | undefined {
    this.attachRoundHandlers()
    const ix = this.scores.findIndex((s) => s >= this.targetScore)
    return ix === -1 ? undefined : ix
  }
  currentRound(): Round | undefined {
    this.attachRoundHandlers()
    return this.presentRound
  }
  toMemento(): GameMemento {
    const roundMemento = this.presentRound ? this.presentRound.toMemento() : undefined

    return {
      cardsPerPlayer: this.cardsPerPlayer,
      players: [...this.players],
      targetScore: this.targetScore,
      scores: [...this.scores],
      ...(roundMemento !== undefined
        ? { currentRound: roundMemento }
        : { currentRound: undefined as any }),
    } as GameMemento
  }

  private attachRoundHandlers(): void {
    if (!this.presentRound) return
    if (!this.presentRound.hasEnded()) return

    const winner = this.presentRound.winner()
    if (winner === undefined) return

    const pts = this.presentRound.score() ?? 0
    this.scores[winner] += pts

    if (this.scores[winner] >= this.targetScore) {
      this.presentRound = undefined
      return
    }

    this.startNewRound()
  }
  public canStart(): boolean {
    return this.players.length >= 2
  }
  public startNewRound() {
    if (!this.canStart()) throw new Error('Need at least 2 players to start a round')
    const dealer = this.randomizer(this.playerCount)
    this.presentRound = new Round(this.players, dealer, this.shuffler, this.cardsPerPlayer)
  }
}

export type GameMemento = {
  cardsPerPlayer: number
  players: string[]
  targetScore: number
  scores: number[]
  currentRound?: {
    players: string[]
    hands: Card[][]
    drawPile: Card[]
    discardPile: Card[]
    currentColor: Color
    currentDirection: string
    dealer: number
    playerInTurn: number
  }
}
