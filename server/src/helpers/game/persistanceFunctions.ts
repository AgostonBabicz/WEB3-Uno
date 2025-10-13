import { GameRepository } from "../../repository/gameRepository"
import { RoundRepository } from "../../repository/roundRepository"
import { GameRuntime } from "../../types/types"
import { ensureAug } from "./runtimeAug"
import { computePointsFromHands } from "./computePointsFromHands"

// used to persist game and round state changes
export function persistGameCreate(rt: GameRuntime, hostUserId?: string | null) {
  const g = new GameRepository()
  g.create({
    id: rt.g.id,
    targetScore: rt.g.targetScore,
    cardsPerPlayer: rt.g.cardsPerPlayer,
  }).catch(console.error)

  if (hostUserId) {
    g.playerJoinsGame({
      gameId: rt.g.id,
      userId: hostUserId,
      seatIndex: 0,
    }).catch(console.error)
  }
}

export function persistPlayerJoin(rt: GameRuntime, userId: string, seatIndex: number) {
  const g = new GameRepository()
  g.playerJoinsGame({
    gameId: rt.g.id,
    userId,
    seatIndex,
  }).catch(console.error)
}

export function persistRoundStart(rt: GameRuntime, roundNo: number) {
  const rr = new RoundRepository()
  rr.start({
    gameId: rt.g.id,
    number: roundNo,
    startedAt: new Date().toISOString(),
  })
    .then(row => {
      const aug = ensureAug(rt)
      aug._roundRowId = row.id
    })
    .catch(console.error)
}

export function persistRoundFinish(rt: GameRuntime, winnerIx: number) {
  const aug = ensureAug(rt)
  const roundNo = aug._roundNo

  const winnerUserId = aug.userIds[winnerIx] ?? null

  const rp = computePointsFromHands(rt, winnerIx)
  const scores = rt.g.players.map((p, i) => ({
    userId: aug.userIds[i] ?? null,
    name: p.name,
    roundPoints: rp.perPlayer[i],
  }))

  const rr = new RoundRepository()

  if (aug._roundRowId) {
    rr.finish({
      id: aug._roundRowId,
      winnerUserId: winnerUserId ?? undefined,
      scores,
      endedAt: new Date().toISOString(),
    }).catch(console.error)
  } else {
    rr.start({ gameId: rt.g.id, number: roundNo, startedAt: new Date().toISOString() })
      .then(row =>
        rr.finish({
          id: row.id,
          winnerUserId: winnerUserId ?? undefined,
          scores,
          endedAt: new Date().toISOString(),
        }),
      )
      .catch(console.error)
  }
}