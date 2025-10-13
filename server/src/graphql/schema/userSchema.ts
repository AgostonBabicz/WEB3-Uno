import { gql } from 'graphql-tag'

export const userSchema = gql`
  scalar UUID

  type User {
    id: UUID!
    username: String!
  }

  input CreateUserInput {
    username: String!
    password: String!
  }

  input LoginInput {
    username: String!
    password: String!
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    login(input: LoginInput!): User!
  }
`
