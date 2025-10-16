import { gql } from 'graphql-tag'

export const CREATE_GAME = gql`
  mutation CreateGame($input: CreateGameInput!) {
    createGame(input: $input) {
      game {
        id
        createdAt
        targetScore
        cardsPerPlayer
        players {
          id
          name
          handCount
          score
          saidUno
        }
        currentRound {
          playerInTurnIndex
        }
      }
    }
  }
`

export const ADD_PLAYER = gql`
  mutation AddPlayer($gameId: UUID!, $name: String!, $userId: UUID!) {
    addPlayer(gameId: $gameId, name: $name, userId: $userId) {
      id
      players {
        id
        name
        handCount
        score
      }
      currentRound {
        playerInTurnIndex
      }
    }
  }
`

export const START_ROUND = gql`
  mutation StartRound($input: StartRoundInput!) {
    startRound(input: $input) {
      id
      currentRound {
        playerInTurnIndex
        discardTop {
          type
          color
          number
        }
        drawPileSize
        currentColor
        direction
        hasEnded
      }
      players {
        name
        handCount
        score
        saidUno
      }
    }
  }
`

export const PLAY_CARD = gql`
  mutation PlayCard($input: PlayCardInput!) {
    playCard(input: $input) {
      id
      currentRound {
        playerInTurnIndex
        discardTop {
          type
          color
          number
        }
        drawPileSize
        currentColor
        direction
        hasEnded
      }
      players {
        name
        handCount
        score
        saidUno
      }
    }
  }
`

export const DRAW_CARD = gql`
  mutation DrawCard($input: DrawCardInput!) {
    drawCard(input: $input) {
      id
      currentRound {
        playerInTurnIndex
        drawPileSize
      }
      players {
        name
        handCount
      }
    }
  }
`

export const SAY_UNO = gql`
  mutation SayUno($input: SayUnoInput!) {
    sayUno(input: $input) {
      id
      players {
        name
        saidUno
      }
    }
  }
`

export const ACCUSE_UNO = gql`
  mutation AccuseUno($input: AccuseUnoInput!) {
    accuseUno(input: $input) {
      id
      players {
        name
        handCount
        saidUno
      }
    }
  }
`

export const GET_GAME = gql`
  query GetGame($gameId: UUID!) {
    game(gameId: $gameId) {
      id
      targetScore
      cardsPerPlayer
      winnerIndex
      players {
        id
        name
        handCount
        score
        saidUno
      }
      currentRound {
        playerInTurnIndex
        discardTop {
          type
          color
          number
        }
        drawPileSize
        currentColor
        direction
        hasEnded
      }
    }
  }
`

export const HAND = gql`
  query Hand($gameId: UUID!, $playerIndex: Int!) {
    hand(gameId: $gameId, playerIndex: $playerIndex) {
      type
      color
      number
    }
  }
`

export const PLAYABLE = gql`
  query Playable($gameId: UUID!, $playerIndex: Int!) {
    playableIndexes(gameId: $gameId, playerIndex: $playerIndex)
  }
`

export const SUB_EVENTS = gql`
  subscription GameEvents($gameId: UUID!) {
    gameEvents(gameId: $gameId) {
      __typename
      ... on PlayerJoined {
        playerIndex
        player {
          name
          handCount
          score
        }
      }
      ... on GameStarted {
        game {
          id
        }
      }
      ... on TurnChanged {
        playerInTurnIndex
      }
      ... on CardPlayed {
        playerIndex
        card {
          type
          color
          number
        }
        askedColor
      }
      ... on CardDrawn {
        playerIndex
        drew
      }
      ... on UnoSaid {
        playerIndex
      }
      ... on UnoAccusationResult {
        accuserIndex
        accusedIndex
        success
      }
      ... on RoundEnded {
        winnerIndex
        pointsAwarded
        scores
      }
      ... on GameEnded {
        winnerIndex
        scores
      }
      ... on GameUpdated {
        game {
          id
        }
      }
      ... on Notice {
        title
        message
        at
      }
    }
  }
`

export const SUB_UPDATES = gql`
  subscription GameUpdates($gameId: UUID!) {
    gameUpdates(gameId: $gameId) {
      id
      winnerIndex
      players {
        id
        name
        handCount
        score
        saidUno
      }
      currentRound {
        playerInTurnIndex
        discardTop {
          type
          color
          number
        }
        drawPileSize
        currentColor
        direction
        hasEnded
      }
    }
  }
`

export const WAITING_GAMES = gql`
  query WaitingGames {
    waitingGames {
      id
      targetScore
      cardsPerPlayer
      players {
        name
      }
      currentRound {
        playerInTurnIndex
      }
    }
  }
`
