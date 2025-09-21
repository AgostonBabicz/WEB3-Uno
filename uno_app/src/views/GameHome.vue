<script setup lang="ts">
import Card from '../components/Card.vue'
import Deck from '../components/Deck.vue'
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

      <!-- Opponent selector -->
      <div class="selector" role="group" aria-label="Bots selector">
        <label class="label">Opponents</label>
        <div class="pill">
          <button class="chip" data-action="dec" aria-label="Decrease">−</button>
          <strong class="count" data-field="botCount">2</strong>
          <button class="chip" data-action="inc" aria-label="Increase">+</button>
        </div>
        <p class="hint">Choose 1–3 bots</p>
      </div>

      <!-- Play -->
      <button class="cta" data-action="play" aria-label="Play">Play</button>
    </section>
  </main>
</template>
<style scoped src="../style/GameHome.css"></style>