import { query } from '../utils/pg'
import { SQL as sql } from 'sql-template-strings'
import { CreateGameInput, GetGameInput, PlayerJoinsGameInput } from '../inputs/gameInputs'
import { CRUD } from './interface/crud'

export class GameRepository implements CRUD<GameRepository> {
  id: string
  targetScore: number
  cardsPerPlayer: number
  createdAt: string

  constructor(row: any = {}) {
    this.id = row.id
    this.targetScore = row.target_score
    this.cardsPerPlayer = row.cards_per_player
    this.createdAt = row.created_at
  }

  async create(input: CreateGameInput): Promise<GameRepository> {
    const rows = await query(sql`
      INSERT INTO games (id, target_score, cards_per_player)
      VALUES (${input.id}, ${input.targetScore}, ${input.cardsPerPlayer})
      RETURNING id
    `)
    return this.getOne({ id: rows[0].id })
  }

  async getOne(input: GetGameInput): Promise<GameRepository> {
    const rows = await query(sql`
      SELECT id, target_score, cards_per_player, created_at
      FROM games
      WHERE id = ${input.id}
    `)
    if (rows.length === 0) throw new Error('Game not found')
    return new GameRepository(rows[0])
  }

  async playerJoinsGame(input: PlayerJoinsGameInput): Promise<void> {
    await query(sql`
      INSERT INTO game_players (game_id, user_id, seat_index)
      VALUES (${input.gameId}, ${input.userId}, ${input.seatIndex})
    `)
  }

  // stubs
  get(): Promise<GameRepository[]> { throw new Error('Not implemented') }
  update(_: any): Promise<GameRepository> { throw new Error('Not implemented') }
  delete(_: any): Promise<void> { throw new Error('Not implemented') }
}