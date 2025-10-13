import { GameRuntime } from '../../types/types'

export function assertTurn(rt: GameRuntime, playerIndex: number) {
  if (!rt.g.currentRound) {
    throw new Error('No active round. Call startRound first.')
  }
  const r = rt.g.currentRound

  if (r.hasEnded) {
    throw new Error('Round already ended.')
  }

  if (playerIndex < 0 || playerIndex >= rt.g.players.length) {
    throw new Error('Invalid playerIndex.')
  }

  if (r.playerInTurnIndex === null || r.playerInTurnIndex === undefined) {
    throw new Error('No player is currently in turn.')
  }

  if (r.playerInTurnIndex !== playerIndex) {
    throw new Error(`Not your turn. Expected player ${r.playerInTurnIndex}, got ${playerIndex}.`)
  }
}
