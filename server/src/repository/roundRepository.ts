import { query } from '../utils/pg'
import { SQL as sql } from 'sql-template-strings'
import { CRUD } from './interface/crud'
import { FinishRoundInput, GetRoundInput, StartRoundInput } from 'src/inputs/roundInputs'

export class RoundRepository implements CRUD<RoundRepository> {
  id: string
  gameId: string
  number: number
  winnerId: string | null
  scores: Array<{ userId: string | null; name?: string; roundPoints: number }>
  startedAt: string
  endedAt: string | null

  constructor(row: any = {}) {
    this.id = row.id
    this.gameId = row.game_id
    this.number = row.number
    this.winnerId = row.winner_id ?? null
    this.scores = row.scores ?? []
    this.startedAt = row.started_at
    this.endedAt = row.ended_at ?? null
  }
 

  async getOne(input: GetRoundInput): Promise<RoundRepository> {
    const rows = await query(sql`
      SELECT id, game_id, number, winner_id, scores, started_at, ended_at
      FROM rounds
      WHERE id = ${input.id}
    `)
    if (rows.length === 0) throw new Error('Round not found')
    return new RoundRepository(rows[0])
  }

  async start(input: StartRoundInput): Promise<RoundRepository> {
    const rows = await query(sql`
      INSERT INTO rounds (game_id, number, started_at)
      VALUES (${input.gameId}, ${input.number}, ${input.startedAt ?? new Date().toISOString()})
      RETURNING id
    `)
    return this.getOne({ id: rows[0].id })
  }

  async finish(input: FinishRoundInput): Promise<RoundRepository> {
    const rows = await query(sql`
      UPDATE rounds
      SET winner_id = ${input.winnerUserId},
          scores    = ${JSON.stringify(input.scores)},
          ended_at  = ${input.endedAt ?? new Date().toISOString()}
      WHERE id = ${input.id}
      RETURNING id
    `)
    return this.getOne({ id: rows[0].id })
  }


 create(input: any): Promise<RoundRepository> {
    throw new Error('Method not implemented.')
  }
  get(): Promise<RoundRepository[]> { throw new Error('Not implemented') }
  update(_: any): Promise<RoundRepository> { throw new Error('Not implemented') }
  delete(_: any): Promise<void> { throw new Error('Not implemented') }
}
