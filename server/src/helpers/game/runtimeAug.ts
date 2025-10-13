import { GameRuntime, RuntimeAug } from "../../types/types"

export function ensureAug(rt: GameRuntime): RuntimeAug {
  const anyRt = rt as any
  if (!anyRt.__aug) {
    anyRt.__aug = { userIds: [], _roundNo: 0 } as RuntimeAug
  }
  return anyRt.__aug as RuntimeAug
}