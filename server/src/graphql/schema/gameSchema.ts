import gql from 'graphql-tag'

export const gameSchema = gql`
  scalar UUID
  scalar DateTime

  enum Color {
    RED
    YELLOW
    GREEN
    BLUE
  }
  enum CardType {
    NUMBERED
    SKIP
    REVERSE
    DRAW
    WILD
    WILD_DRAW
  }
  enum CardNumber {
    N0
    N1
    N2
    N3
    N4
    N5
    N6
    N7
    N8
    N9
  }

  type Card {
    type: CardType!
    color: Color
    number: CardNumber
  }

  type Player {
    id: UUID!
    name: String!
    handCount: Int!
    score: Int!
    saidUno: Boolean!
  }

  type Round {
    id: UUID!
    playerInTurnIndex: Int
    discardTop: Card
    drawPileSize: Int!
    currentColor: Color
    direction: String!
    hasEnded: Boolean!
  }

  type Game {
    id: UUID!
    createdAt: DateTime!
    targetScore: Int!
    cardsPerPlayer: Int!
    players: [Player!]!
    currentRound: Round
    winnerIndex: Int
  }

  input CreateGameInput {
    targetScore: Int = 500
    cardsPerPlayer: Int = 7
    players: [String!]!
    userId: UUID!
  }

  type CreateGamePayload {
    game: Game!
  }

  input StartRoundInput {
    gameId: UUID!
    userId: UUID!
  }

  input PlayCardInput {
    gameId: UUID!
    playerIndex: Int!
    cardIndex: Int!
    askedColor: Color
    userId: UUID!
  }

  input DrawCardInput {
    gameId: UUID!
    playerIndex: Int!
    userId: UUID!
  }

  input SayUnoInput {
    gameId: UUID!
    playerIndex: Int!
    userId: UUID!
  }

  input AccuseUnoInput {
    gameId: UUID!
    accuserIndex: Int!
    accusedIndex: Int!
    userId: UUID!
  }

  type Mutation {
    createGame(input: CreateGameInput!): CreateGamePayload!
    startRound(input: StartRoundInput!): Game!
    addPlayer(gameId: UUID!, name: String!, userId: UUID!): Game!
    playCard(input: PlayCardInput!): Game!
    drawCard(input: DrawCardInput!): Game!
    sayUno(input: SayUnoInput!): Game!
    accuseUno(input: AccuseUnoInput!): Game!

    resetGame(gameId: UUID!): Game!
  }

  type Query {
    game(gameId: UUID!): Game!

    hand(gameId: UUID!, playerIndex: Int!): [Card!]!

    playableIndexes(gameId: UUID!, playerIndex: Int!): [Int!]!

    waitingGames: [Game!]!
  }

  type Notice {
    gameId: UUID!
    title: String!
    message: String!
    at: DateTime!
  } 


  union GameEvent =
    | PlayerJoined
    | GameStarted
    | TurnChanged
    | CardPlayed
    | CardDrawn
    | UnoSaid
    | UnoAccusationResult
    | RoundEnded
    | GameEnded
    | GameUpdated
    | Notice

  type PlayerJoined {
    gameId: UUID!
    playerIndex: Int!
    player: Player!
  }
  type GameStarted {
    gameId: UUID!
    game: Game!
  }
  type TurnChanged {
    gameId: UUID!
    playerInTurnIndex: Int!
  }
  type CardPlayed {
    gameId: UUID!
    playerIndex: Int!
    card: Card!
    askedColor: Color
  }
  type CardDrawn {
    gameId: UUID!
    playerIndex: Int!
    drew: Int!
  }
  type UnoSaid {
    gameId: UUID!
    playerIndex: Int!
  }
  type UnoAccusationResult {
    gameId: UUID!
    accuserIndex: Int!
    accusedIndex: Int!
    success: Boolean!
  }
  type RoundEnded {
    gameId: UUID!
    winnerIndex: Int!
    pointsAwarded: Int!
    scores: [Int!]!
  }
  type GameEnded {
    gameId: UUID!
    winnerIndex: Int!
    scores: [Int!]!
  }
  type GameUpdated {
    game: Game!
  }

  type Subscription {
    gameEvents(gameId: UUID!): GameEvent!
    gameUpdates(gameId: UUID!): Game!
  }
`
