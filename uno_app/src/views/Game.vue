<script setup lang="ts">
import CardComponent from '../components/CardComponent.vue'
import Deck from '../components/Deck.vue'
import { ref, onMounted, computed } from 'vue'
import { nextTick } from 'vue'
import router from '../router'
import { useUnoGameStore } from '../../store/unoGameStore'
import { storeToRefs } from 'pinia'
import { Color } from '@uno/shared/model/deck'
import PopUpBox from '../components/PopUpBox.vue'

const props = defineProps<{
  botNumber: number
  targetScore?: number
  cardsPerPlayer?: number
  playerName?: string
}>()

const botNames = ['Bot A', 'Bot B', 'Bot C']
const botCount = Math.min(Math.max(props.botNumber, 1), 3)
const bots = botNames.slice(0, botCount)
const me = props.playerName || 'You'
const players = [...bots, me]

// Pinia store
const vm = useUnoGameStore()
vm.init({ players, targetScore: props.targetScore, cardsPerPlayer: props.cardsPerPlayer })

const { setMessage, clearMessage } = vm
const { showPopUpMessage, popUpMessage, popUpTitle } = storeToRefs(vm)

const botIndices = bots.map((n) => players.indexOf(n))
const meIx = players.indexOf(me)

// helpers
const myTurn = () => vm.playerInTurn() === meIx
const yourHand = () => vm.handOf(meIx)

const currentTurn = computed(() => vm.playerInTurn())

const showColorPicker = ref<number | null>(null)
const COLORS: Color[] = ['RED', 'YELLOW', 'GREEN', 'BLUE']

async function checkEnd() {
  await nextTick()
  if (vm.isGameOver()) {
    const w = vm.gameWinner()
    if (w !== undefined) {
      router.push({ name: 'GameOver', query: { winner: players[w] } })
    }
    return
  }
  if (vm.hasEnded()) {
    const w = vm.winner()
    if (w !== undefined) setMessage('Round over', `${players[w]} wins the round!`)
  }
}

async function onPlayCard(ix: number) {
  if (!myTurn()) return
  const card = yourHand()[ix]
  if (!card) return
  if (!vm.canPlayAt(ix)) return
  if (card.type === 'WILD' || card.type === 'WILD_DRAW') {
    showColorPicker.value = ix
  } else {
    vm.playCard(ix)
    await checkEnd()
    void pumpBots()
  }
}
async function pickColor(c: Color) {
  if (showColorPicker.value === null) return
  vm.playCard(showColorPicker.value, c)
  showColorPicker.value = null
  await checkEnd()
  void pumpBots()
}

function onDraw() {
  if (!myTurn()) return
  vm.draw()
  void pumpBots()
}
function onUno() {
  vm.sayUno(meIx)
}
function accuseOpponent(opIx: number) {
  try {
    vm.accuse(meIx, opIx)
  } catch { }
}

// bot loop keep taking bot turns until it s my turn or round ends
let botsBusy = false
async function pumpBots() {
  if (botsBusy) return
  botsBusy = true
  try {
    while (!vm.hasEnded()) {
      const t = vm.playerInTurn()
      if (t === undefined || t === meIx) break
      const acted = await vm.botTakeTurn()
      if (!acted) break
    }
    await checkEnd()
  } finally {
    botsBusy = false
  }
}

onMounted(() => {
  void pumpBots()
})
</script>
<template>
  <main class="play uno-theme" :class="{ waiting: !myTurn() }">
    <div class="target-score">Target: {{ props.targetScore ?? 500 }}</div>
    <div class="bg-swirl"></div>

    <div class="turn-banner">
      <span v-if="myTurn()">Your turn</span>
      <span v-else>Waiting for {{ players[currentTurn ?? 0] }}…</span>
    </div>

    <header class="row opponents">
      <div v-for="(botName, bi) in bots" :key="botName" class="opponent"
        :class="{ playing: currentTurn === botIndices[bi] }" @click="accuseOpponent(botIndices[bi])"
        title="Click to accuse this player">
        <div class="column">
          <span class="name">{{ botName }}</span>
          <span class="score">(Score: {{ vm.scoreOf(botIndices[bi]) }})</span>
        </div>

        <div class="bot-hand">
          <i v-for="i in vm.handCountOf(botIndices[bi])" :key="i" class="bot-card"></i>
        </div>
        <span class="count">{{ vm.handCountOf(botIndices[bi]) }}</span>
      </div>
    </header>

    <section class="table">
      <div class="pile discard">
        <CardComponent v-if="vm.topDiscard()" :type="vm.topDiscard()!.type" :color="vm.topDiscard()!.type === 'NUMBERED' ||
            vm.topDiscard()!.type === 'SKIP' ||
            vm.topDiscard()!.type === 'REVERSE' ||
            vm.topDiscard()!.type === 'DRAW'
            ? (vm.topDiscard() as any).color
            : undefined
          " :number="vm.topDiscard()!.type === 'NUMBERED' ? (vm.topDiscard() as any).number : undefined
            " />
      </div>
      <div class="pile draw" @click="onDraw" title="Draw">
        <Deck size="md" />
        <small class="pile-count">{{ vm.drawPileSize() }}</small>
      </div>
    </section>

    <footer class="hand" :class="{ playing: myTurn() }">
      <div class="column">
        <span class="name">{{ players[meIx] }}</span>
        <span class="score">(Score: {{ vm.scoreOf(meIx) }})</span>
      </div>
      <div class="fan">
        <button v-for="(card, ix) in yourHand()" :key="ix" class="hand-card-btn"
          :disabled="!myTurn() || !vm.canPlayAt(ix)" @click="onPlayCard(ix)" title="Play">
          <CardComponent :type="card.type" :color="card.type === 'NUMBERED' ||
              card.type === 'SKIP' ||
              card.type === 'REVERSE' ||
              card.type === 'DRAW'
              ? (card as any).color
              : undefined
            " :number="card.type === 'NUMBERED' ? (card as any).number : undefined" class="hand-card" />
        </button>
      </div>

      <div class="actions">
        <button class="btn draw" @click="onDraw" :disabled="!myTurn()">Draw</button>
        <button class="btn uno" @click="onUno">UNO!</button>
      </div>
    </footer>

    <div v-if="showColorPicker !== null" class="color-picker-backdrop">
      <div class="color-picker">
        <button v-for="c in COLORS" :key="c" class="color-chip" :data-color="c.toLowerCase()" @click="pickColor(c)">
          {{ c }}
        </button>
      </div>
    </div>

    <PopUpBox :show="!!showPopUpMessage" :title="popUpTitle || ''" :message="popUpMessage || ''"
      @close="clearMessage()" />
  </main>
</template>

<style scoped src="../style/Game.css"></style>
