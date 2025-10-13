import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.raw('SET SCHEMA \'public\';')
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
  

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'))
    table.string('username').notNullable().unique()
    table.string('password_hash').notNullable()
  })

  await knex.schema.createTable('games', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'))

    table.integer('target_score').notNullable().defaultTo(500)
    table.integer('cards_per_player').notNullable().defaultTo(7)

    table.timestamp('created_at').defaultTo(knex.fn.now())
  })

  await knex.schema.createTable('game_players', (table) => {
    table.uuid('game_id').notNullable().references('id').inTable('games').onDelete('CASCADE')
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')

    table.integer('seat_index').notNullable()

    table.primary(['game_id', 'user_id'])
    table.unique(['game_id', 'seat_index'])
  })

  await knex.schema.createTable('rounds', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'))
    table
      .uuid('game_id')
      .notNullable()
      .references('id')
      .inTable('games')
      .onDelete('CASCADE')
      .index()

    table.integer('number').notNullable()

    table
      .uuid('winner_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .index()

    table.jsonb('scores').notNullable().defaultTo('{}')

    table.timestamp('started_at').defaultTo(knex.fn.now())
    table.timestamp('ended_at')
    table.unique(['game_id', 'number'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('rounds')
  await knex.schema.dropTableIfExists('game_players')
  await knex.schema.dropTableIfExists('games')
  await knex.schema.dropTableIfExists('users')
  await knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp";')
}
