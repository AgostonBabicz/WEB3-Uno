import {
  getGame,
  hand,
  playableIndexes,
  startRound,
  playCard,
  drawCard,
  sayUno,
  accuseUno,
  resetGame,
  createGame,
} from '../engine'
import { publishEvent, publishUpdate, eventsTopic, updatesTopic, pubsub } from '../pubsub'
import { GameEvent, Color } from 'src/types/types'
import { DateTimeResolver, UUIDResolver } from 'graphql-scalars'

export const resolvers = {
  UUID: UUIDResolver,
  DateTime: DateTimeResolver,

  GameEvent: {
    __resolveType(obj: { __typename: string }) {
      return obj.__typename
    },
  },

  Query: {
    game: (_: any, { gameId }: { gameId: string }) => getGame(gameId),
    hand: (_: any, { gameId, playerIndex }: { gameId: string; playerIndex: number }) =>
      hand(gameId, playerIndex),
    playableIndexes: (_: any, { gameId, playerIndex }: { gameId: string; playerIndex: number }) =>
      playableIndexes(gameId, playerIndex),
  },

  Mutation: {
    createGame: (
      _: any,
      { input }: { input: { players: string[]; targetScore?: number; cardsPerPlayer?: number } },
    ) => {
      const target = input.targetScore ?? 500
      const cpp = input.cardsPerPlayer ?? 7
      const g = createGame(input.players, target, cpp, (ev: GameEvent) => {
        publishEvent(g.id, ev)
        if (ev.__typename === 'GameUpdated') publishUpdate(g.id, ev.game)
      })
      return { game: g }
    },

    startRound: (_: any, { input }: { input: { gameId: string } }) =>
      startRound(input.gameId, (ev) => {
        publishEvent(input.gameId, ev)
        if (ev.__typename === 'GameUpdated') publishUpdate(input.gameId, ev.game)
      }),

    playCard: (
      _: any,
      {
        input,
      }: { input: { gameId: string; playerIndex: number; cardIndex: number; askedColor?: Color } },
    ) =>
      playCard(input.gameId, input.playerIndex, input.cardIndex, input.askedColor, (ev) => {
        publishEvent(input.gameId, ev)
        if (ev.__typename === 'GameUpdated') publishUpdate(input.gameId, ev.game)
      }),

    drawCard: (_: any, { input }: { input: { gameId: string; playerIndex: number } }) =>
      drawCard(input.gameId, input.playerIndex, (ev) => {
        publishEvent(input.gameId, ev)
        if (ev.__typename === 'GameUpdated') publishUpdate(input.gameId, ev.game)
      }),

    sayUno: (_: any, { input }: { input: { gameId: string; playerIndex: number } }) =>
      sayUno(input.gameId, input.playerIndex, (ev) => {
        publishEvent(input.gameId, ev)
        if (ev.__typename === 'GameUpdated') publishUpdate(input.gameId, ev.game)
      }),

    accuseUno: (
      _: any,
      { input }: { input: { gameId: string; accuserIndex: number; accusedIndex: number } },
    ) =>
      accuseUno(input.gameId, input.accuserIndex, input.accusedIndex, (ev) => {
        publishEvent(input.gameId, ev)
        if (ev.__typename === 'GameUpdated') publishUpdate(input.gameId, ev.game)
      }),

    resetGame: (_: any, { gameId }: { gameId: string }) =>
      resetGame(gameId, (ev) => {
        publishEvent(gameId, ev)
        if (ev.__typename === 'GameUpdated') publishUpdate(gameId, ev.game)
      }),
  },

  Subscription: {
    gameEvents: {
      subscribe: (_: any, { gameId }: { gameId: string }) =>
        pubsub.asyncIterableIterator([eventsTopic(gameId)]),
      resolve: (payload: { gameEvents: GameEvent }) => payload.gameEvents,
    },
    gameUpdates: {
      subscribe: (_: any, { gameId }: { gameId: string }) =>
        pubsub.asyncIterableIterator([updatesTopic(gameId)]),
      resolve: (payload: { gameUpdates: any }) => payload.gameUpdates,
    },
  },
}
