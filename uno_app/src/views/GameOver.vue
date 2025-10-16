<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  winner: string
}>()

const router = useRouter()

function goHome() {
  router.push('/home')
}

let confettiCanvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let confetti: { x: number; y: number; r: number; c: string; s: number }[] = []
let anim: number

function initConfetti() {
  if (!confettiCanvas) return
  confettiCanvas.width = window.innerWidth
  confettiCanvas.height = window.innerHeight
  confetti = Array.from({ length: 150 }, () => ({
    x: Math.random() * confettiCanvas!.width,
    y: Math.random() * confettiCanvas!.height - confettiCanvas!.height,
    r: Math.random() * 6 + 4,
    c: ['#e11d2e', '#2563eb', '#16a34a', '#facc15'][Math.floor(Math.random() * 4)],
    s: Math.random() * 2 + 1,
  }))
}

function drawConfetti() {
  if (!ctx || !confettiCanvas) return
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height)
  confetti.forEach((p) => {
    if (!ctx) return
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fillStyle = p.c
    ctx.fill()
  })
  updateConfetti()
  anim = requestAnimationFrame(drawConfetti)
}

function updateConfetti() {
  if (!confettiCanvas) return
  confetti.forEach((p) => {
    p.y += p.s
    if (confettiCanvas && p.y > confettiCanvas.height) {
      p.y = -10
      p.x = Math.random() * confettiCanvas.width
      p.s = Math.random() * 2 + 1
    }
  })
}

onMounted(() => {
  confettiCanvas = document.getElementById('confetti') as HTMLCanvasElement
  ctx = confettiCanvas.getContext('2d')
  initConfetti()
  drawConfetti()
  window.addEventListener('resize', initConfetti)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(anim)
  window.removeEventListener('resize', initConfetti)
})
</script>

<template>
  <main class="game-over uno-theme">
    <div class="bg-swirl"></div>
    <!-- Confetti layer -->
    <canvas id="confetti"></canvas>
    <section class="game-over-card">
      <h1>🎉 Game Over 🎉</h1>
      <p class="winner">
        Winner: <strong>{{ props.winner }}</strong>
      </p>
      <button class="btn home-btn" @click="goHome">Back to Home</button>
    </section>
  </main>
</template>

<style scoped src="../style/GameOver.css"></style>
