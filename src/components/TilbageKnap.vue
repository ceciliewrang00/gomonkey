<script setup>
// Tilbageknap. Går tilbage til den side, man kom fra.
// Er man landet direkte på siden (fx via et link eller en genindlæsning),
// findes der ingen forrige side i appen, så sendes man i stedet til forsiden.
// Knappen har altid stilen button-secondary
import { useRouter } from 'vue-router'

const router = useRouter()

function gaaTilbage() {
  // Vue Router gemmer adressen på den forrige side i history.state.back
  if (window.history.state?.back) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<template>
  <button type="button" class="tilbage-knap button-secondary" @click="gaaTilbage">
    <!-- Teksten kan ændres via slot, fx <TilbageKnap>Til forsiden</TilbageKnap> -->
    <slot>← Tilbage</slot>
  </button>
</template>
