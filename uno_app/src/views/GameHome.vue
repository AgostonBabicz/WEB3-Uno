<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../store/authStore'
import { useServerGameStore } from '../../store/serverGameStore'

const router = useRouter()
const auth = useAuthStore()
const serverStore = useServerGameStore()

const botCounter = ref<number>(1)
const cardsPerPlayer = ref<number>(7)
const targetScore = ref<number>(500)
const error = ref<string>('')

const loggedIn = computed(() => !!auth.username)

const increaseBotCounter = (): void => {
  if (botCounter.value < 3) {
    botCounter.value++
    error.value = ''
  } else {
    error.value = 'The maximum number of bots is 3'
  }
}

const decreaseBotCounter = (): void => {
  if (botCounter.value > 1) {
    botCounter.value--
    error.value = ''
  } else {
    error.value = 'The minimum number of bots is 1'
  }
}

const startBotGame = () => {
  if (!loggedIn.value) {
    error.value = 'Please log in first'
    return
  }
  router.push({
    name: 'Game',
    query: {
      botNumber: botCounter.value.toString(),
      playerName: auth.username,
      cardsPerPlayer: cardsPerPlayer.value.toString(),
      targetScore: targetScore.value.toString(),
    },
  })
}

async function startOnline() {
  if (!loggedIn.value || !auth.username) {
    error.value = 'Please log in first'
    return
  }
  error.value = ''
  await serverStore.createLobby({
    meName: auth.username,
    targetScore: targetScore.value,
    cardsPerPlayer: cardsPerPlayer.value,
  })
  router.push({ name: 'GameServer', query: { gameId: serverStore.gameId } })
}
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

      <div v-if="!loggedIn" class="auth-warning">
        <p>You need to log in before playing.</p>
        <button class="cta" @click="router.push({ name: 'Auth' })">Go to Login</button>
      </div>

      <div v-else>
        <div class="selector">
          <label class="label" for="startingCards">Starting Cards</label>
          <input
            id="startingCards"
            class="input"
            type="number"
            min="5"
            max="10"
            v-model.number="cardsPerPlayer"
          />
          <p class="hint">Default is 7 cards</p>
        </div>

        <div class="selector">
          <label class="label" for="targetScore">Target Score</label>
          <input
            id="targetScore"
            class="input"
            type="number"
            min="100"
            max="1000"
            step="50"
            v-model.number="targetScore"
          />
          <p class="hint">Default is 500 points</p>
        </div>

        <div class="selector">
          <label class="label">Opponents (Bot mode)</label>
          <div class="pill">
            <button class="chip" @click="decreaseBotCounter">−</button>
            <strong class="count">{{ botCounter }}</strong>
            <button class="chip" @click="increaseBotCounter">+</button>
          </div>
          <p class="hint">Choose 1–3 bots</p>
          <p class="error">{{ error }}</p>
        </div>

        <div class="selector" style="gap: 0.6rem">
          <button class="cta" @click="startBotGame">Play (Bots)</button>
          <button class="cta" @click="startOnline">Create Online Lobby</button>
          <button class="cta" @click="router.push({ name: 'Lobbies' })">
            Browse Public Lobbies
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped src="../style/GameHome.css"></style>
