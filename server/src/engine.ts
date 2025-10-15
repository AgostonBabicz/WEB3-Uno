// engine.ts — server-side wrapper around the frontend model (single source of truth)

import { v4 as uuid } from 'uuid'

// Use the model’s types and classes, not some parallel DIY runtime.
import type { Color, Card } from '@uno/shared/model/deck'
import { Game } from '@uno/shared/model/uno'

// If you need the same random behavior as the client model utilities
import { standardRandomizer, standardShuffler } from '@uno/shared/utils/random_utils'

// Whatever your persistence hooks are; keep them thin.
import {
  persistGameCreate,
  persistPlayerJoin,
  persistRoundStart,
} from "./helpers/game/persistanceFunctions"

// This is your pub/sub function type (GraphQL subscriptions, WS bus, whatever).
export type PublishFn = (evt: any) => void

// In-memory registry. One Game instance per id.
const GAMES = new Map<string, Game>()

// If you want to refer back from instance to its id without polluting the model, use a WeakMap.
const GAME_IDS = new WeakMap<Game, string>()

// Public API the resolvers call
export async function createGame(
  players: string[],
  targetScore: number,
  cardsPerPlayer: number,
  publish: PublishFn,
  hostUserId?: string | null,
) {
  if (players.length < 1) throw new Error('Need at least 1 player to create a lobby')
  if (players.length > 4) throw new Error('Max 4 players')

  const id = uuid()
  const g = new Game(players, targetScore, standardRandomizer, standardShuffler, cardsPerPlayer)

  // Your model immediately starts a round in the constructor.
  // If you want “lobby then startRound,” blank it out until startRound is called.
  // This relies on private state, so yes, it’s a wart. It keeps the model as SSOT for rules.
  ;(g as any).presentRound = undefined

  GAMES.set(id, g)
  GAME_IDS.set(g, id)

  await persistGameCreate(id, g, hostUserId ?? null)

  // Let clients know the lobby exists
  publish({ __typename: 'GameUpdated', game: gameView(g, id) })
  return gameView(g, id)
}

export async function addPlayer(gameId: string, name: string, publish: PublishFn) {
  const g = must(gameId)
  // No mid-round joins
  if (g.currentRound()) throw new Error('Cannot join: round already started')

  // The model has players encapsulated. Rehydrate with +1 player.
  const snap = g.toMemento()
  const players = [...snap.players, name]
  const ng = new Game(players, snap.targetScore, standardRandomizer, standardShuffler, snap.cardsPerPlayer)
  ;(ng as any).presentRound = undefined // keep lobby state
  const id = gameId

  GAMES.set(id, ng)
  GAME_IDS.set(ng, id)

  // persistence hook (userId flow omitted here; add if you pass it in)
  await persistPlayerJoin(gameId, /* userId */ null, players.length - 1)
// pass the real userId if you have it in the resolver

  publish({
    __typename: 'PlayerJoined',
    gameId: id,
    playerIndex: players.length - 1,
    player: { name },
  })
  publish({ __typename: 'GameUpdated', game: gameView(ng, id) })
  return gameView(ng, id)
}

export async function startRound(gameId: string, publish: PublishFn) {
  const g = must(gameId)
  if (g.currentRound()) throw new Error('Round already started')
  // The model’s startNewRound is private in your code.
  // Make it public in the model, or call it anyway and let TS complain less than your users.
  ;(g as any).startNewRound()

  const id = gameId
  await persistRoundStart(gameId, 1)

  publish({ __typename: 'GameUpdated', game: gameView(g, id) })
  return gameView(g, id)
}

export function waitingGames() {
  return Array.from(GAMES.entries())
    .filter(([_, g]) => !g.currentRound() && playerCountOf(g) < 4)
    .map(([id, g]) => gameView(g, id))
}

export function getGame(gameId: string) {
  const g = must(gameId)
  return gameView(g, gameId)
}

