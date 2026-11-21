<script setup>
// Sidehovedet med logo, menu og "BOOK"-knap. Det bliver i toppen, når man scroller.
// På mobil åbner og lukker burgerknappen menuen

import { ref } from 'vue'

import BaseButton from './BaseButton.vue'

// Link til booking
import { BOOK_URL } from '@/services/api.js'

// false = menuen er lukket, true = menuen er åben
const isOpen = ref(false)
</script>

<template>
  <header>
      <a href="#" class="logo-link">
        <img src="@/assets/images/logo.svg" alt="GoMonkey – se Forest lokationer">
      </a>
      <div class="menu">
        <!-- Klassen "open" sættes på, når menuen er åben -->
        <nav :class="{ open: isOpen }">
          <BaseButton variant="header" href="#">Cave</BaseButton>
          <BaseButton variant="header" href="#">Forest</BaseButton>
          <BaseButton variant="header" href="#">Alt godt</BaseButton>
          <BaseButton variant="header" href="#">EAN</BaseButton>
        </nav>

        <div class="actions">
          <!-- Burgerknappen (kun på mobil). Viser ✕, når menuen er åben -->
          <button class="burger" aria-label="Menu" @click="isOpen = !isOpen">
            {{ isOpen ? '✕' : '☰' }}
          </button>
          <BaseButton variant="primary" :href="BOOK_URL">BOOK</BaseButton>
        </div>
      </div>
  </header>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/spacings' as s;

header {
  position: sticky;
  top: 0;
  z-index: 20;
  background-color: c.$primary_light25;
  display: flex;
  align-items: center;
  justify-content: space-between;
  // Samme sidemargin som forsidens sektioner, så logo og menu flugter med indholdet på store skærme
  padding: s.$spacing-xs max(#{s.$spacing-m}, calc((100% - #{s.$indhold-bredde}) / 2));
}

// Fjerner ekstra luft under logoet
.logo-link {
  display: flex;
}

.menu {
    list-style: none;
    display: flex;
    flex-direction: row;
    gap: s.$spacing-m;
}

.actions {
  display: flex;
  align-items: center;
  gap: s.$spacing-m;
}

.burger {
  background: none;
  border: none;
  font-size: 2.5rem;
  cursor: pointer;
}

/* Mobil: menuen er skjult og vises kun med klassen "open" */
nav {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin: auto;
  flex-direction: column;
  gap: s.$spacing-s;
  padding: s.$spacing-m;
  background-color: c.$primary_light25;
}

nav.open {
  display: flex;
}

/* Desktop: burgeren skjules, og menuen står på en række */
@media (min-width: 48rem) {
  .burger {
    display: none;
  }

  nav {
    display: flex;
    position: static;
    flex-direction: row;
    padding: 0;
    background: none;
  }
}
</style>