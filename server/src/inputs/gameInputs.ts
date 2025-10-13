export interface CreateGameInput {
  id: string
  targetScore: number
  cardsPerPlayer: number
}

export interface GetGameInput {
  id: string
}

export interface PlayerJoinsGameInput { gameId: string; userId: string; seatIndex: number;}