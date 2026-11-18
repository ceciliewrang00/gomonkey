<script setup>
// POPUP PÅ KORTET
// Boksen, der dukker op, når man klikker på en bane på kortet (InteraktivtKort.vue).
// Den viser banens navn, beskrivelse, sværhedsgrad, fakta og krav.
// Alle tekster og tal kommer fra Firebase via services/baner.js – de samme data
// som banekortene på forsiden (TrackInfo.vue).
import { computed } from 'vue'

// GoMonkey-aben, der bruges som "trin" i sværhedsgraden (3 aber)
import logoUrl from '@/assets/images/gomonkey-logo.svg'
import { trinFor, niveauFor, harSvaerhedsgrad, faktaFor } from '@/services/baner.js'

// bane = den bane, der skal vises. Den sendes ind fra InteraktivtKort.vue (:bane="valgtBane")
const props = defineProps({
  bane: {
    type: Object,
    required: true
  }
})

// 'luk' = beskeden, der sendes til kortet, når man trykker på krydset. Kortet lukker så popup'en
defineEmits(['luk'])

// Niveauet med ord (Let, Mellem, Svær – eller "For alle" for Bounce) og som trin 1–3
const niveau = computed(() => niveauFor(props.bane))
const trin = computed(() => trinFor(props.bane))
const medSvaerhedsgrad = computed(() => harSvaerhedsgrad(props.bane))

// Faktatallene i 2×2-gitteret: Banehøjde, Banelængde, Forhindringer, Antal svæv
const fakta = computed(() => faktaFor(props.bane, { kunKort: true }))
</script>