export function resetGame(gameId: string, publish: PublishFn) {
  const g = must(gameId)
  const snap = g.toMemento()
  const id = gameId

  const ng = new Game(
    snap.players,
    snap.targetScore,
    standardRandomizer,
    standardShuffler,
    snap.cardsPerPlayer,
  )
  ;(ng as any).presentRound = undefined
  GAMES.set(id, ng)
  GAME_IDS.set(ng, id)

  publish({ __typename: 'GameUpdated', game: gameView(ng, id) })
  return gameView(ng, id)
}

export function hand(gameId: string, playerIndex: number): Card[] {
  const g = must(gameId)
  const r = g.currentRound()
  if (!r) return []
  return r.playerHand(playerIndex) ?? []
}

export function playableIndexes(gameId: string, playerIndex: number): number[] {
  const g = must(gameId)
  const r = g.currentRound()
  if (!r) return []
  // You only own your turn’s legality
  if (r.playerInTurn() !== playerIndex) return []
  const hand = r.playerHand(playerIndex) ?? []
  return hand.map((_, i) => (r.canPlay(i) ? i : -1)).filter((i) => i >= 0)
}

export function drawCard(gameId: string, playerIndex: number, publish: PublishFn) {
  const g = must(gameId)
  const r = g.currentRound()
  if (!r) throw new Error('Round not started')
  if (r.playerInTurn() !== playerIndex) throw new Error('Not your turn')

  r.draw()

  publish({ __typename: 'CardDrawn', gameId, playerIndex, drew: 1 })
  publish({ __typename: 'GameUpdated', game: gameView(g, gameId) })
  return gameView(g, gameId)
}

export function playCard(
  gameId: string,
  playerIndex: number,
  cardIndex: number,
  askedColor: Color | null | undefined,
  publish: PublishFn,
) {
  const g = must(gameId)
  const r = g.currentRound()
  if (!r) throw new Error('Round not started')
  if (r.playerInTurn() !== playerIndex) throw new Error('Not your turn')

  const card = r.play(cardIndex, askedColor ?? undefined)

  publish({
    __typename: 'CardPlayed',
    gameId,
    playerIndex,
    card,
    askedColor: askedColor ?? null,
  })
  publish({ __typename: 'GameUpdated', game: gameView(g, gameId) })
  return gameView(g, gameId)
}

export function sayUno(gameId: string, playerIndex: number, publish: PublishFn) {
  const g = must(gameId)
  const r = g.currentRound()
  if (!r) throw new Error('Round not started')

  r.sayUno(playerIndex)

  publish({ __typename: 'UnoSaid', gameId, playerIndex })
  publish({ __typename: 'GameUpdated', game: gameView(g, gameId) })
  return gameView(g, gameId)
}

export function accuseUno(
  gameId: string,
  accuserIndex: number,
  accusedIndex: number,
  publish: PublishFn,
) {
  const g = must(gameId)
  const r = g.currentRound()
  if (!r) throw new Error('Round not started')

  const success = r.catchUnoFailure({ accuser: accuserIndex, accused: accusedIndex })

  publish({
    __typename: 'UnoAccusationResult',
    gameId,
    accuserIndex,
    accusedIndex,
    success,
  })
  publish({ __typename: 'GameUpdated', game: gameView(g, gameId) })
  return gameView(g, gameId)
}

// ------------------------ internals ------------------------

function must(gameId: string): Game {
  const g = GAMES.get(gameId)
  if (!g) throw new Error('Game not found')
  return g
}

function playerCountOf(g: Game): number {
  return g.toMemento().players.length
}

function gameView(g: Game, id: string) {
  // Use the model’s memento as the single source of truth for public state.
  const snap = g.toMemento()
  const round = g.currentRound()

  return {
    id,
    targetScore: snap.targetScore,
    scores: snap.scores,
    players: snap.players.map((name) => ({ name })), // project to public shape
    winnerIndex: g.winner(),
    currentRound: round
      ? {
          playerInTurnIndex: round.playerInTurn() ?? null,
          hasEnded: round.hasEnded(),
          // derive what UI needs from the memento
          discardTop: snap.currentRound?.discardPile?.[0],
          drawPileSize: snap.currentRound?.drawPile?.length ?? 0,
        }
      : null,
  }
}