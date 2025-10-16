<script setup lang="ts">
const props = defineProps<{
    show: boolean
    title: string
    message: string
}>()

const emit = defineEmits(['close'])
</script>

<template>
    <div v-if="show" class="pop-up-message-backdrop" role="dialog" aria-modal="true" @click.self="emit('close')">
        <div class="pop-up-message" aria-live="polite">
            <button class="close-btn" @click="emit('close')" aria-label="Close popup">
                ×
            </button>
            <h2>{{ title }}</h2>
            <p>{{ message }}</p>
        </div>
    </div>
</template>

<style scoped>
/* Backdrop */
.pop-up-message-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: grid;
    place-items: center;
    padding: 16px;
    z-index: 9999;
}

/* Card */
.pop-up-message {
    width: min(720px, 92vw);
    max-height: 80vh;
    overflow: auto;
    background: #fff;
    color: #111;
    border-radius: 14px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    padding: 20px 22px;
    line-height: 1.4;
}

/* Title & text */
.pop-up-message h2 {
    margin: 0 0 8px 0;
    font-size: clamp(18px, 2.4vw, 22px);
    font-weight: 700;
}

.pop-up-message p {
    margin: 0;
    font-size: clamp(14px, 2vw, 16px);
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
}

.pop-up-message-backdrop {
    animation: fadeIn 0.15s ease-out;
}

.pop-up-message {
    animation: popIn 0.18s ease-out;
}
/* Close button */
.close-btn {
  position: absolute;
  top: 10px;
  right: 12px;
  background: transparent;
  border: none;
  font-size: 1.6rem;
  cursor: pointer;
  color: inherit;
}
</style>