<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps<{
  show: boolean
  title: string
  message: string
  timeoutMs?: number  // auto-hide if next player takes too long
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

let timer: number | null = null

function armTimer() {
  if (!props.timeoutMs) return
  clearTimer()
  timer = window.setTimeout(() => emit('close'), props.timeoutMs)
}
function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

watch(() => props.show, (s) => {
  if (s) armTimer()
  else clearTimer()
})

onBeforeUnmount(clearTimer)
</script>

<template>
  <div v-if="show" class="inline-notice" aria-live="polite" role="status">
    <h2 class="title">{{ title }}</h2>
    <p class="msg">{{ message }}</p>
  </div>
</template>

<style scoped>
.inline-notice {
  width: 100%;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 10px 12px;
  margin: 6px 0 10px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 1);
  backdrop-filter: blur(4px);
  border: 1.5px solid rgba(255,255,255,0.35);
  color: #fff;
  position: absolute;

  z-index: 10 ;
}
.title {
  margin: 0;
  font-weight: 800;
  letter-spacing: 0.02em;
}
.msg {
  margin: 4px 0 0;
  opacity: 0.95;
}
</style>