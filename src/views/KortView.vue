<script setup>
// Kortsiden. Samler filteret og kortet (før lå det i App.vue)
import { ref } from 'vue'
import InteraktivtKort from '@/components/InteraktivtKort.vue'
import KortFilter from '@/components/KortFilter.vue'

// Id på den bane, man har klikket på i kortet
const valgtBaneId = ref(null)

// 'alle' eller en liste af bane-id'er. Filteret sender den, kortet modtager den
const nuvaerendeFilter = ref('alle')

// Kaldes, når KortFilter sender 'filter-changed'.
// Gemmer det nye filter, og så sender Vue det automatisk videre til kortet
function haandterFilterAendring(nytFilter) {
  nuvaerendeFilter.value = nytFilter
}
</script>

<template>
  <!-- Siden er delt i to: filteret til venstre og kortet til højre.
       Dataflow: KortFilter → (emit) → KortView → (prop) → InteraktivtKort -->
  <main class="kort-app">
    <!-- Filter. @filter-changed lytter efter beskeden fra filteret -->
    <KortFilter @filter-changed="haandterFilterAendring" />

    <!-- Kortet. :filter sender filteret ind som prop.
         @bane-valgt gemmer den bane, man klikker på ($event = bane-id'et) -->
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
     Farverne kommer fra _colors.scss, så kortet passer til resten af siderne -->
<style lang="scss">
@use '@/assets/styles/colors' as c;

// Kortets egen baggrundsfarve. Den er ikke en del af farvepaletten,
// men skal matche selve kort-tegningen (public/kort-base.svg)
$kort-baggrund: #a9b790;

// Skygge under de bokse, der ligger oven på kortet
$skygge: 0 4px 16px rgba(c.$primary_black100, 0.2);

// Hele kortsiden: fylder skærmens fulde højde.
// display: flex lægger filteret og kortet ved siden af hinanden.
// 100dvh er højden på mobil uden browserens adresselinje. 100vh er en reserve
// til ældre browsere, der ikke kender dvh
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
  font-family: "Inter", sans-serif;
  color: c.$primary_black100;
  background: c.$primary_light25;
  font-synthesis: none;

  // border-box: padding og kant tælles med i bredden, så elementer ikke bliver for brede
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  // Knapper bruger samme skrift som resten af siden.
  // :where() gør reglen svag, så knappernes egne klasser (fx font-weight) vinder
  :where(button) {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  // Lukkekryds øverst til højre. Udseendet kommer fra .button-close i _buttons.scss –
  // her får det kun skygge, så det kan ses oven på kortet.
  // pointer-events: auto, fordi .kort-tophoejre lader klik gå igennem
  .kort-luk {
    pointer-events: auto;
    align-self: center;
    box-shadow: $skygge;
  }

  // Tydelig lilla ramme, når man bruger tastaturet (Tab) til at gå mellem knapper
  button:focus-visible,
  .kort-visning:focus-visible {
    outline: 3px solid c.$secondary_purple100;
    outline-offset: 3px;
  }

  // ---------- Kortets område ----------

  // Kortets område fylder alt ved siden af filteret
  .kort-side {
    flex: 1;
    min-width: 0;
    height: 100%;
    // Samme farve som kortet, så der aldrig kan skinne hvidt igennem
    background: $kort-baggrund;
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

  // Scenen. position: relative gør, at knapperne med position: absolute
  // placeres i forhold til scenen og ikke i forhold til hele siden.
  // isolation: isolate holder z-index for knapperne inde i scenen
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

  // Boksen, som SVG'en sættes ind i.
  // user-select: none forhindrer, at man markerer tekst, når man trækker.
  // cursor: grab viser en hånd, og grabbing en lukket hånd, mens man trækker
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

  // Øverst til højre: "Vis hele parken" og lukkeknappen ligger oven på kortet (z-index: 4).
  // pointer-events: none lader klik gå igennem til kortet – undtagen på knapperne,
  // som får pointer-events: auto igen.
  // clamp(16px, 3vw, 42px) = afstand fra kanten, der skalerer med skærmen
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

  // "Vis hele parken": samme form som button-secondary, men med lys baggrund
  .kort-reset-top {
    pointer-events: auto;
    border: solid 2px c.$primary_black100;
    border-radius: 1rem;
    background: c.$primary_light25;
    color: c.$primary_black100;
    font-weight: 900;
    // Samme skriftstørrelse som knapperne på resten af sitet (button-mixin i _typography.scss)
    font-size: clamp(1rem, 1.5vw, 1.25rem);
    padding: 0.5rem 1.5rem;
    box-shadow: $skygge;

    &:hover {
      background: c.$secondary_purple100;
      border-color: c.$secondary_purple100;
      color: c.$primary_light25;
    }

    &:active {
      transform: translateY(1px);
    }
  }

  // ---------- Zoomknapper ----------

  // Den lyse boks med + og − nederst til højre
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

  // Den tynde streg mellem + og −
  .kort-vaerktoej-linje {
    height: 1px;
    width: 31px;
    background: c.$primary_black25;
  }

  // Zoomniveauet (fx "1.3×") lige over zoomknapperne
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

  // Boksen med den valgte bane nederst til venstre.
  // Den har z-index 4 og ligger derfor oven på vejledningen (z-index 2).
  // backdrop-filter: blur slører kortet bag den halvgennemsigtige boks
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

  // Den runde prik i banens farve. border-radius: 50% gør firkanten rund
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

  // Boksen med "Kortet indlæses…" eller en fejl, midt på kortet.
  // top/left 50% + translate(-50%, -50%) er et klassisk trick til at centrere
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

    // "Prøv igen" ser ud som button-primary
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

  // ---------- Mobil ----------

  // Gælder kun skærme op til 800px brede.
  // Her skjules "Vis hele parken" og vejledningen for at give kortet plads
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

    // Lukkeknappen bliver øverst til højre, lidt tættere på kanten
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

// Respektér brugere, der har slået animationer fra i deres styresystem
@media (prefers-reduced-motion: reduce) {
  .kort-app *,
  .kort-app *::before,
  .kort-app *::after {
    scroll-behavior: auto !important;
  }
}
</style>
