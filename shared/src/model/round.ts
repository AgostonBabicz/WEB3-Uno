import { mod } from '../utils/mod'
import { Shuffler } from '../utils/random_utils'
import { Card, Deck, createInitialDeck, Color, isColored } from './deck'
import { RoundInterface } from './interfaces/round_interface'
import { PlayerHand } from './player_hand'

export class Round implements RoundInterface {
  playerCount: number
  private players: string[]
  private currentPlayerIndex: number
  private discardDeck: Deck
  private drawDeck: Deck
  private playerHands: PlayerHand[]
  dealer: number
  shuffler: Shuffler<Card> | undefined
  cardsPerPlay: number | undefined
  private startResolved: boolean = false
  private currentDirection = 'clockwise'
  private direction: number
  private currentColor = ''
  private resolving: boolean = false

  private lastActor: number | null = null
  private lastUnoSayer: number | null = null //most recen uno sayer (anyone)
  private pendingUnoAccused: number | null = null //who just went to 1 card
  private unoProtectedForWindow = false
  private unoSayersSinceLastAction = new Set<number>()

  private endCallbacks: Array<(e: { winner: number }) => void> = []

  private ensureUnoState(): void {
    if (this.pendingUnoAccused === undefined) this.pendingUnoAccused = null
    if (this.unoProtectedForWindow === undefined) this.unoProtectedForWindow = false
    if (this.lastUnoSayer === undefined) this.lastUnoSayer = null
    if (this.lastActor === undefined) this.lastActor = null
    if (this.unoSayersSinceLastAction === undefined) {
      this.unoSayersSinceLastAction = new Set<number>()
    }
  }

  isWild = (t: Card['type']) => t === 'WILD' || t === 'WILD_DRAW'
  isWildTop = () =>
    this.isWild(this.discardDeck.top()!.type) || this.isWild(this.drawDeck.top()!.type)

  dealAll = () => {
    this.playerHands = Array.from({ length: this.playerCount }, () => new PlayerHand())
    const n = this.cardsPerPlay ?? 7
    for (let p = 0; p < this.playerCount; p++) {
      for (let j = 0; j < n; j++) {
        const card = this.drawDeck.deal()
        if (!card) throw new Error('Not enough cards')
        this.playerHands[p].add(card)
      }
    }
  }

  constructor(players: string[], dealer: number, shuffler: Shuffler<Card>, cardsPerPlay: number) {
    if (players.length < 2) throw new Error('A Round requires at least 2 players')
    if (players.length > 10) throw new Error('A Round allows at most 10 players')

    this.players = players
    this.playerCount = players.length
    this.direction = this.currentDirection == 'clockwise' ? 1 : -1
    this.dealer = dealer
    this.currentPlayerIndex = dealer
    this.cardsPerPlay = cardsPerPlay
    this.discardDeck = new Deck([])
    this.playerHands = []
    this.shuffler = shuffler

    this.drawDeck = createInitialDeck()
    this.drawDeck.shuffle(this.shuffler)
    this.dealAll()

    while (true) {
      const top = this.drawDeck.deal()
      if (!top) throw new Error('Not enough cards')
      this.discardDeck = new Deck([top])

      //discardDeck.top is literally top that was just dealt
      if (this.isWild(top.type)) {
        this.drawDeck = new Deck([top, ...this.drawDeck.getDeck()])
        this.drawDeck.shuffle(this.shuffler)
        continue
      }
      break
    }

    const startTop = this.discardDeck.top()!
    if (isColored(startTop)) {
      this.currentColor = startTop.color
    }

    this.playerInTurn()
  }

  player(ix: number): string {
    if (ix < 0 || ix >= this.playerCount) {
      throw new Error('The player index is out of bounds')
    }
    return this.players[ix]
  }
  playerHand(num: number): Card[] {
    return this.playerHands[num].getPlayerHand()
  }
  discardPile(): Deck {
    return this.discardDeck
  }
  drawPile(): Deck {
    return this.drawDeck
  }
  playerInTurn(): number | undefined {
    if (!this.startResolved) {
      const top = this.discardDeck.top()!
      if (isColored(top)) {
        this.currentColor = top.color
      }
      if (top?.type === 'DRAW') {
        this.currentPlayerIndex = mod(this.dealer + this.direction, this.playerCount)
        this.drawTo(this.currentPlayerIndex, 2)
        this.currentPlayerIndex = mod(this.currentPlayerIndex + this.direction, this.playerCount)
      } else if (top?.type === 'SKIP') {
        this.currentPlayerIndex = mod(this.dealer + this.direction * 2, this.playerCount)
      } else if (top?.type === 'REVERSE') {
        this.direction = -1
        this.currentPlayerIndex = mod(this.dealer + this.direction, this.playerCount)
      } else {
        this.currentPlayerIndex = mod(this.dealer + this.direction, this.playerCount)
      }

      this.startResolved = true
      return this.currentPlayerIndex
    }
    if (this.winner() !== undefined) {
      return undefined
    }
    return this.currentPlayerIndex
  }
  canPlayAny(): boolean {
    if (this.winner() !== undefined) {
      return false
    }
    return (
      this.playerHand(this.currentPlayerIndex).filter((card, index) => this.canPlay(index)).length >
      0
    )
  }

