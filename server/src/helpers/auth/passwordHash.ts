import bcrypt from 'bcrypt'

export const passwordHash = async (password: string): Promise<string> => {
  const saltRounds = 10
  const hash = await bcrypt.hash(password, saltRounds)
  return hash
}
