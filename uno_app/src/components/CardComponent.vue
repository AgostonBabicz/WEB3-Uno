<script setup lang="ts">
import { Card, CardNumber, Color, Type } from '@uno/shared/model/deck'

const props = defineProps<{
  type: Type
  color?: Color
  number?: CardNumber
}>()

function numberLabel(n?: CardNumber | string | number): string {
  if (n == null) return ''
  const s = String(n)
  return s.startsWith('N') ? s.slice(1) : s
}
</script>
<template>
  <div class="uno-card" :class="color ? color.toLowerCase() : 'wild'">
    <div class="oval"></div>

    <span class="corner top-left">
      {{
        type === 'NUMBERED'
          ? numberLabel(props.number)
          : type === 'DRAW'
            ? '+2'
            : type === 'WILD_DRAW'
              ? '+4'
              : type === 'REVERSE'
                ? '↺'
                : type === 'SKIP'
                  ? '⦸'
                  : 'WILD'
      }}
    </span>

    <span
      class="main"
      :class="[type !== 'NUMBERED' && type !== 'WILD' && type !== 'WILD_DRAW' ? 'symbol' : '']"
    >
      {{
        type === 'NUMBERED'
          ? numberLabel(props.number)
          : type === 'DRAW'
            ? '+2'
            : type === 'WILD_DRAW'
              ? '+4'
              : type === 'REVERSE'
                ? '↺'
                : type === 'SKIP'
                  ? '⦸'
                  : 'WILD'
      }}
    </span>

    <span class="corner bottom-right">
      {{
        type === 'NUMBERED'
          ? numberLabel(props.number)
          : type === 'DRAW'
            ? '+2'
            : type === 'WILD_DRAW'
              ? '+4'
              : type === 'REVERSE'
                ? '↺'
                : type === 'SKIP'
                  ? '⦸'
                  : 'WILD'
      }}
    </span>
  </div>
</template>

<style scoped src="../style/Card.css"></style>
