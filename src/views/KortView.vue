<script setup>
// Kortsiden på /kort med filteret og kortet. De kan ikke tale direkte sammen, så filteret sender
// de valgte baner op hertil (emit), og vi sender dem ned i kortet (prop)

import { ref } from 'vue'

import InteraktivtKort from '@/components/InteraktivtKort.vue'

import KortFilter from '@/components/KortFilter.vue'

// Id på den bane, man har klikket på i kortet
const valgtBaneId = ref(null)

// Hvilke baner filteret viser: 'alle' eller en liste af bane-id'er
const nuvaerendeFilter = ref('alle')

// Gemmer filterets valg. Kortet får det som prop og opdateres af sig selv
function haandterFilterAendring(nytFilter) {
  nuvaerendeFilter.value = nytFilter
}
</script>

<template>
  <!-- Filteret til venstre og kortet til højre -->
  <main class="kort-app">
    <KortFilter @filter-changed="haandterFilterAendring" />

    <!-- Kortet får filteret som prop og sender den valgte bane tilbage -->
    <div class="kort-side">
      <InteraktivtKort
        :filter="nuvaerendeFilter"
        @bane-valgt="valgtBaneId = $event"
      />
    </div>
  </main>
</template>

<!-- Ikke scoped, fordi kortets SVG sættes ind med JavaScript, og scoped-styles ikke virker på den.
     Alt ligger under .kort-app, så intet rammer resten af siden -->
<style lang="scss">
@use '@/assets/styles/fonts' as ft;
@use '@/assets/styles/colors' as c;

// Kortets baggrundsfarve, så den matcher kort-tegningen
$kort-baggrund: #a9b790;

// Skygge under boksene oven på kortet
$skygge: 0 4px 16px rgba(c.$primary_black100, 0.2);

