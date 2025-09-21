<script setup lang="ts">
import CardComponent from '../components/CardComponent.vue'
import Deck from '../components/Deck.vue'
import { ref } from 'vue'
import { Game } from '../model/uno';
import { Card } from '../model/deck';
import { Shuffler, standardRandomizer, standardShuffler } from '../utils/random_utils';


const props = defineProps<{
    botNumber: number
    targetScore?: number
    shuffler?: Shuffler<Card>
    randomizer?: (bound: number) => number
    cardsPerPlayer?: number
    playerName?: string
}>()

let bots = ref<Array<string>>()
const botNames: string[] = ["Bot A", "Bot B", "Bot C"]
for (let i = 0; i < props.botNumber; i++) {
    bots.value?.push(botNames[i])
}
const players = bots.value
const playerName = props.playerName
players?.push(playerName!)
const targetScore = props.targetScore ?? 500
const cardsPerPlayer = props.cardsPerPlayer ?? 7
const shuffler = props.shuffler ?? standardShuffler
const randomizer = props.randomizer ?? standardRandomizer


const game = ref(new Game(players!, targetScore, randomizer, shuffler, cardsPerPlayer))
</script>

<template>
    <main class="play uno-theme">
        <div class="bg-swirl"></div>

        <!-- Opponents -->
        <header class="row opponents">
            <div class="opponent" v-for="botName in botNames">
                <span class="name">{{ botName }}</span>
                <div class="bot-hand">
                    <i v-for="(_, i) in game.currentRound()?.playerHand(players?.indexOf(botName) ?? 0) ?? []" :key="i" class="bot-card" ></i>
                </div>
                <span class="count">
                    {{ game.currentRound()?.playerHand(players?.indexOf(botName) ?? 0)?.length ?? 0 }}
                </span>
            </div>
        </header>

        <!-- Center table: discard + draw -->
        <section class="table">
            <div class="pile discard">
                <CardComponent type="NUMBERED" color="GREEN" :number="9" />
            </div>
            <div class="pile draw">
                <Deck size="md" />
            </div>
        </section>

        <!-- Player hand (mock) -->
        <footer class="hand">
            <span class="name">{{ playerName }}</span>
            <div class="fan">
                <CardComponent
                    v-for="card in game.currentRound()?.playerHand(players?.indexOf(playerName!) ?? 0) ?? []" :key="`${card.type}`"
                    :type="card.type"
                    :color="('color' in card && (card.type === 'NUMBERED' || card.type === 'SKIP' || card.type === 'REVERSE' || card.type === 'DRAW')) ? card.color : undefined"
                    :number="('number' in card && card.type === 'NUMBERED') ? card.number : undefined"
                />
            </div>

            <div class="actions">
                <button class="btn draw" data-action="draw">Draw</button>
                <button class="btn uno" data-action="uno">UNO!</button>
            </div>
        </footer>
    </main>
</template>

<style scoped src="../style/Game.css"></style>