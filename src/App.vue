<script setup>
// APP – rodkomponenten (startes fra main.js)
// Den indeholder kun RouterView. RouterView er en "plads", hvor routeren sætter
// den side ind, der passer til adressen (fx HomeView på / og KortView på /kort).
// Skifter man side, bliver kun indholdet i RouterView skiftet ud – resten af appen bliver.
import { RouterView } from 'vue-router'
</script>

<template>
  <!-- Her vises den aktuelle side (se router/index.js) -->
  <RouterView />
</template>