<template>
  <!-- --bane-farve bruges til farvestregen i toppen og prikken ved navnet.
       Farven kommer fra $kort-bane-farver i _colors.scss (via --kort-bane-<id> i KortView.vue).
       Findes den ikke (fx en ny bane fra admin), bruges banens egen farve, og ellers en grå -->
  <div
    class="bane-popup"
    role="dialog"
    aria-labelledby="popup-titel"
    :style="{ '--bane-farve': `var(--kort-bane-${bane.id}, ${bane.farve || '#CED0C0'})` }"
  >
    <div class="popup-header">
      <div class="popup-titel-gruppe">
        <span class="bane-farve-indikator" aria-hidden="true"></span>
        <h3 id="popup-titel">{{ bane.navn }}</h3>
      </div>
      <button
        type="button"
        class="popup-luk"
        aria-label="Luk information"
        @click="$emit('luk')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>

    <!-- Beskrivelsen – samme tekst som på forsiden. Skjules på smalle skærme -->
    <p v-if="bane.description" class="popup-beskrivelse">
      {{ bane.description }}
    </p>

    <!-- Sværhedsgrad: 3 aber (fyldte = niveau) og ordet skrevet ud ved siden af.
         Samme 3 trin som bjælken på forsiden. Bounce viser 3 tomme aber og "For alle" -->
    <div class="skala">
      <span class="skala-label">Sværhedsgrad</span>
      <span class="skala-vaerdi">
        <span
          class="skala-ikoner"
          role="img"
          :aria-label="medSvaerhedsgrad ? `Sværhedsgrad: ${niveau}, ${trin} ud af 3` : `Sværhedsgrad: ${niveau}`"
        >
          <img
            v-for="i in 3"
            :key="i"
            :src="logoUrl"
            alt=""
            class="skala-logo"
            :class="{ aktiv: medSvaerhedsgrad && i <= trin }"
          />
        </span>
        <span class="skala-ord">{{ niveau }}</span>
      </span>
    </div>

    <!-- Faktatal i 2×2-gitter – samme tal som på forsiden -->
    <dl v-if="fakta.length" class="popup-fakta">
      <div v-for="f in fakta" :key="f.key" class="popup-fakta__boks">
        <dt>{{ f.label }}</dt>
        <dd>{{ bane[f.key] }}</dd>
      </div>
    </dl>

    <!-- Kravet under faktatallene -->
    <p v-if="bane.requirements" class="popup-krav">
      <strong>Krav:</strong> {{ bane.requirements }}
    </p>

    <!-- Link til banens kort på forsiden (artiklen har banens id, fx /#bane-6) -->
    <RouterLink :to="{ path: '/', hash: `#${bane.id}` }" class="button-arrow popup-link">
      Læs mere om banen
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
    </RouterLink>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/fonts' as ft;
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/spacings' as s;

.bane-popup {
  position: absolute;
  // Under knapperne øverst til højre ("Vis hele parken" og "Luk kort")
  top: 5.5rem;
  right: clamp(16px, 3vw, 42px);
  z-index: 10;
  width: min(22rem, calc(100% - 2 * #{s.$spacing-s}));
  overflow: hidden;
  padding: s.$spacing-s s.$spacing-s s.$spacing-s;
  border-radius: 1rem;
  background-color: c.$primary_light25;
  color: c.$primary_black100;
  box-shadow: 0 0.75rem 2rem rgba(c.$primary_darkgreen, 0.2);
  font-family: ft.$font; // Samme font som resten af siden
  animation: popup-glid-ind 0.25s cubic-bezier(0.16, 1, 0.3, 1);

  // Farvestreg i toppen i banens farve
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 0.35rem;
    background-color: var(--bane-farve);
  }

  // Mobil: popuppen ligger i bunden af kortet i fuld bredde
  @media (max-width: 600px) {
    top: auto;
    left: s.$spacing-xs;
    right: s.$spacing-xs;
    bottom: s.$spacing-xs;
    width: auto;
    // Dækker højst ca. halvdelen af kortet – resten kan scrolles inde i popup'en
    max-height: 50%;
    overflow-y: auto;
  }
}

@keyframes popup-glid-ind {
  from {
    opacity: 0;
    transform: translateY(-0.6rem) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* --- Header --- */
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: s.$spacing-xs;
  padding-top: 0.25rem;
}

.popup-titel-gruppe {
  display: flex;
  align-items: center;
  gap: 0.6rem;

  h3 {
    margin: 0;
    padding-top: 0; // Nulstiller padding fra h3 i _typography.scss
    font-size: 1.25rem;
    font-weight: 900;
    line-height: 1.2;
  }
}

.bane-farve-indikator {
  flex-shrink: 0;
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 50%;
  background-color: var(--bane-farve);
  
}

.popup-luk {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  background-color: c.$primary_light50;
  color: c.$primary_darkgreen;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;

  svg {
    width: 1rem;
    height: 1rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.5;
    stroke-linecap: round;
  }

  &:hover {
    background-color: c.$primary_darkgreen;
    color: c.$primary_light25;
  }

  &:focus-visible {
    outline: 3px solid c.$secondary_purple100;
    outline-offset: 2px;
  }
}

/* --- Beskrivelse --- */
.popup-beskrivelse {
  margin: s.$spacing-xs 0 s.$spacing-s;
  font-size: 0.95rem;
  font-weight: 400;
  line-height: 1.5;

  // Smalle skærme: skjules, så popup'en ikke dækker for meget af kortet
  @media (max-width: 600px) {
    display: none;
  }
}

/* --- Sværhedsgrad (aberne) --- */
.skala {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: s.$spacing-xs;
  margin-top: s.$spacing-xs;
  padding: 0.6rem 0.9rem;
  border-radius: 0.75rem;
  background-color: c.$forest_green25;
  font-size: 0.875rem; // 14px
  line-height: 1.3;
}

.skala-label {
  font-weight: 600;
  color: c.$primary_darkgreen;
}

.skala-vaerdi {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.skala-ikoner {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.skala-logo {
  width: 1.25rem;
  height: 1.25rem;
  object-fit: contain;
  opacity: 0.25;
  transition: opacity 0.2s ease;

  &.aktiv {
    opacity: 1;
  }
}

// Ordet (Let, Mellem, Svær eller "For alle") står altid skrevet ud
.skala-ord {
  font-weight: 800;
  color: c.$primary_darkgreen;
}

/* --- Faktatal (2×2) --- */
// Samme mørke bokse som faktaboksene på forsiden
.popup-fakta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.4rem;
  margin: 0.5rem 0 0;
}

.popup-fakta__boks {
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  background-color: c.$primary_darkgreen;
  color: c.$primary_light25;

  dt {
    font-size: 0.875rem; // 14px
    font-weight: 400;
    opacity: 0.85;
  }

  dd {
    margin: 0.1rem 0 0;
    font-size: 1rem;
    font-weight: 800;
  }
}

/* --- Krav --- */
.popup-krav {
  margin: 0.6rem 0 0;
  font-size: 0.875rem; // 14px
  font-weight: 400;
  line-height: 1.4;

  strong {
    font-weight: 800;
  }
}

/* --- Link til forsiden --- */
// .button-arrow fra _buttons.scss – her mørk, så den kan læses på den lyse baggrund
.popup-link {
  margin-top: 0.75rem;
  color: c.$primary_darkgreen;
  font-size: 0.95rem;
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {
  .bane-popup {
    animation: none;
  }
}
</style>
