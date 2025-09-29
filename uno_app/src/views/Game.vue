<script setup lang="ts">
import CardComponent from '../components/CardComponent.vue'
import Deck from '../components/Deck.vue'
import { ref, onMounted } from 'vue'
import { useUnoGame } from '../viewmodel/UseUnoGame'
import type { Color } from '../model/deck'

const props = defineProps<{
  botNumber: number
  targetScore?: number
  cardsPerPlayer?: number
  playerName?: string
}>()

// should it be dynamic (infinite bots)?
const botNames = ['Bot A', 'Bot B', 'Bot C']
const botCount = Math.min(Math.max(props.botNumber, 1), 3) //PTT ¯\_(ツ)_/¯
const bots = botNames.slice(0, botCount)
const me = props.playerName || 'You'
const players = [...bots, me]

// view model
const vm = useUnoGame({
  players,
  targetScore: props.targetScore,
  cardsPerPlayer: props.cardsPerPlayer,
})

// indices
const botIndices = bots.map(n => players.indexOf(n)) // [0,1,2] for 3 bots used whit vm.handOf(index)
const meIx = players.indexOf(me)

// helpers
const myTurn = () => vm.playerInTurn() === meIx
const yourHand = () => vm.handOf(meIx)

// WILD color picker
const showColorPicker = ref<number | null>(null)
const COLORS: Color[] = ['RED', 'YELLOW', 'GREEN', 'BLUE']

function onPlayCard(ix: number) {
  if (!myTurn()) return
  const card = yourHand()[ix]
  if (!card) return
  if (!vm.canPlayAt(ix)) return
  if (card.type === 'WILD' || card.type === 'WILD DRAW') {
    showColorPicker.value = ix
  } else {
    vm.playCard(ix)
    void pumpBots()
  }
}
function pickColor(c: Color) {
  if (showColorPicker.value === null) return
  vm.playCard(showColorPicker.value, c)
  showColorPicker.value = null
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
  // click opponent to accues
  try { vm.accuse(meIx, opIx) } catch {} // accues already catches 
}

// PTT type bot tomfoolery 
// Minimal bot loop: keep taking bot turns until it's your turn or round ends
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
  } finally {
    botsBusy = false
  }
}

//actually kick off the bot loop, PTT is cracked out this was copilot
onMounted(() => { void pumpBots() })
</script>

<!-- Full PTT below-->
<template>
  <main class="play uno-theme" :class="{ waiting: !myTurn() }">
    <div class="bg-swirl"></div>

    <!-- Turn banner -->
    <div class="turn-banner">
      <span v-if="myTurn()">Your turn</span>
      <span v-else>Waiting for {{ players[vm.playerInTurn() ?? 0] }}…</span>
    </div>

    <!-- Opponents -->
    <header class="row opponents">
      <div
        class="opponent"
        v-for="(botName, bi) in bots"
        :key="botName"
        @click="accuseOpponent(botIndices[bi])"
        title="Click to accuse this player"
      >
        <span class="name">{{ botName }}</span>
        <div class="bot-hand">
          <i v-for="i in vm.handCountOf(botIndices[bi])" :key="i" class="bot-card"></i>
        </div>
        <span class="count">{{ vm.handCountOf(botIndices[bi]) }}</span>
      </div>
    </header>

    <!-- Center table: discard + draw -->
    <section class="table">
      <div class="pile discard">
        <CardComponent
          v-if="vm.topDiscard()"
          :type="vm.topDiscard()!.type"
          :color="(
              vm.topDiscard()!.type === 'NUMBERED' ||
              vm.topDiscard()!.type === 'SKIP' ||
              vm.topDiscard()!.type === 'REVERSE' ||
              vm.topDiscard()!.type === 'DRAW'
            )
            ? (vm.topDiscard() as any).color
            : undefined"
          :number="vm.topDiscard()!.type === 'NUMBERED'
            ? (vm.topDiscard() as any).number
            : undefined"
        />
      </div>
      <div class="pile draw" @click="onDraw" title="Draw">
        <Deck size="md" />
        <small class="pile-count">{{ vm.drawPileSize() }}</small>
      </div>
    </section>

    <!-- Your hand -->
    <footer class="hand">
      <span class="name">{{ me }}</span>

      <div class="fan">
        <button
          v-for="(card, ix) in yourHand()"
          :key="ix"
          class="hand-card-btn"
          :disabled="!myTurn() || !vm.canPlayAt(ix)"
          @click="onPlayCard(ix)"
          title="Play"
        >
          <CardComponent
            :type="card.type"
            :color="(
                card.type === 'NUMBERED' ||
                card.type === 'SKIP' ||
                card.type === 'REVERSE' ||
                card.type === 'DRAW'
              )
              ? (card as any).color
              : undefined"
            :number="card.type === 'NUMBERED' ? (card as any).number : undefined"
            class="hand-card"
          />
        </button>
      </div>

      <div class="actions">
        <button class="btn draw" @click="onDraw" :disabled="!myTurn()">Draw</button>
        <button class="btn uno" @click="onUno">UNO!</button>
      </div>
    </footer>

    <!-- WILD color picker -->
    <div v-if="showColorPicker !== null" class="color-picker-backdrop">
      <div class="color-picker">
        <button
          v-for="c in COLORS"
          :key="c"
          class="color-chip"
          :data-color="c.toLowerCase()"
          @click="pickColor(c)"
        >
          {{ c }}
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped src="../style/Game.css"></style>
<style scoped>
.turn-banner { position: absolute; left: 50%; transform: translateX(-50%); top: 12px; font-weight: 800; }
.play.waiting .turn-banner { opacity: .75; }
.hand-card-btn { background: transparent; border: 0; padding: 0; margin: 0 6px; cursor: pointer; }
.hand-card-btn:disabled { cursor: not-allowed; opacity: .6; }
.pile.draw { cursor: pointer; }
.pile-count { display: block; text-align: center; margin-top: 4px; opacity: .8; }
.color-picker-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: grid; place-items: center; }
.color-picker { background: #111; padding: 16px; border-radius: 12px; display: flex; gap: 12px; }
.color-chip { padding: 10px 14px; border-radius: 999px; border: 0; color: #fff; font-weight: 700; cursor: pointer; }
.color-chip[data-color="red"]    { background:#c0392b; }
.color-chip[data-color="yellow"] { background:#f1c40f; color:#222; }
.color-chip[data-color="green"]  { background:#27ae60; }
.color-chip[data-color="blue"]   { background:#2980b9; }
</style>
