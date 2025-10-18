import { Card, Color } from "./model/deck"

type BotTurnRequest = {
  kind: 'TURN'
  ix: number
  players: string[]
  hand: Card[]
  canPlay: boolean[]
  oneCardLeft: boolean
  accuseCandidates: number[]
}

type BotTurnResponse = {
  action: 'play' | 'draw'
  cardIx?: number
  askedColor?: Color
  sayUno?: boolean
  accusations?: number[]
  message?: { title: string; text: string }
}

function randomDelay(): number {
  const base = 250
  const jitter = Math.floor(Math.random() * 600)
  return base + jitter
}

function chooseWildColor(hand: Card[]): Color {
  const counts: Record<Color, number> = { RED: 0, YELLOW: 0, GREEN: 0, BLUE: 0 }
  for (const c of hand) {
    if ('color' in c && (c as any).color) counts[(c as any).color as Color]++
  }
  let best: Color = 'RED'
  let bestN = -1
  ;(Object.keys(counts) as Color[]).forEach(k => {
    if (counts[k] > bestN) { best = k; bestN = counts[k] }
  })
  return best
}

self.onmessage = async (ev: MessageEvent<BotTurnRequest>) => {
  const req = ev.data
  if (req.kind !== 'TURN') return

  await new Promise(res => setTimeout(res, randomDelay()))

  const { ix, hand, canPlay, players, oneCardLeft, accuseCandidates } = req
  const accusations = accuseCandidates.filter(t => t !== ix)

  let response: BotTurnResponse | null = null
  for (let i = 0; i < hand.length; i++) {
    if (!canPlay[i]) continue
    const card = hand[i]
    if (card.type === 'WILD' || card.type === 'WILD DRAW') {
      const askedColor = chooseWildColor(hand)
      response = {
        action: 'play',
        cardIx: i,
        askedColor,
        accusations,
        sayUno: oneCardLeft ? Math.random() > 0.5 : false,
        message: { title: 'Bot plays', text: `Bot ${players[ix]} plays ${card.type} and chooses ${askedColor}` },
      }
    } else {
      response = {
        action: 'play',
        cardIx: i,
        accusations,
        sayUno: oneCardLeft ? Math.random() > 0.5 : false,
      }
    }
    break
  }

  if (!response) {
    response = {
      action: 'draw',
      accusations,
      sayUno: oneCardLeft ? Math.random() > 0.5 : false,
    }
  }

  ;(self as unknown as Worker).postMessage(response)
}
