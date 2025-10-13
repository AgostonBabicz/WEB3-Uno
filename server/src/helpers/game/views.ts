import { GameRuntime, Game, Player } from '../../types/types'
import { syncHandCounts } from './syncHandCounts'

export function gameView(rt: GameRuntime): Game {
  syncHandCounts(rt)
  return JSON.parse(JSON.stringify(rt.g))
}

export function playerView(rt: GameRuntime, ix: number): Player {
  syncHandCounts(rt)
  return JSON.parse(JSON.stringify(rt.g.players[ix]))
}
