import { Pool, PoolClient } from 'pg'
import { SQLStatement } from 'sql-template-strings'
// import 'dotenv/config'

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'uno',
  password: 'password',
  max: 10,
})

const query = async (sql: SQLStatement) => {
  const { rows } = await pool.query(sql)
  return rows
}

const transaction = async (tx: (query: PoolClient) => Promise<any>) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await tx(client)
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export { pool, query, transaction }
