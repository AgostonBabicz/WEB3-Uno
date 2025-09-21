<script setup lang="ts">
import Card from '../components/Card.vue'
import Deck from '../components/Deck.vue'
</script>

<template>
    <main class="play uno-theme">
        <div class="bg-swirl"></div>

        <!-- Opponents -->
        <header class="row opponents">
            <div class="opponent">
                <span class="name">Bot A</span>
                <div class="bot-hand" aria-label="7 cards">
                    <i class="bot-card"></i><i class="bot-card"></i><i class="bot-card"></i>
                    <i class="bot-card"></i><i class="bot-card"></i><i class="bot-card"></i>
                    <i class="bot-card"></i>
                </div>
                <span class="count">7</span>
            </div>

            <div class="opponent">
                <span class="name">Bot B</span>
                <div class="bot-hand" aria-label="5 cards">
                    <i class="bot-card"></i><i class="bot-card"></i><i class="bot-card"></i>
                    <i class="bot-card"></i><i class="bot-card"></i>
                </div>
                <span class="count">5</span>
            </div>

            <div class="opponent">
                <span class="name">Bot C</span>
                <div class="bot-hand" aria-label="3 cards">
                    <i class="bot-card"></i><i class="bot-card"></i><i class="bot-card"></i>
                </div>
                <span class="count">3</span>
            </div>
        </header>

        <!-- Center table: discard + draw -->
        <section class="table">
            <div class="pile discard">
                <Card type="NUMBERED" color="GREEN" :number="9" />
            </div>
            <div class="pile draw">
                <Deck size="md" />
            </div>
        </section>

        <!-- Player hand (mock) -->
        <footer class="hand">
            <div class="fan">
                <Card type="NUMBERED" color="RED" :number="5" />
                <Card type="REVERSE" color="BLUE" />
                <Card type="NUMBERED" color="YELLOW" :number="2" />
                <Card type="DRAW" color="GREEN" />
                <Card type="NUMBERED" color="BLUE" :number="9" />
                <Card type="WILD" />
            </div>

            <div class="actions">
                <button class="btn draw" data-action="draw">Draw</button>
                <button class="btn uno" data-action="uno">UNO!</button>
            </div>
        </footer>
    </main>
</template>

<style scoped src="../style/Game.css"></style>