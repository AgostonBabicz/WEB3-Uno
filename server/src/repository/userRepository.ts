import { SQL as sql } from 'sql-template-strings'
import { AuthenticateUserInput, CreateUserInput, GetUserInput } from '../inputs/userInputs'
import { query } from '../utils/pg'
import { CRUD } from './interface/crud'
import { verifyPassword } from '../helpers/auth/verifyPassword'

export class UserRepository implements CRUD<UserRepository> {
  id: string
  username: string
  passwordHash: string
  constructor(input: any) {
    this.id = input.id
    this.username = input.username
    this.passwordHash = input.password_hash
  }

  async getOne(input: GetUserInput): Promise<UserRepository> {
    const rows = await query(sql`
            SELECT
                id,
                username
            FROM users
            WHERE id = ${input.id}
        `)

    if (rows.length === 0) {
      throw new Error('User not found')
    }

    return new UserRepository(rows[0])
  }

  async create(input: CreateUserInput): Promise<UserRepository> {
    const rows = await query(sql`
            INSERT INTO users (username, password_hash)
            VALUES (${input.username}, ${input.password} )
            RETURNING id
        `)

    return await this.getOne({ id: rows[0].id })
  }

  async authenticate(input: AuthenticateUserInput): Promise<UserRepository> {
    const rows = await query(sql`
      SELECT id, username, password_hash
      FROM users
      WHERE username = ${input.username}
      LIMIT 1
    `)
    if (!rows.length) throw new Error('Invalid username or password')
    const row = rows[0]

    const ok = await verifyPassword(input.password, row.password_hash)
    if (!ok) throw new Error('Invalid username or password')

    this.id = row.id
    this.username = row.username
    this.passwordHash = row.password_hash
    return new UserRepository({ id: row.id, username: row.username })
  }

  get(): Promise<UserRepository[]> {
    throw new Error('Method not implemented.')
  }
  update(input: any): Promise<UserRepository> {
    throw new Error('Method not implemented.')
  }
  delete(input: any): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
