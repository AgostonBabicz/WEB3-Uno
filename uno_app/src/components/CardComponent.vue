<script setup lang="ts">
import { CardNumber, Color, Type } from '../model/deck';

const props = defineProps<{
    type: Type
    color?:Color
    number?:CardNumber
}>()
</script>


<template>
  <div class="uno-card" :class="color ? color.toLowerCase() : 'wild'">
    <div class="oval"></div>

    <span class="corner top-left">
      {{
        type === 'NUMBERED' ? number
        : type === 'DRAW' ? '+2'
        : type === 'WILD DRAW' ? '+4'
        : type === 'REVERSE' ? '↺'
        : type === 'SKIP' ? '⦸'
        : 'WILD'
      }}
    </span>

    <span class="main"
      :class="[
        type !== 'NUMBERED' && type !== 'WILD' && type !== 'WILD DRAW' ? 'symbol' : '',
      ]"
    >
      {{
        type === 'NUMBERED' ? number
        : type === 'DRAW' ? '+2'
        : type === 'WILD DRAW' ? '+4'
        : type === 'REVERSE' ? '↺'
        : type === 'SKIP' ? '⦸'
        : 'WILD'
      }}
    </span>

    <span class="corner bottom-right">
      {{
        type === 'NUMBERED' ? number
        : type === 'DRAW' ? '+2'
        : type === 'WILD DRAW' ? '+4'
        : type === 'REVERSE' ? '↺'
        : type === 'SKIP' ? '⦸'
        : 'WILD'
      }}
    </span>
  </div>
</template>

<style scoped src="../style/Card.css"></style>