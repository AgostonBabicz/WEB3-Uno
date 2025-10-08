import { PubSub } from 'graphql-subscriptions'

export const pubsub = new PubSub()

export const eventsTopic = (gameId: string) => `GAME_EVENTS_${gameId}`
export const updatesTopic = (gameId: string) => `GAME_UPDATES_${gameId}`

export function publishEvent(gameId: string, payload: any) {
  return pubsub.publish(eventsTopic(gameId), { gameEvents: payload })
}
export function publishUpdate(gameId: string, game: any) {
  return pubsub.publish(updatesTopic(gameId), { gameUpdates: game })
}