// Kortsiden fylder hele skærmens højde, med filteret og kortet ved siden af hinanden.
// 100dvh er højden på mobil uden adresselinjen, 100vh er reserven til ældre browsere
.kort-app {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  z-index: 999;

  display: flex;
  gap: 0;
  overflow: hidden;
  font-family: ft.$font;
  color: c.$primary_black100;
  background: c.$primary_light25;
  font-synthesis: none;

  // Padding og kant tælles med i bredden
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  button {
    cursor: pointer;
  }

  // Lukkekrydset får skygge, så det kan ses oven på kortet
  .kort-luk {
    pointer-events: auto;
    align-self: center;
    box-shadow: $skygge;
  }

  // Lilla ramme, når man bruger tastaturet til at gå mellem knapper
  button:focus-visible,
  .kort-visning:focus-visible {
    outline: 3px solid c.$secondary_purple100;
    outline-offset: 3px;
  }

  // ---------- Banefarver ----------

  // Laver en CSS-variabel med farven for hver bane i $kort-bane-farver, fx --kort-bane-bane-1.
  // Banens farvestreg (nr. 2) på kortet får samme farve
  @each $id, $farve in c.$kort-bane-farver {
    --kort-bane-#{$id}: #{$farve};

    .bane-segment[data-bane="#{$id}"] > path:nth-child(2) {
      stroke: var(--kort-bane-#{$id});
    }
  }

  // ---------- Kortets område ----------

  // Kortets område fylder alt ved siden af filteret
  .kort-side {
    flex: 1;
    min-width: 0;
    height: 100%;
    // Samme farve som kortet, så der aldrig skinner hvidt igennem
    background: $kort-baggrund;
    border-radius: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .kort-shell {
    flex: 1;
    min-width: 0;
    min-height: 0;
    width: 100%;
    // Kortet skal ikke have den padding, som main.scss giver alle sektioner
    padding: 0;
  }

  // Knapperne placeres i forhold til scenen og ikke hele siden
  .kort-stage {
    position: relative;
    isolation: isolate;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    border-radius: 0;
    background: $kort-baggrund;
  }

  // Boksen, som SVG'en sættes ind i. Man kan ikke markere tekst, og markøren er en hånd
  .kort-visning {
    width: 100%;
    height: 100%;
    display: block;
    user-select: none;
    touch-action: none;
    cursor: grab;
    overflow: hidden;

    &:active {
      cursor: grabbing;
    }

    &:focus-visible {
      outline-offset: -4px;
    }

    svg {
      width: 100%;
      height: 100%;
      display: block;
    }
  }

  // ---------- Toplinje ----------

  // "Vis hele parken" og lukkeknappen øverst til højre.
  // Klik går igennem til kortet, undtagen på knapperne
  .kort-tophoejre {
    position: absolute;
    z-index: 4;
    top: 24px;
    right: clamp(16px, 3vw, 42px);
    display: flex;
    align-items: stretch;
    gap: 12px;
    pointer-events: none;
  }

  .kort-reset-top {
    pointer-events: auto;
  }

  // ---------- Zoomknapper ----------

  // Boksen med + og − nederst til højre
  .kort-vaerktoejer {
    position: absolute;
    bottom: 29px;
    right: clamp(16px, 3vw, 42px);
    z-index: 4;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: c.$primary_light25;
    padding: 4px;
    border-radius: 1rem;
    box-shadow: $skygge;

    button {
      background: transparent;
      border: 0;
      border-radius: 0.75rem;
      width: 46px;
      height: 46px;
      color: c.$primary_black100;
      font-size: 31px;
      line-height: 1;
      font-weight: 300;

      &:disabled {
        opacity: 0.28;
        cursor: not-allowed;
      }

      &:not(:disabled):hover {
        background: c.$secondary_purple100;
        color: c.$primary_light25;
      }

      &:not(:disabled):active {
        transform: translateY(1px);
      }
    }
  }

  // Stregen mellem + og −
  .kort-vaerktoej-linje {
    height: 1px;
    width: 31px;
    background: c.$primary_black25;
  }

  // Zoomniveauet over zoomknapperne
  .kort-zoom {
    position: absolute;
    right: clamp(17px, 3vw, 42px);
    bottom: 139px;
    z-index: 4;
    color: c.$primary_black100;
    background: rgba(c.$primary_light25, 0.93);
    border-radius: 0.75rem;
    padding: 5px 9px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  // ---------- Valgt bane og vejledning ----------

  // Boksen med den valgte bane nederst til venstre. Den slører kortet bagved
  .kort-valgt {
    position: absolute;
    left: clamp(16px, 3vw, 42px);
    bottom: 25px;
    z-index: 4;
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(c.$primary_black100, 0.88);
    color: c.$primary_light25;
    border-radius: 1rem;
    padding: 9px 12px 9px 16px;
    font-weight: 600;
    backdrop-filter: blur(7px);
    box-shadow: $skygge;

    &[hidden] {
      display: none !important;
    }

    button {
      background: rgba(c.$primary_light25, 0.15);
      border: 0;
      border-radius: 0.75rem;
      color: c.$primary_light25;
      font-size: 24px;
      line-height: 1;
      min-width: 32px;
      min-height: 32px;

      &:hover {
        background: c.$secondary_purple100;
      }
    }
  }

  // Prik i banens farve
  .bane-prik {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid rgba(c.$primary_light25, 0.4);
  }

  // Hjælpeteksten nederst til venstre
  .kort-vejledning {
    position: absolute;
    bottom: 25px;
    left: clamp(16px, 3vw, 42px);
    z-index: 2;
    color: c.$primary_black100;
    font-size: 0.85rem;
    font-weight: 400;
    background: rgba(c.$primary_light25, 0.85);
    padding: 11px 14px;
    border-radius: 1rem;
    pointer-events: none;
  }

  // ---------- Indlæsning og fejl ----------

  // Boksen med "Kortet indlæses…" eller en fejl, midt på kortet
  .kort-status {
    z-index: 5;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 20px 25px;
    background: c.$primary_light25;
    border-radius: 1rem;
    text-align: center;
    box-shadow: $skygge;

    &.fejl {
      color: c.$secondary_orange100;
    }

    button {
      border: 0;
      background: c.$primary_black100;
      color: c.$primary_light25;
      border-radius: 1rem;
      padding: 0.5rem 1.5rem;
      font-weight: 900;

      &:hover {
        background: c.$secondary_purple100;
      }
    }
  }

  // ---------- Desktop ----------

  // Filteret svæver oven på kortet til venstre, så teksterne nederst rykkes til højre for det
  @media (min-width: 801px) {
    // Fortæller kortet, at de første 384px i venstre side er dækket af filteret
    --kort-daekket-venstre: 384px;

    .kort-valgt,
    .kort-vejledning {
      left: calc(24px + 360px + 24px);
    }
  }

  // ---------- Mobil ----------

  // Op til 800px: "Vis hele parken" og vejledningen skjules for at give kortet plads
  @media (max-width: 800px) {
    margin: 0;
    padding: 0;
    gap: 0;

    .kort-side {
      width: 100%;
      border-radius: 0;
      margin: 0;
    }

    .kort-stage {
      height: 100%;
      min-height: 460px;
    }

    .kort-reset-top,
    .kort-vejledning {
      display: none !important;
    }

    .kort-tophoejre {
      top: 15px;
      right: 15px;
    }

    .kort-zoom {
      bottom: 139px;
    }

    .kort-valgt {
      bottom: 23px;
      max-width: calc(100% - 108px);
    }
  }
}

// Knapperne bruger sidens skrift. :where() gør reglen svag, så knap-klasserne vinder over den
:where(.kort-app button) {
  font: inherit;
}

// Ingen animationer, hvis brugeren har slået dem fra
@media (prefers-reduced-motion: reduce) {
  .kort-app *,
  .kort-app *::before,
  .kort-app *::after {
    scroll-behavior: auto !important;
  }
}
</style>
