<script setup>
// Banneret "Skru' op for modet" på forsiden med en knap ned til baneoversigten

import BaseButton from './BaseButton.vue'
</script>

<template>
  <section id="banner">
    <div class="banner__indhold">
      <span class="badge badge--outline banner__kicker">Klar til at slippe jorden?</span>
      <h2>Skru’ op for modet</h2>

      <!-- Fører ned til baneoversigten (#bane-info) -->
      <BaseButton variant="primary" href="#bane-info" class="button-pink banner__knap">Se alle klatrebaner</BaseButton>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/mixins' as m;
@use '@/assets/styles/spacings' as s;

#banner {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  // Sektionen er så høj som indholdet plus luften fra main.scss
  display: flex;
  align-items: center;
  color: c.$primary_light25;

  // Sort baggrund bag billedet, så striben i venstre side bliver sort
  background-color: c.$primary_black100;

  // Billedet ligger i sit eget lag og er skubbet lidt til højre
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -2;
    background: url('@/assets/images/klatrepark.webp') center 35% / cover no-repeat;
    transform: translateX(6%);
    // Billedets venstre kant toner blødt ud i den sorte baggrund
    mask-image: linear-gradient(90deg, transparent 0%, transparent 10%, #000 55%);
  }

  // Mørk gradient over billedet, så teksten kan læses
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: m.billede-gradient();
  }
}

.banner__indhold {
  max-width: 40rem;
}

.banner__kicker {
  margin-bottom: s.$spacing-s;
}

h2 {
  font-size: clamp(2.5rem, 7vw, 5rem);
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -0.02em;
  padding-top: 0;
}

// inline-block, så margin virker på linket
.banner__knap {
  display: inline-block;
  margin-top: s.$spacing-l;
}

</style>
