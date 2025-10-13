export interface CreateUserInput {
  username: string
  password: string
}

export interface AuthenticateUserInput {
  username: string
  password: string
}

export interface GetUserInput {
  id: string
}
