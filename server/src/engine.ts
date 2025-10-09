import { v4 as uuid } from 'uuid'
import { GameEvent, Color, Card, Game, Round, Player, GameRuntime } from './types/types'
import { advanceTurn } from './helpers/advanceTurn'
import { canPlay } from './helpers/canPlay'
import { maybeGameWinner } from './helpers/maybeGameWinner'
import { refeed } from './helpers/refeed'
import { syncHandCounts } from './helpers/syncHandCounts'
import { playerView, gameView } from './helpers/views'
import { assertTurn } from './helpers/assertTurn'

type PublishFn = (ev: GameEvent) => void

const COLORS: Color[] = ['RED', 'YELLOW', 'GREEN', 'BLUE']
const NUMBERS: Array<{ num: number; asEnum: any }> = [
  { num: 0, asEnum: 'N0' },
  { num: 1, asEnum: 'N1' },
  { num: 2, asEnum: 'N2' },
  { num: 3, asEnum: 'N3' },
  { num: 4, asEnum: 'N4' },
  { num: 5, asEnum: 'N5' },
  { num: 6, asEnum: 'N6' },
  { num: 7, asEnum: 'N7' },
  { num: 8, asEnum: 'N8' },
  { num: 9, asEnum: 'N9' },
]

function mkDeck(): Card[] {
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

const GAMES = new Map<string, GameRuntime>()

export function createGame(
  players: string[],
  targetScore: number,
  cardsPerPlayer: number,
  publish: PublishFn,
): Game {
  if (players.length < 1) throw new Error('Need at least 1 player to create a lobby')
  if (players.length > 4) throw new Error('Max 4 players')

  const id = uuid()
  const now = new Date().toISOString()

  const runtime: GameRuntime = {
    g: {
      id,
      createdAt: now,
      targetScore,
      cardsPerPlayer,
      players: players.map((name) => ({
        id: uuid(),
        name,
        handCount: 0,
        score: 0,
        saidUno: false,
      })),
      currentRound: null,
      winnerIndex: null,
    },
    deck: [],
    discard: [],
    hands: players.map(() => []),
    saidUno: players.map(() => false),
    direction: 'CW',
  }

  GAMES.set(id, runtime)

  runtime.g.players.forEach((_, i) =>
    publish({
      __typename: 'PlayerJoined',
      gameId: id,
      playerIndex: i,
      player: playerView(runtime, i),
    }),
  )
  publish({ __typename: 'GameUpdated', game: gameView(runtime) })
  return gameView(runtime)
}

export function addPlayer(gameId: string, name: string, publish: PublishFn): Game {
  const rt = must(gameId)
  if (rt.g.currentRound) throw new Error('Cannot join: round already started')
  if (rt.g.players.length >= 4) throw new Error('Lobby full')

  const newIx = rt.g.players.length
  rt.g.players.push({
    id: uuid(),
    name,
    handCount: 0,
    score: 0,
    saidUno: false,
  })
  rt.hands.push([])
  rt.saidUno.push(false)

  syncHandCounts(rt)
  publish({
    __typename: 'PlayerJoined',
    gameId: rt.g.id,
    playerIndex: newIx,
    player: playerView(rt, newIx),
  })
  publish({ __typename: 'GameUpdated', game: gameView(rt) })
  return gameView(rt)
}

export function startRound(gameId: string, publish: PublishFn): Game {
  const rt = must(gameId)
  if (rt.g.players.length < 2) throw new Error('Need at least 2 players to start')

  rt.deck = mkDeck()
  rt.discard = []
  rt.hands = rt.g.players.map(() => [])
  rt.saidUno = rt.g.players.map(() => false)
  rt.direction = 'CW'

  for (let i = 0; i < rt.g.cardsPerPlayer; i++) {
    for (let p = 0; p < rt.g.players.length; p++) {
      rt.hands[p].push(rt.deck.shift()!)
    }
  }
  const first = rt.deck.shift()!
  rt.discard.push(first)

  const round: Round = {
    id: uuid(),
    playerInTurnIndex: 0,
    discardTop: first,
    drawPileSize: rt.deck.length,
    currentColor:
      first.type === 'NUMBERED' ||
      first.type === 'SKIP' ||
      first.type === 'REVERSE' ||
      first.type === 'DRAW'
        ? first.color
        : null,
    direction: rt.direction,
    hasEnded: false,
  }

  rt.g.currentRound = round
  syncHandCounts(rt)

  publish({ __typename: 'GameStarted', gameId: rt.g.id, game: gameView(rt) })
  publish({ __typename: 'TurnChanged', gameId: rt.g.id, playerInTurnIndex: 0 })
  publish({ __typename: 'GameUpdated', game: gameView(rt) })
  return gameView(rt)
}

export function waitingGames(): Game[] {
  return Array.from(GAMES.values())
    .filter((rt) => !rt.g.currentRound && rt.g.players.length < 4)
    .map((rt) => gameView(rt))
}

export function getGame(gameId: string): Game {
  const rt = GAMES.get(gameId)
  if (!rt) throw new Error('Game not found')
  return gameView(rt)
}

export function resetGame(gameId: string, publish: PublishFn): Game {
  const rt = must(gameId)
  const players = rt.g.players.map((p) => p.name)
  const target = rt.g.targetScore
  const cpp = rt.g.cardsPerPlayer
  GAMES.delete(gameId)
  const g = createGame(players, target, cpp, publish)
  return g
}

export function hand(gameId: string, playerIndex: number): Card[] {
  const rt = must(gameId)
  return rt.hands[playerIndex] ?? []
}

export function playableIndexes(gameId: string, playerIndex: number): number[] {
  const rt = must(gameId)
  if (!rt.g.currentRound) return []
  if (rt.g.currentRound.playerInTurnIndex !== playerIndex) return []
  const top = rt.discard[rt.discard.length - 1]
  const curColor = rt.g.currentRound.currentColor
  return rt.hands[playerIndex]
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => canPlay(c, top, curColor))
    .map((x) => x.i)
}

