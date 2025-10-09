<script setup lang="ts">
defineProps<{ size?: 'sm' | 'md' | 'lg' }>()
</script>

<template>
  <div class="uno-deck" :class="size ?? 'md'">
    <!-- stacked back cards -->
    <div class="card back layer-3"></div>
    <div class="card back layer-2"></div>
    <div class="card back layer-1"></div>

    <!-- top card with UNO logo/oval -->
    <div class="card back top">
      <div class="oval"></div>
      <div class="uno-mark">UNO</div>
    </div>
  </div>
</template>

<style scoped src="../style/Deck.css"></style>
