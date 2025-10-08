import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@as-integrations/express5'
import { resolvers } from './graphql/resolver'
import { typeDefs } from './graphql/schema'

async function bootstrap() {
  const app = express()
  app.use(cors())
  app.use(bodyParser.json())

  const server = new ApolloServer({ typeDefs, resolvers })
  await server.start()

  app.use('/graphql', expressMiddleware(server))

  app.listen(4000, () => {
    console.log(`GraphQL http://localhost:4000/graphql`)
  })
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
