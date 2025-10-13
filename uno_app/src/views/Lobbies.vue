<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../store/authStore'
import { useServerGameStore } from '../../store/serverGameStore'

const router = useRouter()
const auth = useAuthStore()
const store = useServerGameStore()

const loading = ref(false)
const error = ref<string | null>(null)

const lobbies = computed(() => store.waitingGames ?? [])

async function refresh() {
  loading.value = true
  error.value = null
  try {
    await store.loadWaitingGames()
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load lobbies'
  } finally {
    loading.value = false
  }
}

async function join(gameId: string) {
  if (!auth.username) {
    error.value = 'Please log in first'
    return
  }
  try {
    await store.joinLobby(gameId, auth.username)
    router.push({ name: 'GameServer', query: { gameId } })
  } catch (e: any) {
    error.value = e?.message ?? 'Join failed'
  }
}

onMounted(refresh)
</script>

<template>
  <main class="home uno-theme">
    <div class="bg-swirl"></div>

    <section class="center">
      <div class="brand">
        <div class="ring"></div>
        <div class="oval"></div>
        <div class="word">UNO</div>
      </div>

      <div class="selector" style="gap: 0.6rem">
        <button class="cta" @click="refresh" :disabled="loading">
          {{ loading ? 'Refreshing…' : 'Refresh' }}
        </button>
        <button class="cta" @click="router.push({ name: 'Home' })">Back</button>
      </div>

      <p class="error" v-if="error">{{ error }}</p>

      <div v-if="!loading && lobbies.length === 0" class="selector">
        <p class="hint">No public lobbies available right now.</p>
      </div>

      <ul v-else class="selector" style="width: 100%; max-width: 640px; gap: 0.8rem">
        <li
          v-for="g in lobbies"
          :key="g.id"
          class="pill"
          style="width: 100%; justify-content: space-between"
        >
          <div style="display: flex; gap: 12px; align-items: center">
            <code>{{ g.id }}</code>
            <span>Players: {{ g.players?.length ?? 0 }}/4</span>
            <span v-if="g.targetScore" class="hint">Target: {{ g.targetScore }}</span>
          </div>
          <button class="chip" @click="join(g.id)">Join</button>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped src="../style/GameHome.css"></style>
