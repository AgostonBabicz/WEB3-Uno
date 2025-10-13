import { Color } from "./types"

export type CreateGameResolverInput = {
  players: string[]
  targetScore?: number
  cardsPerPlayer?: number
  userId: string
}

export type StartRoundResolverInput = {
  gameId: string
  userId: string
}

export type AddPlayerResolverInput = {
  gameId: string
  name: string
  userId: string
}

export type PlayCardResolverInput = {
  gameId: string
  playerIndex: number
  cardIndex: number
  askedColor?: Color
  userId: string
}

export type DrawCardResolverInput = {
  gameId: string
  playerIndex: number
  userId: string
}

export type SayUnoResolverInput = {
  gameId: string
  playerIndex: number
  userId: string
}

export type AccuseUnoResolverInput = {
  gameId: string
  accuserIndex: number
  accusedIndex: number
  userId: string
}