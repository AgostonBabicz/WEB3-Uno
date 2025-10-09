<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useServerGameStore } from '../../store/serverGameStore'

const router = useRouter()
const serverStore = useServerGameStore()

const botCounter = ref<number>(1)
const playerName = ref<string>('')
const cardsPerPlayer = ref<number>(7)
const targetScore = ref<number>(500)
const error = ref<string>('')

const increaseBotCounter = () => {
  if (botCounter.value < 3) {
    botCounter.value++
    error.value = ''
  } else {
    error.value = 'The maximum number of bots is 3'
  }
}
const decreaseBotCounter = () => {
  if (botCounter.value > 1) {
    botCounter.value--
    error.value = ''
  } else {
    error.value = 'The minimum number of bots is 1'
  }
}

const startGame = () => {
  if (error.value) return
  router.push({
    name: 'Game',
    query: {
      botNumber: botCounter.value.toString(),
      playerName: playerName.value,
      cardsPerPlayer: cardsPerPlayer.value.toString(),
      targetScore: targetScore.value.toString(),
    },
  })
}

async function startOnline() {
  if (!playerName.value.trim()) {
    error.value = 'Enter your name'
    return
  }
  error.value = ''
  await serverStore.createLobby({
    meName: playerName.value.trim(),
    targetScore: targetScore.value,
    cardsPerPlayer: cardsPerPlayer.value,
  })
  router.push({ name: 'GameServer', query: { gameId: serverStore.gameId } })
}

let poll: number | null = null
onMounted(async () => {
  await serverStore.loadWaitingGames()
  poll = window.setInterval(serverStore.loadWaitingGames, 2000)
})
onBeforeUnmount(() => {
  if (poll) clearInterval(poll)
})

async function joinLobby(gameId: string) {
  if (!playerName.value.trim()) {
    error.value = 'Enter your name'
    return
  }
  await serverStore.joinLobby(gameId, playerName.value.trim())
  router.push({ name: 'GameServer', query: { gameId } })
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

      <div class="selector">
        <label class="label" for="playerName">Your Name</label>
        <input
          id="playerName"
          class="input"
          type="text"
          v-model="playerName"
          placeholder="Enter your name"
        />
      </div>

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

      <div class="selector" role="group" aria-label="Bots selector">
        <label class="label">Opponents (Bot mode)</label>
        <div class="pill">
          <button class="chip" aria-label="Decrease" @click="decreaseBotCounter">−</button>
          <strong class="count">{{ botCounter }}</strong>
          <button class="chip" aria-label="Increase" @click="increaseBotCounter">+</button>
        </div>
        <p class="hint">Choose 1–3 bots</p>
        <p class="error">{{ error }}</p>
      </div>

      <div class="selector" style="gap: 0.6rem">
        <button class="cta" @click="startGame">Play (Bots)</button>
        <button class="cta" @click="startOnline">Create Online Lobby</button>
      </div>

      <div class="selector" v-if="serverStore.waitingGames.length">
        <label class="label">Waiting Lobbies</label>
        <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem">
          <li
            v-for="g in serverStore.waitingGames"
            :key="g.id"
            style="display: flex; gap: 0.6rem; align-items: center; justify-content: center"
          >
            <code
              style="background: rgba(0, 0, 0, 0.35); padding: 0.25rem 0.5rem; border-radius: 6px"
              >{{ g.id }}</code
            >
            <span>Players: {{ g.players.length }}/4</span>
            <button class="btn" @click="joinLobby(g.id)">Join</button>
          </li>
        </ul>
      </div>
    </section>
  </main>
</template>

<style scoped src="../style/GameHome.css"></style>
