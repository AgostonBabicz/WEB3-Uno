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
  addPlayer,
  waitingGames,
} from '../engine'
import { publishEvent, publishUpdate, eventsTopic, updatesTopic, pubsub } from '../pubsub'
import { GameEvent, Color } from '../types/types'
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

    waitingGames: () => waitingGames(),
  },

  Mutation: {
    createGame: (
      _: any,
      { input }: { input: { players: string[]; targetScore?: number; cardsPerPlayer?: number } },
    ) => {
      const target = input.targetScore ?? 500
      const cpp = input.cardsPerPlayer ?? 7

      const publisher = (ev: GameEvent) => {
        const id = (ev as any).gameId ?? ((ev as any).game && (ev as any).game.id)

        if (!id) return

        publishEvent(id, ev)
        if (ev.__typename === 'GameUpdated') {
          publishUpdate(id, (ev as any).game)
        }
      }

      const game = createGame(input.players, target, cpp, publisher)
      return { game }
    },

    addPlayer: (_: any, { gameId, name }: { gameId: string; name: string }) =>
      addPlayer(gameId, name, (ev) => {
        publishEvent(gameId, ev)
        if (ev.__typename === 'GameUpdated') publishUpdate(gameId, ev.game)
      }),

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