  canPlay(cardIx: number): boolean {
    if (this.winner() !== undefined) {
      return false
    }
    const hand = this.playerHands[this.currentPlayerIndex]
    const size = hand.size()
    if (cardIx < 0 || cardIx >= size) return false

    const top = this.discardDeck.top()!
    const played = this.playerHand(this.currentPlayerIndex)[cardIx]
    const effectiveColor = this.currentColor

    if (isColored(played)) {
      switch (top.type) {
        case 'NUMBERED':
          if (played.type === 'NUMBERED') {
            return (
              played.color === effectiveColor ||
              played.number === (isColored(top) ? top.number : -1)
            )
          }
          return played.color === effectiveColor

        case 'SKIP':
          return played.color === effectiveColor || played.type === 'SKIP'

        case 'DRAW':
          return played.color === effectiveColor || played.type === 'DRAW'

        case 'REVERSE':
          return played.color === effectiveColor || played.type === 'REVERSE'

        case 'WILD':
        case 'WILD_DRAW':
          return played.color === effectiveColor
      }
    } else {
      if (played.type === 'WILD') {
        return true
      }
      if (played.type === 'WILD_DRAW') {
        if (effectiveColor) {
          return !hand.hasColor(effectiveColor)
        }
        return true
      }
    }
    return false
  }
  play(cardIx: number, askedColor?: Color): Card {
    this.ensureUnoState()

    // close old accusation window if diff player starts doing stuff
    if (this.pendingUnoAccused !== null && this.currentPlayerIndex !== this.pendingUnoAccused) {
      this.pendingUnoAccused = null
      this.unoProtectedForWindow = false
    }

    //other uno wont carry
    if (this.lastUnoSayer !== null && this.lastUnoSayer !== this.currentPlayerIndex) {
      this.lastUnoSayer = null
    }

    if (this.winner() !== undefined) {
      throw 'Cannot play after having a winner'
    }
    this.resolving = true
    const p = this.currentPlayerIndex
    const hand = this.playerHand(p)

    if (hand.length === 0) {
      throw new Error('Illegal play index')
    }
    if (cardIx < 0 || cardIx >= hand.length) {
      cardIx = hand.length - 1
    }

    const playedCard: Card = hand[cardIx]
    const isWildCard: boolean = playedCard.type == 'WILD' || playedCard.type == 'WILD_DRAW'

    if (askedColor && !isWildCard) {
      throw new Error('Illegal play: Cannot ask for color on a colored card')
    }
    if (!askedColor && isWildCard) {
      throw new Error('Illegal play: Cannot not ask for color on a wild card')
    }
    try {
      const canPlay: boolean = this.canPlay(cardIx)
      if (!canPlay) {
        throw new Error('Illegal play: ' + `\n${playedCard}\n${this.discardDeck.top()}`)
      }

      // open for accusation when player goes from 2 to 1 card
      if (hand.length === 2) {
        this.pendingUnoAccused = p
        //protect if he said uno already
        this.unoProtectedForWindow = this.unoSayersSinceLastAction.has(p)
        // dont let this uno saying leak into later turns
        this.lastUnoSayer = null
      }

      this.playerHands[p].playCard(cardIx)
      this.discardDeck = new Deck([playedCard, ...this.discardDeck.getDeck()])
      if (isColored(playedCard)) {
        this.currentColor = playedCard.color
      } else {
        this.currentColor = askedColor ?? ''
      }
      switch (this.discardDeck.top()?.type) {
        case 'NUMBERED':
          this.currentPlayerIndex = mod(this.currentPlayerIndex + this.direction, this.playerCount)
          break
        case 'DRAW':
          const drawTarget = mod(this.currentPlayerIndex + this.direction, this.playerCount)
          this.drawTo(drawTarget, 2)
          this.currentPlayerIndex = mod(drawTarget + this.direction, this.playerCount)
          break
        case 'SKIP':
          this.currentPlayerIndex = mod(
            this.currentPlayerIndex + this.direction * 2,
            this.playerCount,
          )
          break
        case 'REVERSE':
          this.direction = -this.direction
          this.currentPlayerIndex = mod(this.currentPlayerIndex + this.direction, this.playerCount)
          break
        case 'WILD':
          this.currentPlayerIndex = mod(this.currentPlayerIndex + this.direction, this.playerCount)
          break
        case 'WILD_DRAW':
          const wildTarget = mod(this.currentPlayerIndex + this.direction, this.playerCount)
          this.drawTo(wildTarget, 4)
          this.currentPlayerIndex = mod(wildTarget + this.direction, this.playerCount)
          break
      }
      this.lastActor = p
      const w = this.winner()
      if (w !== undefined) {
        for (const cb of this.endCallbacks) cb({ winner: w })
      }

      return playedCard
    } catch (e: unknown) {
      if (e instanceof Error) {
        throw new Error(e.message)
      } else {
        throw e
      }
    } finally {
      this.resolving = false
      this.unoSayersSinceLastAction.clear()
    }
  }

