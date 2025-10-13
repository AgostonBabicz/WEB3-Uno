import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apollo } from '../src/apollo'
import { LOGIN, REGISTER } from '../src/graphql/ops_auth'

export const useAuthStore = defineStore('auth', () => {
  const id = ref<string | null>(localStorage.getItem('userId'))
  const username = ref<string>(localStorage.getItem('username') || '')

  const isAuthed = computed(() => !!id.value)

  async function login(u: string, p: string) {
    const { data } = await apollo.mutate({
      mutation: LOGIN,
      variables: { input: { username: u, password: p } },
    })
    const user = data?.login
    if (!user) throw new Error('Login failed')

    id.value = user.id
    username.value = user.username
    localStorage.setItem('userId', user.id)
    localStorage.setItem('username', user.username)
  }

  async function register(u: string, p: string) {
    const { data } = await apollo.mutate({
      mutation: REGISTER,
      variables: { input: { username: u, password: p } },
    })
    const user = data?.createUser
    if (!user) throw new Error('Register failed')

    id.value = user.id
    username.value = user.username
    localStorage.setItem('userId', user.id)
    localStorage.setItem('username', user.username)
  }

  function logout() {
    id.value = null
    username.value = ''
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
  }

  return { id, username, isAuthed, login, register, logout }
})
