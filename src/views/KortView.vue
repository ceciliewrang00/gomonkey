<script setup>
// Kortsiden. Samler filteret og kortet (før lå det i App.vue)
import { ref } from 'vue'
import InteraktivtKort from '@/components/InteraktivtKort.vue'
import KortFilter from '@/components/KortFilter.vue'

// Id på den bane, man har klikket på i kortet
const valgtBaneId = ref(null)

// 'alle' eller en liste af bane-id'er. Filteret sender den, kortet modtager den
const nuvaerendeFilter = ref('alle')

function haandterFilterAendring(nytFilter) {
  nuvaerendeFilter.value = nytFilter
}
</script>

<template>
  <main class="kort-app">
    <!-- Filter -->
    <KortFilter @filter-changed="haandterFilterAendring" />

    <!-- Kortet -->
    <div class="kort-side">
      <InteraktivtKort
        :filter="nuvaerendeFilter"
        @bane-valgt="valgtBaneId = $event"
      />
    </div>
  </main>
</template>

<!-- IKKE scoped, for kortets SVG bliver sat ind med JavaScript og ville ikke få scoped-klasser.
     Alt ligger under .kort-app, så intet rammer resten af sitet (admin, forside osv.).
     Det her er indholdet af den gamle style.css og App.vue, uden de globale regler på body og *. -->
<style lang="scss">
.kort-app {
  display: flex;
  gap: 0;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  color: #1b2b21;
  background: #f2efeb;
  font-synthesis: none;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  button {
    font: inherit;
    cursor: pointer;
  }

  button:focus-visible,
  .kort-visning:focus-visible {
    outline: 3px solid #a2d8a2;
    outline-offset: 3px;
  }

  // ---------- Kortets område ----------

  // Kortets område fylder alt ved siden af filteret
  .kort-side {
    flex: 1;
    min-width: 0;
    height: 100%;
    // Samme farve som kortet, så der aldrig kan skinne hvidt igennem
    background: #a9b790;
    border-radius: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  // Skal fylde hele højden, ellers bliver kortet kortere end området
  .kort-shell {
    flex: 1;
    min-width: 0;
    min-height: 0;
    width: 100%;
    // main.scss giver alle <section> padding – det skal kortet ikke have
    padding: 0;
  }

  .kort-stage {
    position: relative;
    isolation: isolate;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    border-radius: 0;
    background: #a9b790;
  }

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

    // Selve SVG-tegningen
    svg {
      width: 100%;
      height: 100%;
      display: block;
    }
  }

  // ---------- Toplinje ----------

  .kort-toplinje,
  .kort-tophoejre {
    position: absolute;
    z-index: 4;
    top: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    pointer-events: none;
  }

  .kort-toplinje {
    left: clamp(16px, 3vw, 42px);
  }

  .kort-tophoejre {
    right: clamp(16px, 3vw, 42px);
  }

  .kort-brand {
    display: inline-flex;
    gap: 0.45rem;
    align-items: center;
    border-radius: 12px;
    background: #102b1b;
    color: white;
    font-weight: 800;
    font-size: 0.92rem;
    padding: 14px 18px;
    box-shadow: 0 3px 15px #14281920;

    span {
      font-weight: 400;
    }
  }

  .kort-reset-top {
    pointer-events: auto;
    border: 0;
    border-radius: 10px;
    background: #f9faf5;
    color: #193121;
    font-weight: 750;
    padding: 13px 17px;
    min-height: 44px;

    &:hover {
      background: #e6eee1;
    }

    &:active {
      transform: translateY(1px);
    }
  }

  // ---------- Zoomknapper ----------

  .kort-vaerktoejer {
    position: absolute;
    bottom: 29px;
    right: clamp(16px, 3vw, 42px);
    z-index: 4;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: white;
    padding: 4px;
    border-radius: 10px;
    box-shadow: 0 4px 18px #0003;

    button {
      background: transparent;
      border: 0;
      width: 46px;
      height: 46px;
      color: #1b2820;
      font-size: 31px;
      line-height: 1;
      font-weight: 300;

      &:disabled {
        opacity: 0.28;
        cursor: not-allowed;
      }

      &:not(:disabled):hover {
        background: #ebf0e9;
        border-radius: 6px;
      }

      &:not(:disabled):active {
        transform: translateY(1px);
      }
    }
  }

  .kort-vaerktoej-linje {
    height: 1px;
    width: 31px;
    background: #ced6c9;
  }

  .kort-zoom {
    position: absolute;
    right: clamp(17px, 3vw, 42px);
    bottom: 139px;
    z-index: 4;
    color: #203a28;
    background: #fffef2ed;
    border-radius: 9px;
    padding: 5px 9px;
    font-size: 0.79rem;
    font-weight: 750;
  }

  // ---------- Valgt bane og vejledning ----------

  .kort-valgt {
    position: absolute;
    left: clamp(16px, 3vw, 42px);
    bottom: 25px;
    z-index: 4;
    display: flex;
    align-items: center;
    gap: 12px;
    background: #14291edb;
    color: #fff;
    border: 1px solid #ffffff59;
    border-radius: 14px;
    padding: 9px 12px 9px 14px;
    font-weight: 700;
    backdrop-filter: blur(7px);

    &[hidden] {
      display: none !important;
    }

    button {
      background: #ffffff2a;
      border: 0;
      border-radius: 7px;
      color: white;
      font-size: 24px;
      line-height: 1;
      min-width: 32px;
      min-height: 32px;
    }
  }

  .bane-prik {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid #fff6;
  }

  .kort-vejledning {
    position: absolute;
    bottom: 25px;
    left: clamp(16px, 3vw, 42px);
    z-index: 2;
    color: #1f392a;
    font-size: 0.83rem;
    font-weight: 600;
    background: #f4f6e8cf;
    padding: 11px 14px;
    border-radius: 10px;
    pointer-events: none;
  }

  // ---------- Indlæsning og fejl ----------

  .kort-status {
    z-index: 5;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 20px 25px;
    background: white;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0 8px 30px #0003;

    &.fejl {
      color: #a12222;
    }

    button {
      border: 0;
      background: #132d1d;
      color: #fff;
      border-radius: 8px;
      padding: 10px 15px;
    }
  }

  // ---------- Mobil ----------

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

    .kort-toplinje,
    .kort-tophoejre,
    .kort-vejledning {
      display: none !important;
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

@media (prefers-reduced-motion: reduce) {
  .kort-app *,
  .kort-app *::before,
  .kort-app *::after {
    scroll-behavior: auto !important;
  }
}
</style>