export function drawCard(gameId: string, playerIndex: number, publish: PublishFn): Game {
  const rt = must(gameId)
  assertTurn(rt, playerIndex)
  if (rt.deck.length === 0) refeed(rt)
  const card = rt.deck.shift()
  if (!card) throw new Error('Deck empty')
  rt.hands[playerIndex].push(card)
  syncHandCounts(rt)
  publish({ __typename: 'CardDrawn', gameId: rt.g.id, playerIndex, drew: 1 })
  advanceTurn(rt, publish)
  publish({ __typename: 'GameUpdated', game: gameView(rt) })
  return gameView(rt)
}

export function playCard(
  gameId: string,
  playerIndex: number,
  cardIndex: number,
  askedColor: Color | null | undefined,
  publish: PublishFn,
): Game {
  const rt = must(gameId)
  assertTurn(rt, playerIndex)
  const hand = rt.hands[playerIndex]
  const card = hand[cardIndex]
  if (!card) throw new Error('Invalid cardIndex')

  const top = rt.discard[rt.discard.length - 1]
  const curColor = rt.g.currentRound?.currentColor ?? null
  if (!canPlay(card, top, curColor)) {
    throw new Error('Card not playable')
  }

  // remove from hand
  hand.splice(cardIndex, 1)
  rt.discard.push(card)

  // color handling
  if (card.type === 'WILD' || card.type === 'WILD_DRAW') {
    if (!askedColor) throw new Error('askedColor required for wild')
    rt.g.currentRound!.currentColor = askedColor
  } else if ('color' in card) {
    rt.g.currentRound!.currentColor = card.color
  }

  // TODO: apply SKIP, REVERSE, DRAW and WILD_DRAW effects properly
  // For now only normal advance
  syncHandCounts(rt)
  publish({
    __typename: 'CardPlayed',
    gameId: rt.g.id,
    playerIndex,
    card,
    askedColor: askedColor ?? null,
  })

  // check UNO end
  if (rt.hands[playerIndex].length === 0) {
    rt.g.currentRound!.hasEnded = true
    const winnerIndex = playerIndex
    rt.g.winnerIndex = maybeGameWinner(rt, winnerIndex)
    const pointsAwarded = 0 // TODO: compute points by remaining cards
    const scores = rt.g.players.map((p) => p.score)
    publish({ __typename: 'RoundEnded', gameId: rt.g.id, winnerIndex, pointsAwarded, scores })
    if (rt.g.winnerIndex !== null) {
      publish({ __typename: 'GameEnded', gameId: rt.g.id, winnerIndex: rt.g.winnerIndex, scores })
    }
  } else {
    advanceTurn(rt, publish)
  }

  publish({ __typename: 'GameUpdated', game: gameView(rt) })
  return gameView(rt)
}

export function sayUno(gameId: string, playerIndex: number, publish: PublishFn): Game {
  const rt = must(gameId)
  rt.saidUno[playerIndex] = true
  rt.g.players[playerIndex].saidUno = true
  publish({ __typename: 'UnoSaid', gameId: rt.g.id, playerIndex })
  publish({ __typename: 'GameUpdated', game: gameView(rt) })
  return gameView(rt)
}

export function accuseUno(
  gameId: string,
  accuserIndex: number,
  accusedIndex: number,
  publish: PublishFn,
): Game {
  const rt = must(gameId)
  const success = rt.hands[accusedIndex].length === 1 && !rt.saidUno[accusedIndex]
  if (success) {
    // penalty draw 2
    for (let i = 0; i < 2; i++) {
      if (rt.deck.length === 0) refeed(rt)
      const c = rt.deck.shift()
      if (c) rt.hands[accusedIndex].push(c)
    }
    syncHandCounts(rt)
  }
  publish({
    __typename: 'UnoAccusationResult',
    gameId: rt.g.id,
    accuserIndex,
    accusedIndex,
    success,
  })
  publish({ __typename: 'GameUpdated', game: gameView(rt) })
  return gameView(rt)
}

function must(gameId: string): GameRuntime {
  const rt = GAMES.get(gameId)
  if (!rt) throw new Error('Game not found')
  return rt
}
