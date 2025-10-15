import { Card, cardNumbers, colors, Deck, toCard } from '../../src/model/deck'
import { PlayerHand } from '../../src/model/player_hand'
import { Round } from '../../src/model/round'
import { Game } from '../../src/model/uno'
import {
  Randomizer,
  Shuffler,
  standardRandomizer,
  standardShuffler,
} from '../../src/utils/random_utils'

//Fill out the empty functions
export function createInitialDeck(): Deck {
  const deck: Card[] = []

  for (const n of cardNumbers.slice(1)) {
    for (const color of colors) {
      deck.push({ type: 'NUMBERED', color, number: n })
      deck.push({ type: 'NUMBERED', color, number: n })
    }
  }

  for (const color of colors) {
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

export function createDeckFromMemento(cards: Record<string, string | number>[]): Deck {
  return new Deck(cards)
}

export type HandConfig = {
  players: string[]
  dealer: number
  shuffler?: Shuffler<Card>
  cardsPerPlayer?: number
}

export function createRound({
  players,
  dealer,
  shuffler = standardShuffler,
  cardsPerPlayer = 7,
}: HandConfig): Round {
  return new Round(players, dealer, shuffler, cardsPerPlayer)
}

export function createRoundFromMemento(
  memento: any,
  shuffler: Shuffler<Card> = standardShuffler,
): Round {
  // ===== validations =====
  if (!Array.isArray(memento.players) || memento.players.length < 2) {
    throw new Error('Invalid memento: need at least 2 players')
  }
  if (!Array.isArray(memento.hands) || memento.hands.length !== memento.players.length) {
    throw new Error('Invalid memento: hands must match players')
  }

  const winners = memento.hands.filter((h: any[]) => h.length === 0).length
  if (winners > 1) throw new Error('Invalid memento: more than one winner')

  if (!Array.isArray(memento.discardPile) || memento.discardPile.length === 0) {
    throw new Error('Invalid memento: empty discard pile')
  }

  const validColors = ['RED', 'YELLOW', 'GREEN', 'BLUE']
  if (memento.currentColor && !validColors.includes(memento.currentColor)) {
    throw new Error('Invalid memento: currentColor')
  }

  const top = toCard(memento.discardPile[0])
  function hasColor(card: any): card is { color: string } {
    return typeof card.color === 'string'
  }
  if (hasColor(top) && memento.currentColor && top.color !== memento.currentColor) {
    throw new Error('Invalid memento: inconsistent currentColor')
  }

  if (
    typeof memento.dealer !== 'number' ||
    memento.dealer < 0 ||
    memento.dealer >= memento.players.length
  ) {
    throw new Error('Invalid memento: dealer out of bounds')
  }

  const gameFinished = winners === 1
  if (!gameFinished) {
    if (typeof memento.playerInTurn !== 'number') {
      throw new Error('Invalid memento: missing playerInTurn')
    }
    if (memento.playerInTurn < 0 || memento.playerInTurn >= memento.players.length) {
      throw new Error('Invalid memento: playerInTurn out of bounds')
    }
  }

  // ===== hydrate Round =====
  const round = Object.create(Round.prototype) as Round
  ;(round as any).players = [...memento.players]
  round.playerCount = memento.players.length
  round.dealer = memento.dealer
  ;(round as any).currentPlayerIndex = memento.playerInTurn
  ;(round as any).direction = memento.currentDirection === 'counterclockwise' ? -1 : +1
  ;(round as any).currentDirection =
    memento.currentDirection === 'counterclockwise' ? 'counterclockwise' : 'clockwise'
  ;(round as any).currentColor = memento.currentColor ?? ''
  ;(round as any).discardDeck = new Deck((memento.discardPile || []).map(toCard))
  ;(round as any).drawDeck = new Deck((memento.drawPile || []).map(toCard))
  ;(round as any).playerHands = (memento.hands || []).map(
    (h: Array<Record<string, string | number>>) => new PlayerHand(h.map(toCard)),
  )
  ;(round as any).shuffler = shuffler
  ;(round as any).cardsPerPlay = undefined
  ;(round as any).startResolved = true
  ;(round as any).unoDeclared = new Set(memento.unoDeclared || [])
  const modFn = (n: number, m: number) => ((n % m) + m) % m
  const derivedPrev =
    typeof memento.playerInTurn === 'number'
      ? modFn(memento.playerInTurn - (round as any).direction, memento.players.length)
      : null
  ;(round as any).lastActor =
    typeof memento.lastActor === 'number' || memento.lastActor === null
      ? memento.lastActor
      : derivedPrev
  ;(round as any).lastUnoSayer =
    typeof memento.lastUnoSayer === 'number' || memento.lastUnoSayer === null
      ? memento.lastUnoSayer
      : null

  //memento tests bypass constructor we need to init this so its not undefined, [] is the default can be interactied with --> good👍
  ;(round as any).endCallbacks = []

  return round
}

export type GameConfig = {
  players: string[]
  targetScore: number
  randomizer: Randomizer
  shuffler: Shuffler<Card>
  cardsPerPlayer: number
}

export function createGame(props: Partial<GameConfig>): Game {
  return new Game(
    props.players,
    props.targetScore,
    props.randomizer ?? standardRandomizer,
    props.shuffler ?? standardShuffler,
    props.cardsPerPlayer ?? 7,
  )
}

export function createGameFromMemento(
  memento: any,
  randomizer: Randomizer = standardRandomizer,
  shuffler: Shuffler<Card> = standardShuffler,
): Game {
  if (!Array.isArray(memento.players) || memento.players.length < 2) {
    throw new Error('Invalid game memento: need at least 2 players')
  }
  if (!Array.isArray(memento.scores) || memento.scores.length !== memento.players.length) {
    throw new Error('Invalid game memento: scores must match players length')
  }
  if (typeof memento.targetScore !== 'number' || memento.targetScore <= 0) {
    throw new Error('Invalid game memento: targetScore must be > 0')
  }
  if (memento.scores.some((s: number) => s < 0)) {
    throw new Error('Invalid game memento: scores must be non-negative')
  }
  const winners = memento.scores.filter((s: number) => s >= memento.targetScore).length
  if (winners > 1) {
    throw new Error('Invalid game memento: more than one winner')
  }
  const finished = memento.scores.some((s: number) => s >= memento.targetScore)
  if (!finished && memento.currentRound === undefined) {
    throw new Error('Invalid game memento: missing currentRound')
  }
  if (finished && memento.currentRound !== undefined) {
    throw new Error('Invalid game memento: unexpected currentRound for finished game')
  }

  const game = Object.create(Game.prototype) as Game

  ;(game as any).players = [...memento.players]
  ;(game as any).playerCount = memento.players.length
  ;(game as any).targetScore = memento.targetScore
  ;(game as any).scores = [...memento.scores]
  ;(game as any).randomizer = randomizer ?? standardRandomizer
  ;(game as any).shuffler = shuffler ?? standardShuffler
  ;(game as any).cardsPerPlayer = memento.cardsPerPlayer ?? 7

  if (memento.currentRound) {
    ;(game as any).presentRound = createRoundFromMemento(
      memento.currentRound,
      shuffler ?? standardShuffler,
    )
  } else {
    ;(game as any).presentRound = undefined
  }

  return game
}
