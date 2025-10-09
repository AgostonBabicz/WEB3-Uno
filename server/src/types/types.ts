export type UUID = string
export type Color = 'RED' | 'YELLOW' | 'GREEN' | 'BLUE'
export type CardType = 'NUMBERED' | 'SKIP' | 'REVERSE' | 'DRAW' | 'WILD' | 'WILD_DRAW'
export type CardNumber = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

export type NumberCard = { type: 'NUMBERED'; color: Color; number: CardNumber }
export type SpecialCard = { type: 'SKIP' | 'REVERSE' | 'DRAW'; color: Color }
export type WildCard = { type: 'WILD' | 'WILD_DRAW' }
export type Card = NumberCard | SpecialCard | WildCard

export type Player = {
  id: UUID
  name: string
  handCount: number
  score: number
  saidUno: boolean
}

export type Round = {
  id: UUID
  playerInTurnIndex: number | null
  discardTop: Card | null
  drawPileSize: number
  currentColor: Color | null
  direction: 'CW' | 'CCW'
  hasEnded: boolean
}

export type Game = {
  id: UUID
  createdAt: string
  targetScore: number
  cardsPerPlayer: number
  players: Player[]
  currentRound: Round | null
  winnerIndex: number | null
}

export type GameRuntime = {
  g: Game
  deck: Card[]
  discard: Card[]
  hands: Card[][]
  saidUno: boolean[]
  direction: 'CW' | 'CCW'
}

// Events (union members)
export type PlayerJoined = { gameId: UUID; playerIndex: number; player: Player }
export type GameStarted = { gameId: UUID; game: Game }
export type TurnChanged = { gameId: UUID; playerInTurnIndex: number }
export type CardPlayedEvt = {
  gameId: UUID
  playerIndex: number
  card: Card
  askedColor?: Color | null
}
export type CardDrawnEvt = { gameId: UUID; playerIndex: number; drew: number }
export type UnoSaidEvt = { gameId: UUID; playerIndex: number }
export type UnoAccusationResultEvt = {
  gameId: UUID
  accuserIndex: number
  accusedIndex: number
  success: boolean
}
export type RoundEndedEvt = {
  gameId: UUID
  winnerIndex: number
  pointsAwarded: number
  scores: number[]
}
export type GameEndedEvt = { gameId: UUID; winnerIndex: number; scores: number[] }
export type GameUpdatedEvt = { game: Game }

export type GameEvent =
  | ({ __typename: 'PlayerJoined' } & PlayerJoined)
  | ({ __typename: 'GameStarted' } & GameStarted)
  | ({ __typename: 'TurnChanged' } & TurnChanged)
  | ({ __typename: 'CardPlayed' } & CardPlayedEvt)
  | ({ __typename: 'CardDrawn' } & CardDrawnEvt)
  | ({ __typename: 'UnoSaid' } & UnoSaidEvt)
  | ({ __typename: 'UnoAccusationResult' } & UnoAccusationResultEvt)
  | ({ __typename: 'RoundEnded' } & RoundEndedEvt)
  | ({ __typename: 'GameEnded' } & GameEndedEvt)
  | ({ __typename: 'GameUpdated' } & GameUpdatedEvt)
