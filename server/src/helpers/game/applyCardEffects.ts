import { GameRuntime, Round, Card, Color, PublishFn } from '../../types/types'
import { drawN } from './drawN'
import { nextPlayerIndex } from './nextPlayerIndex'

export function applyCardEffects(
  rt: GameRuntime,
  r: Round,
  playerIndex: number,
  card: Card,
  askedColor: Color | null | undefined,
  publish: PublishFn,
): number {
  const nPlayers = rt.g.players.length

  switch (card.type) {
    case 'SKIP':
      // skip next: caller will advance twice
      return 2

    case 'REVERSE': {
      // flip direction; in 2-player games, REVERSE acts as SKIP
      rt.direction = rt.direction === 'CW' ? 'CCW' : 'CW'
      r.direction = rt.direction
      return nPlayers === 2 ? 2 : 1
    }

    case 'DRAW': {
      // +2 to next player, then skip them
      const victim = nextPlayerIndex(rt, playerIndex)
      drawN(rt, victim, 2, publish)
      return 2
    }

    case 'WILD':
      // color already set by caller; normal advance
      return 1

    case 'WILD_DRAW': {
      if (!askedColor) throw new Error('askedColor required for wild draw')
      const victim = nextPlayerIndex(rt, playerIndex)
      drawN(rt, victim, 4, publish)
      return 2
    }

    case 'NUMBERED':
    default:
      return 1
  }
}
