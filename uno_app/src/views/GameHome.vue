<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const botCounter = ref<number>(1)
const playerName = ref<string>("")
const cardsPerPlayer = ref<number>(7)
const targetScore = ref<number>(500)
const error = ref<string>("")

const increaseBotCounter = (): void => {
  if(botCounter.value<3){
    botCounter.value++
    error.value=""
  }else{
    error.value = "The maximum number of bots is 3"
  }
}
const decreaseBotCounter = (): void => {
  if(botCounter.value>1){
    botCounter.value--
    error.value=""
  }else{
     error.value = "The minimum number of bots is 1"
  }  
}

const startGame = () => {
  if (!error.value) {
    router.push({
      name: 'Game',
      query: {
        botNumber: botCounter.value.toString(),
        playerName: playerName.value,
        cardsPerPlayer: cardsPerPlayer.value.toString(),
        targetScore: targetScore.value.toString(),
      }
    })
  }
}
</script>


<template>
  <main class="home uno-theme">
    <div class="bg-swirl"></div>

    <section class="center">
      <!-- Brand -->
      <div class="brand">
        <div class="ring"></div>
        <div class="oval"></div>
        <div class="word">UNO</div>
      </div>
      <!-- Player name -->
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
      <!-- Opponent selector -->
      <div class="selector" role="group" aria-label="Bots selector">
        <label class="label">Opponents</label>
        <div class="pill">
          <button class="chip" data-action="dec" aria-label="Decrease" v-on:click="decreaseBotCounter">−</button>
          <strong class="count" data-field="botCount">{{ botCounter }}</strong>
          <button class="chip" data-action="inc" aria-label="Increase" v-on:click="increaseBotCounter">+</button>
        </div>
        <p class="hint">Choose 1–3 bots</p>
        <p class="error">{{ error }}</p>
      </div>

      <!-- Starting cards -->
      <div class="selector">
        <label class="label" for="startingCards">Starting Cards</label>
        <input
          id="startingCards"
          class="input"
          type="number"
          min="5"
          max="10"
          v-model="cardsPerPlayer"
        />
        <p class="hint">Default is 7 cards</p>
      </div>

      <!-- Target score -->
      <div class="selector">
        <label class="label" for="targetScore">Target Score</label>
        <input
          id="targetScore"
          class="input"
          type="number"
          min="100"
          max="1000"
          step="50"
          v-model="targetScore"
        />
        <p class="hint">Default is 500 points</p>
      </div>

      <!-- Play -->
      <button class="cta" data-action="play" aria-label="Play" @click="startGame">Play</button>
    </section>
  </main>
</template>
<style scoped src="../style/GameHome.css"></style>