  private drawTo(p: number, n = 1): void {
    if (this.winner() !== undefined && !this.resolving) {
      throw new Error('Cannot draw after having a winner')
    }
    for (let i = 0; i < n; i++) {
      let c = this.drawDeck.deal()
      if (!c) {
        const top = this.discardDeck.top()
        const underTop = this.discardDeck.getDeckUnderTop()
        if (!underTop || underTop.length === 0) throw new Error('No cards left to draw')
        this.discardDeck = new Deck(top ? [top] : [])
        this.drawDeck = new Deck(underTop)
        this.drawDeck.shuffle(this.shuffler!)
        c = this.drawDeck.deal()
        if (!c) throw new Error('No cards left to draw')
      }
      this.playerHands[p].add(c)
    }
  }
  draw(): void {
    this.ensureUnoState()
    if (this.pendingUnoAccused !== null && this.currentPlayerIndex !== this.pendingUnoAccused) {
      this.pendingUnoAccused = null
      this.unoProtectedForWindow = false
    }
    if (this.lastUnoSayer !== null && this.lastUnoSayer !== this.currentPlayerIndex) {
      this.lastUnoSayer = null
    }

    if (this.winner() !== undefined) {
      throw 'Cannot draw after having a winner'
    }

    const p = this.currentPlayerIndex
    const drawn = this.drawDeck.deal()
    if (!drawn) throw new Error('No cards left to draw')

    this.playerHands[p].add(drawn)
    this.lastActor = p

    if (!this.canPlay(this.playerHands[p].size() - 1)) {
      this.currentPlayerIndex = mod(this.currentPlayerIndex + this.direction, this.playerCount)
    }

    this.unoSayersSinceLastAction.clear()
  }

  catchUnoFailure({ accuser, accused }: { accuser: number; accused: number }): boolean {
    if (accused < 0) {
      throw new Error('Accused cannot be negative')
    }
    if (accused >= this.playerCount) {
      throw new Error('Accused cannot be beyond the player count')
    }

    // must be accusing the player who just went to 1 card and while the window is open
    if (this.pendingUnoAccused === null || accused !== this.pendingUnoAccused) return false

    // if protected by timing of UNO saying accusation fails
    if (this.unoProtectedForWindow) return false

    // accused must have one card to be able to be accused
    if (this.playerHands[accused].size() !== 1) return false

    // accusation valid = draw 4
    this.drawTo(accused, 4)
    this.pendingUnoAccused = null
    this.unoProtectedForWindow = false
    return true
  }

  hasEnded(): boolean {
    return this.playerHands.some((hand) => hand.size() == 0)
  }

  winner(): number | undefined {
    for (let i = 0; i < this.playerHands.length; i++) {
      const hand: PlayerHand = this.playerHands[i]
      if (hand.size() == 0) {
        return i
      }
    }
    return undefined
  }
  score(): number | undefined {
    const w = this.winner()
    if (w === undefined) {
      return undefined
    }
    let sum = 0
    for (let i = 0; i < this.playerHands.length; i++) {
      if (i === w) continue
      const hand: PlayerHand = this.playerHands[i]
      for (const card of hand.getPlayerHand()) {
        switch (card.type) {
          case 'NUMBERED':
            sum += card.number
            break
          case 'SKIP':
            sum += 20
            break
          case 'REVERSE':
            sum += 20
            break
          case 'DRAW':
            sum += 20
            break
          case 'WILD':
            sum += 50
            break
          case 'WILD_DRAW':
            sum += 50
            break
        }
      }
    }
    return sum
  }
  sayUno(player: number): void {
    this.ensureUnoState()
    if (player < 0 || player >= this.playerCount) throw new Error('Invalid player index')
    if (this.winner() !== undefined) throw new Error('Cannot say UNO after the game ended')

    // remember who just said UNO and if its the same player that just went to 1 card
    // (window open) this protects them against accusation for this window
    this.lastUnoSayer = player
    this.unoSayersSinceLastAction.add(player)

    if (this.pendingUnoAccused === player) {
      this.unoProtectedForWindow = true
    }
  }

  onEnd(cb: (e: { winner: number }) => void): void {
    this.endCallbacks.push(cb)
  }

  toMemento(): any {
    return {
      players: this.players,
      hands: this.playerHands.map((h) => h.getPlayerHand()),
      drawPile: this.drawDeck.getDeck(),
      discardPile: this.discardDeck.getDeck(),
      currentColor: this.currentColor,
      currentDirection: this.currentDirection,
      dealer: this.dealer,
      playerInTurn: this.playerInTurn(),
    }
  }

  get discardTop(): Card | undefined { return this.discardDeck.top() }
  get drawPileSize(): number { return this.drawDeck.size }
}
