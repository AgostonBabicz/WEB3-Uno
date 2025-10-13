import { GameRuntime } from '../../types/types'

export function refeed(rt: GameRuntime) {
  if (rt.discard.length <= 1) return
  const top = rt.discard.pop()!
  let pool = rt.discard.splice(0)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  rt.deck.push(...pool)
  rt.discard.push(top)
}
