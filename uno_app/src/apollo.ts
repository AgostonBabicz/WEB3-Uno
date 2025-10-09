import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client/core'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'
import { getMainDefinition } from '@apollo/client/utilities'

const httpUri = 'http://localhost:4000/graphql'
const wsUri = 'ws://localhost:4000/graphql'

const httpLink = new HttpLink({ uri: httpUri })

const wsLink = new GraphQLWsLink(
  createClient({
    url: wsUri,
    retryAttempts: 10,
  }),
)

const link = split(
  ({ query }) => {
    const def: any = getMainDefinition(query)
    return def.kind === 'OperationDefinition' && def.operation === 'subscription'
  },
  wsLink,
  httpLink,
)

export const apollo = new ApolloClient({
  link,
  cache: new InMemoryCache(),
})
