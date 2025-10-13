<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../store/authStore'

const router = useRouter()
const auth = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const username = ref(auth.username || '')
const password = ref('')
const showPassword = ref(false)
const error = ref<string | null>(null)
const busy = ref(false)

async function submit() {
  error.value = null
  if (!username.value.trim() || !password.value) {
    error.value = 'Username and password are required'
    return
  }
  busy.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(username.value.trim(), password.value)
    } else {
      await auth.register(username.value.trim(), password.value)
    }
    router.push({ name: 'Home' })
  } catch (e: any) {
    error.value = e?.message ?? 'Authentication failed'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="auth-page uno-theme">
    <div class="bg-swirl"></div>

    <section class="auth-card">
      <div class="brand small">
        <div class="ring"></div>
        <div class="oval"></div>
        <div class="word">UNO</div>
      </div>

      <div class="auth-tabs" role="tablist" aria-label="Auth mode">
        <button
          class="auth-tab"
          :class="{ active: mode === 'login' }"
          @click="mode = 'login'"
          role="tab"
          :aria-selected="mode === 'login'"
        >
          Login
        </button>

        <button
          class="auth-tab"
          :class="{ active: mode === 'register' }"
          @click="mode = 'register'"
          role="tab"
          :aria-selected="mode === 'register'"
        >
          Register
        </button>
      </div>

      <form class="auth-form" @submit.prevent="submit">
        <div class="selector">
          <label class="label" for="username">Username</label>
          <input
            id="username"
            class="input"
            type="text"
            v-model.trim="username"
            placeholder="Your username"
            autocomplete="username"
          />
        </div>

        <div class="selector">
          <label class="label" for="password">Password</label>
          <div class="password-row">
            <input
              id="password"
              class="input"
              :type="showPassword ? 'text' : 'password'"
              v-model="password"
              placeholder="••••••••"
              autocomplete="current-password"
            />
            <button
              class="btn icon"
              type="button"
              @click="showPassword = !showPassword"
              :aria-pressed="showPassword"
              aria-label="Toggle password visibility"
            >
              {{ showPassword ? 'Hide' : 'Show' }}
            </button>
          </div>
        </div>

        <p class="error" v-if="error">{{ error }}</p>

        <button class="cta wide" :disabled="busy" type="submit">
          {{ busy ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account' }}
        </button>

        <p class="auth-hint">
          {{ mode === 'login' ? "Don't have an account?" : 'Already have an account?' }}
          <button
            class="link"
            type="button"
            @click="mode = mode === 'login' ? 'register' : 'login'"
          >
            {{ mode === 'login' ? 'Register' : 'Login' }}
          </button>
        </p>
      </form>
    </section>
  </main>
</template>

<style scoped src="../style/Auth.css"></style>
