import { UUIDResolver } from 'graphql-scalars'
import { AuthenticateUserInput, CreateUserInput } from '../../inputs/userInputs'
import { UserRepository } from '../../repository/userRepository'
import { passwordHash } from '../../helpers/auth/passwordHash'

export const userResolver = {
  UUID: UUIDResolver,
  Mutation: {
    createUser: async (_: any, { input }: { input: CreateUserInput }) => {
      const u = new UserRepository({})
      const hashed = await passwordHash(input.password)
      return u.create({ username: input.username, password: hashed })
    },
    login: async (_: any, { input }: { input: AuthenticateUserInput }) => {
      const u = new UserRepository({})
      return u.authenticate(input)
    },
  },
}
