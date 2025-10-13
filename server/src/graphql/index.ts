import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge'
import { gameResolver } from './resolvers/gameResolver'
import { gameSchema } from './schema/gameSchema'
import { userSchema } from './schema/userSchema'
import { userResolver } from './resolvers/userResolver'

export const typeDefs = mergeTypeDefs([gameSchema, userSchema])
export const resolvers = mergeResolvers([gameResolver, userResolver])
