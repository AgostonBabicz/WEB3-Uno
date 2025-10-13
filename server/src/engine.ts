import { v4 as uuid } from 'uuid'
import { Color, Card, Game, GameRuntime, PublishFn } from './types/types'
import { advanceTurn } from './helpers/game/advanceTurn'
import { canPlay } from './helpers/game/canPlay'
import { refeed } from './helpers/game/refeed'
import { syncHandCounts } from './helpers/game/syncHandCounts'
import { playerView, gameView } from './helpers/game/views'
import { assertTurn } from './helpers/game/assertTurn'
import { beginRound } from './helpers/game/beginRound'
import { applyCardEffects } from './helpers/game/applyCardEffects'
import { finishRoundIfAny } from './helpers/game/finishRoundIfAny'

import { persistGameCreate, persistPlayerJoin, persistRoundStart } from './helpers/game/persistanceFunctions'
import { ensureAug } from './helpers/game/runtimeAug'


const GAMES = new Map<string, GameRuntime>()

export function createGame(
  players: string[],
  targetScore: number,
  cardsPerPlayer: number,
  publish: PublishFn,
  hostUserId?: string | null,  
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

  const aug = ensureAug(runtime)
  aug.userIds = [hostUserId ?? null] // host in seat 0
  aug._roundNo = 0
  aug._roundRowId = undefined

  GAMES.set(id, runtime)

  // persist game + host join 
  persistGameCreate(runtime, hostUserId ?? null)

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

export function addPlayer(
  gameId: string,
  name: string,
  publish: PublishFn,
  userId?: string | null,   
): Game {
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

  const aug = ensureAug(rt)
  aug.userIds[newIx] = userId ?? null

  if (userId) persistPlayerJoin(rt, userId, newIx)

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

  const aug = ensureAug(rt)
  aug._roundNo = (aug._roundNo ?? 0) + 1
  aug._roundRowId = undefined

  persistRoundStart(rt, aug._roundNo)

  beginRound(rt, 0, publish)


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
  const aug = ensureAug(rt)

  GAMES.delete(gameId)

  const hostUserId = aug.userIds[0] ?? null

  const g = createGame(players, target, cpp, publish, hostUserId)
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
  const r = rt.g.currentRound
  if (!r) throw new Error('Round not started')

  const hand = rt.hands[playerIndex]
  const card = hand[cardIndex]
  if (!card) throw new Error('Invalid cardIndex')

  const top = rt.discard[rt.discard.length - 1]
  const curColor = r.currentColor ?? null
  if (!canPlay(card, top, curColor)) throw new Error('Card not playable')

  hand.splice(cardIndex, 1)
  rt.discard.push(card)

  if (card.type === 'WILD' || card.type === 'WILD_DRAW') {
    if (!askedColor) throw new Error('askedColor required for wild')
    r.currentColor = askedColor
  } else if ('color' in card) {
    r.currentColor = (card as any).color as Color
  }

  r.discardTop = card
  r.drawPileSize = rt.deck.length
  r.direction = rt.direction
  syncHandCounts(rt)

  publish({
    __typename: 'CardPlayed',
    gameId: rt.g.id,
    playerIndex,
    card,
    askedColor: askedColor ?? null,
  })

  const advances = applyCardEffects(rt, r, playerIndex, card, askedColor, publish)

  if (finishRoundIfAny(rt, playerIndex, publish)) {
    return gameView(rt)
  }

  for (let i = 0; i < advances; i++) {
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
    for (let i = 0; i < 4; i++) {
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
