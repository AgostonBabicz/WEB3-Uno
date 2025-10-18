<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import CardComponent from '../components/CardComponent.vue'
import Deck from '../components/Deck.vue'
import type { Color } from '@uno/shared/model/deck'
import { useServerGameStore } from '../../store/serverGameStore'
import PopUpMessage from '@/components/PopUpMessage.vue'

const route = useRoute()
const store = useServerGameStore()
const showColorPicker = ref<number | null>(null)

const players = computed(() => store.game?.players ?? [])
const meIx = computed(() => store.meIndex ?? 0)
const currentTurn = computed(() => store.playerInTurn)

const roundStarted = computed(() => !!store.game?.currentRound)
const enoughPlayers = computed(() => players.value.length >= 2)
const myTurn = computed(() => roundStarted.value && store.isMyTurn) // cannot be my turn if no round
const yourHand = computed(() => store.myHand)

async function onPlayCard(ix: number) {
  if (!myTurn.value) return
  const card = yourHand.value[ix]
  if (!card) return
  if (!store.canPlayAt(ix)) return
  if (card.type === 'WILD' || card.type === 'WILD_DRAW') {
    showColorPicker.value = ix
  } else {
    await store.playCard(ix)
  }
}
async function pickColor(c: Color) {
  if (showColorPicker.value === null) return
  await store.playCard(showColorPicker.value, c)
  showColorPicker.value = null
}
async function onDraw() {
  if (!myTurn.value) return
  await store.draw()
}
async function onUno() {
  await store.sayUno()
}
async function accuseOpponent(opIx: number) {
  await store.accuse(opIx)
}

async function onStartRound() {
  await store.startRound()
}

onMounted(async () => {
  const id = (route.query.gameId as string) || ''
  if (id) {
    // ensure the store knows which game we're viewing and subscribe to events
    if (store.gameId !== id) store.gameId = id
    await store.subscribeAll().catch(() => {})
    await store.refreshMyHand().catch(() => {})
  }
})
</script>

<template>
  <main class="play uno-theme" :class="{ waiting: !myTurn }">
    <div class="target-score">Target: {{ store.game?.targetScore ?? 500 }}</div>
    <div class="bg-swirl"></div>

    <div class="turn-banner">
      <template v-if="!roundStarted">
        <span v-if="!enoughPlayers">Waiting for players… ({{ players.length }}/4)</span>
      </template>
      <template v-else>
        <span v-if="myTurn">Your turn</span>
        <span v-else>Waiting for {{ players[currentTurn ?? 0]?.name }}…</span>
      </template>
    </div>

    <button
      v-if="!roundStarted"
      class="start-round-btn"
      :disabled="!enoughPlayers"
      @click="onStartRound"
    >
      Start Round
    </button>

    <header class="row opponents">
      <div
        v-for="(p, ix) in players.filter((_: any, i: any) => i !== meIx)"
        :key="p.id"
        class="opponent"
        :class="{ playing: currentTurn === players.indexOf(p) }"
        @click="accuseOpponent(players.indexOf(p))"
        title="Click to accuse this player"
      >
        <div class="column">
          <span class="name">{{ p.name }}</span>
          <span class="score">(Score: {{ p.score }})</span>
        </div>

        <div class="bot-hand">
          <i v-for="i in p.handCount" :key="i" class="bot-card"></i>
        </div>
        <span class="count">{{ p.handCount }}</span>
      </div>
    </header>
    <PopUpMessage
      :show="!!store.showPopUpMessage"
      :title="store.popUpTitle || ''"
      :message="store.popUpMessage || ''"
      :timeoutMs="6000"
      @close="store.clearMessage()"
    />
    <section class="table">
      <div class="pile discard">
        <CardComponent
          v-if="store.game?.currentRound?.discardTop"
          :type="store.game.currentRound.discardTop.type"
          :color="store.game.currentRound.discardTop.color"
          :number="store.game.currentRound.discardTop.number"
        />
      </div>
      <div class="pile draw" @click="onDraw" title="Draw">
        <Deck size="md" v-if="roundStarted" />
        <small class="pile-count" v-if="roundStarted">{{ store.game?.currentRound?.drawPileSize ?? 0 }}</small>
      </div>
    </section>

    <footer class="hand" :class="{ playing: myTurn }">
      <div class="column">
        <span class="name">{{ players[meIx]?.name }}</span>
        <span class="score">(Score: {{ players[meIx]?.score ?? 0 }})</span>
      </div>
      <div class="fan">
        <button
          v-for="(card, ix) in yourHand"
          :key="ix"
          class="hand-card-btn"
          :disabled="!myTurn || !store.canPlayAt(ix)"
          @click="onPlayCard(ix)"
          title="Play"
        >
          <CardComponent
            :type="card.type"
            :color="card.color"
            :number="card.number"
            class="hand-card"
          />
        </button>
      </div>

      <div class="actions">
        <button class="btn draw" @click="onDraw" :disabled="!myTurn">Draw</button>
        <button class="btn uno" @click="onUno" :disabled="!roundStarted">UNO!</button>
      </div>
    </footer>

    <div v-if="showColorPicker !== null" class="color-picker-backdrop">
      <div class="color-picker">
        <button
          v-for="c in ['RED', 'YELLOW', 'GREEN', 'BLUE']"
          :key="c"
          class="color-chip"
          :data-color="c.toLowerCase()"
          @click="pickColor(c as any)"
        >
          {{ c }}
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped src="../style/Game.css"></style>
