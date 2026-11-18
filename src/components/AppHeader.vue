<script setup>
// SIDEHOVEDET
// Logo, menu og "BOOK"-knap øverst på siden. Bruges på forsiden (HomeView) og i quizzen (QuizView).
// Det bliver hængende i toppen, når man scroller (position: sticky i CSS'en).
// På mobil er menuen skjult bag en burgerknap (☰). Et klik skifter isOpen mellem true og false,
// og når isOpen er true, får <nav> klassen "open", som viser menuen (se CSS nederst).
import { ref } from 'vue'
import BaseButton from './BaseButton.vue'
// Link til booking – samme som "Book nu" i hero (står ét sted i services/api.js)
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
        <!-- :class="{ open: isOpen }" = klassen "open" sættes kun på, når isOpen er true -->
        <nav :class="{ open: isOpen }">
          <BaseButton variant="header" href="#">Cave</BaseButton>
          <BaseButton variant="header" href="#">Forest</BaseButton>
          <BaseButton variant="header" href="#">Alt godt</BaseButton>
          <BaseButton variant="header" href="#">EAN</BaseButton>
        </nav>

        <div class="actions">
          <!-- Burgerknappen (kun på mobil). Viser ✕ når menuen er åben, ellers ☰ -->
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
  padding: s.$spacing-xs s.$spacing-m;
}

// Linket om logoet – display: flex fjerner ekstra luft under billedet
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

/* MOBIL: menuen er skjult, og vises kun når den har klassen "open" */
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

/* DESKTOP: burgeren skjules, og menuen vises som en række */
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