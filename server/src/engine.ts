import { v4 as uuid } from 'uuid'
import type { Color, Card } from '@uno/shared/model/deck'
import { Game } from '@uno/shared/model/uno'

import { standardRandomizer, standardShuffler } from '@uno/shared/utils/random_utils'
import {
  persistGameCreate,
  persistPlayerJoin,
  persistRoundStart,
} from './helpers/game/persistanceFunctions'

export type PublishFn = (evt: any) => void

type GqlCard = {
  type: 'NUMBERED' | 'SKIP' | 'REVERSE' | 'DRAW' | 'WILD' | 'WILD_DRAW'
  color?: 'RED' | 'YELLOW' | 'GREEN' | 'BLUE'
  number?: 'N0' | 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'N6' | 'N7' | 'N8' | 'N9'
}

function toGqlCard(c: Card | undefined | null): GqlCard | null {
  if (!c) return null

  let number: GqlCard['number'] | undefined
  if (c.type === 'NUMBERED') {
    const v = (c as any).number
    if (typeof v !== 'number' || v < 0 || v > 9) {
      throw new Error(`Invalid NUMBERED card number: ${v}`)
    }
    number = `N${v}` as GqlCard['number']
  }

  return {
    type: c.type as GqlCard['type'],
    ...(c as any).color ? { color: (c as any).color } : {},
    ...(number ? { number } : {}),
  }
}

export function notify(gameId: string, title: string, message: string, publish: PublishFn) {
  publish({
    __typename: 'Notice',
    gameId,
    title,
    message,
    at: new Date().toISOString(),
  })
}

const GAMES = new Map<string, Game>()
const GAME_IDS = new WeakMap<Game, string>()
const GAME_META = new WeakMap<Game, { createdAt: string; updatedAt: string | null }>()
const ROUND_IDS = new WeakMap<Game, string | null>()
const PLAYER_IDS = new WeakMap<Game, string[]>()

function touch(g: Game) {
  const meta = GAME_META.get(g)
  if (meta) meta.updatedAt = new Date().toISOString()
}
function getPlayerIds(g: Game, count: number): string[] {
  let ids = PLAYER_IDS.get(g)
  if (!ids) {
    ids = Array.from({ length: count }, () => uuid())
    PLAYER_IDS.set(g, ids)
  } else if (ids.length < count) {
    // append ids for newly added players
    for (let i = ids.length; i < count; i++) ids.push(uuid())
  } else if (ids.length > count) {
    ids = ids.slice(0, count)
    PLAYER_IDS.set(g, ids)
  }
  return ids
}
function ensureRoundId(g: Game): string {
  let id = ROUND_IDS.get(g) ?? null
  if (!id) {
    id = uuid()
    ROUND_IDS.set(g, id)
  }
  return id
}

function clearRoundId(g: Game) {
  ROUND_IDS.set(g, null)
}
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
  const defer = players.length === 1
  const g = new Game(
    players,
    targetScore,
    standardRandomizer,
    standardShuffler,
    cardsPerPlayer,
    { deferFirstRound: defer },
  )

  GAMES.set(id, g)
  GAME_IDS.set(g, id)
  GAME_META.set(g, { createdAt: new Date().toISOString(), updatedAt: null })
  if (g.currentRound()) ensureRoundId(g)

  await persistGameCreate(id, g, hostUserId ?? null)
  publish({ __typename: 'GameUpdated', game: gameView(g, id) })
  return gameView(g, id)
}

export function addPlayer(gameId: string, name: string, publish: PublishFn) {
  const g = must(gameId)
  if (g.currentRound()) throw new Error('Cannot join: round already started')

  g.addPlayer(name)
  touch(g)

  publish({
    __typename: 'PlayerJoined',
    gameId,
    playerIndex: g.toMemento().players.length - 1,
    player: { name },
  })
  publish({ __typename: 'GameUpdated', game: gameView(g, gameId) })
  return gameView(g, gameId)
}

