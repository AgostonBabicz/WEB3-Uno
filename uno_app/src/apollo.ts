import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { createClient } from 'graphql-ws'

export const apolloHttp = new ApolloClient({
  link: new HttpLink({ uri: 'http://localhost:4000/graphql' }),
  cache: new InMemoryCache(),
})

export const apolloWs = new ApolloClient({
  link: new GraphQLWsLink(
    createClient({
      url: 'ws://localhost:4000/graphql',
      retryAttempts: Infinity,
      shouldRetry: () => true,
    }),
  ),
  cache: new InMemoryCache(),
})
