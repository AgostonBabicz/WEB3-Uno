
export interface GetRoundInput { id: string }

export interface StartRoundInput { gameId: string; number: number; startedAt?: string }


export interface FinishRoundInput {
    id: string
    winnerUserId: string | null
    scores: Array<{ userId: string | null; name?: string; roundPoints: number }>
    endedAt?: string
  }