export function startRound(gameId: string, publish: PublishFn) {
  const g = must(gameId)
  if (g.currentRound()) throw new Error('Round already started')
  if (!g.canStart()) throw new Error('Need at least 2 players to start')

  g.startNewRound()
  ensureRoundId(g)
  touch(g)

  persistRoundStart(gameId, 1)
  publish({ __typename: 'GameUpdated', game: gameView(g, gameId) })
  return gameView(g, gameId)
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
    ; (ng as any).presentRound = undefined
  GAMES.set(id, ng)
  GAME_IDS.set(ng, id)

  const oldMeta = GAME_META.get(g)
  GAME_META.set(ng, {
    createdAt: oldMeta?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  clearRoundId(ng)
  publish({ __typename: 'GameUpdated', game: gameView(ng, id) })
  return gameView(ng, id)
}

export function hand(gameId: string, playerIndex: number): GqlCard[] {
  const g = must(gameId)
  const r = g.currentRound()
  if (!r) return []
  const raw = r.playerHand(playerIndex) ?? []
  return raw.map(toGqlCard).filter(Boolean) as GqlCard[]
}

export function playableIndexes(gameId: string, playerIndex: number): number[] {
  const g = must(gameId)
  const r = g.currentRound()
  if (!r) return []
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
  touch(g)

  notify(gameId, 'Drawn card', `Player ${playerIndex} drawn a card`, publish)
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

  const modelCard = r.play(cardIndex, askedColor ?? undefined)
  const gqlCard = toGqlCard(modelCard)
  if(gqlCard.type==="NUMBERED"){
    const number = gqlCard.number
    const color = gqlCard.color
    notify(gameId, 'Numbered card played', `Player ${playerIndex} chose ${color} ${number}`, publish)
  }else if (gqlCard?.type === 'WILD') {
    const asked = askedColor ?? 'RED'
    notify(gameId, 'Wild card played', `Player ${playerIndex} chose ${asked}`, publish)
  }else if(gqlCard?.type === 'WILD_DRAW'){
    const asked = askedColor ?? 'RED'
    notify(gameId, 'Wild card played', `Player ${playerIndex} chose ${asked}, draw 4 cards`, publish)
  }else if(gqlCard.type ==="DRAW"){
    const color = gqlCard.color
    notify(gameId, `Draw (${color}) card played`, `Player ${playerIndex} made the next player draw 2 cards`, publish)
  }else if(gqlCard.type ==="REVERSE"){
    const color = gqlCard.color
    notify(gameId, `Reverse (${color}) card played`, `Player ${playerIndex} made the round's direction the opposite`, publish)
  }else{
    const color = gqlCard.color
    notify(gameId, `Skip (${color}) card played`, `Player ${playerIndex} skipped the next player in turn`, publish)
  }
  touch(g)

  publish({
    __typename: 'CardPlayed',
    gameId,
    playerIndex,
    card: gqlCard,
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
  touch(g)
  notify(gameId, `${playerIndex} said uno`,'', publish)
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
  touch(g)
  notify(gameId, `${accuserIndex} accused ${accusedIndex} for not saying uno`,'', publish)
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
  const snap = g.toMemento()
  const round = g.currentRound()
  const meta = GAME_META.get(g) ?? {
    createdAt: new Date().toISOString(),
    updatedAt: null as string | null,
  }
  if (!GAME_META.has(g)) GAME_META.set(g, meta)

  const playerIds = getPlayerIds(g, snap.players.length)

  const handCount = (ix: number) =>
    round ? (round.playerHand(ix)?.length ?? 0) : 0
  const saidUno = (_ix: number) => false

  return {
    id,
    createdAt: meta.createdAt,
    targetScore: snap.targetScore,
    cardsPerPlayer: snap.cardsPerPlayer,

    players: snap.players.map((name, ix) => ({
      id: playerIds[ix],
      name,
      handCount: handCount(ix),
      score: snap.scores[ix] ?? 0,
      saidUno: saidUno(ix),
    })),

    currentRound: round
      ? {
        id: ensureRoundId(g),
        playerInTurnIndex: round.playerInTurn() ?? null,
        discardTop: toGqlCard(snap.currentRound?.discardPile?.[0]),
        drawPileSize: snap.currentRound?.drawPile?.length ?? 0,
        currentColor: snap.currentRound?.currentColor ?? null,
        direction: snap.currentRound?.currentDirection ?? 'clockwise',
        hasEnded: round.hasEnded(),
      }
      : null,

    winnerIndex: g.winner(),
  }
}