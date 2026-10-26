<script setup>
// Henter TrackBadge, så vi kan bruge den i template
import TrackBadge from './TrackBadge.vue'

// ref = en værdi som Vue holder øje med. onMounted = kører, når siden er vist
import { ref, onMounted } from 'vue'

// Adressen til databasen (API'et)
const URL = 'https://gomonkey-baner-default-rtdb.europe-west1.firebasedatabase.app/baner.json'

// Tom liste til banerne. Siden opdateres, når listen får data
const baner = ref([])

// Når siden er vist: hent data fra databasen
onMounted(async () => {
  // API-kald: spørger databasen om banerne
  const res = await fetch(URL)

  // Laver svaret om til noget JavaScript kan bruge
  const data = await res.json()

  // Firebase giver et objekt. Vi laver det til en liste og gemmer navnet (fx "grøn1") som id
  baner.value = Object.entries(data).map(([id, bane]) => ({ id, ...bane }))
})
</script>

<template>
  <div>
    <!-- Ét kort pr. bane (v-for gentager article) -->
    <article v-for="bane in baner" :key="bane.id">
      <h2>{{ bane.name }}</h2>

      <!-- Sender farve og nummer videre til TrackBadge -->
      <TrackBadge :color="bane.color" :number="bane.number" />

      <p>{{ bane.description }}</p>

      <ul>
        <!-- v-if = vis kun linjen, hvis banen har den information -->
        <li v-if="bane.requirements">Krav: {{ bane.requirements }}</li>
        <li v-if="bane.trackHeight">Banehøjde: {{ bane.trackHeight }}</li>
        <li v-if="bane.obstacles">Forhindringer: {{ bane.obstacles }}</li>
        <li v-if="bane.longestGlide">Længste svæv: {{ bane.longestGlide }}</li>
        <li v-if="bane.glideAmount">Antal svæv: {{ bane.glideAmount }}</li>
        <li v-if="bane.trackLength">Banelængde: {{ bane.trackLength }}</li>
      </ul>

      <p>Sværhedsgrad: {{ bane.difficulty }}</p>
    </article>
  </div>
</template>