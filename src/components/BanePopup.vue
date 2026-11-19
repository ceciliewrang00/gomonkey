<script>
import { KORTFILTER_URL } from '@/services/api.js'

// Henter underteksterne fra kortfiltret ("mapfilter") én gang og gemmer dem,
// så popup'en ikke henter dem igen, hver gang man klikker på en bane
let underteksterPromise = null
function hentUndertekster() {
  if (!underteksterPromise) {
    underteksterPromise = fetch(`${KORTFILTER_URL}.json`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const tekster = {}
        Object.values(data ?? {}).forEach((item) => {
          if (item?.id && item.undertekst) tekster[item.id] = item.undertekst
        })
        return tekster
      })
      // Fejler hentningen, vises popup'en bare uden undertekst
      .catch(() => {
        underteksterPromise = null
        return {}
      })
  }
  return underteksterPromise
}
</script>

<script setup>
// Popup'en, der vises, når man klikker på en bane på kortet.
// Navn og sværhedsgrad kommer fra Firebase "baner", underteksten fra kortfiltret

import { computed, ref, onMounted } from 'vue'

// GoMonkey-aben, der bruges som trin i sværhedsgraden
import logoUrl from '@/assets/images/gomonkey-logo.svg'

import { trinFor, niveauFor, harSvaerhedsgrad } from '@/services/baner.js'

// bane = den bane, der skal vises
const props = defineProps({
  bane: {
    type: Object,
    required: true
  }
})

// 'luk' sendes til kortet, når man trykker på krydset
defineEmits(['luk'])

// Niveauet som ord og som trin 1–3, og om banen har en sværhedsgrad
const niveau = computed(() => niveauFor(props.bane))
const trin = computed(() => trinFor(props.bane))
const medSvaerhedsgrad = computed(() => harSvaerhedsgrad(props.bane))

// Underteksten fra kortfiltret, fx "Tarzan spring"
const undertekster = ref({})
onMounted(async () => {
  undertekster.value = await hentUndertekster()
})
const undertekst = computed(() => undertekster.value[props.bane.id])

// De tre skalaer med aber. Højde og fysisk følger sværhedsgradens trin.
// Bounce er ikke en klatrebane og viser kun "For alle"
const skalaer = computed(() => {
  const liste = [{ label: 'Sværhedsgrad', ord: niveau.value }]
  if (medSvaerhedsgrad.value) {
    liste.push(
      { label: 'Højde', ord: ['Lavt', 'Mellem', 'Højt'][trin.value - 1] },
      { label: 'Fysisk krævende', ord: ['Lidt', 'Noget', 'Meget'][trin.value - 1] }
    )
  }
  return liste
})
</script>

<template>
  <!-- Banens farve til stregen i toppen og prikken ved navnet. Nye baner bruger deres egen farve -->
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

    <!-- Den korte linje om banen fra kortfiltret -->
    <p v-if="undertekst" class="popup-undertekst">
      {{ undertekst }}
    </p>

    <!-- Hver skala som 3 aber (de fyldte = niveauet) og ordet ved siden af -->
    <div v-for="s in skalaer" :key="s.label" class="skala">
      <span class="skala-label">{{ s.label }}</span>
      <span class="skala-vaerdi">
        <span
          class="skala-ikoner"
          role="img"
          :aria-label="medSvaerhedsgrad ? `${s.label}: ${s.ord}, ${trin} ud af 3` : `${s.label}: ${s.ord}`"
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
        <!-- Kun Bounce viser et ord ("For alle"), da den ikke har aber -->
        <span v-if="!medSvaerhedsgrad" class="skala-ord">{{ s.ord }}</span>
      </span>
    </div>

    <p v-if="bane.requirements" class="popup-krav">
      <strong>Krav:</strong> {{ bane.requirements }}
    </p>

    <!-- Ekstra pris, fx frit fald på Sort. Vises kun, hvis banen har en -->
    <p v-if="bane.addOn" class="popup-krav">
      <strong>Tilkøb:</strong> {{ bane.addOn }}
    </p>

    <!-- Link til banens kort på forsiden, fx /#bane-6 -->
    <RouterLink :to="{ path: '/', hash: `#${bane.id}` }" class="button-arrow popup-link">
      <!-- Bounce er en aktivitet, ikke en bane -->
      {{ medSvaerhedsgrad ? 'Læs mere om banen' : 'Læs mere om aktiviteten' }}
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
  // Under knapperne øverst til højre
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
  font-family: ft.$font;
  animation: popup-glid-ind 0.25s cubic-bezier(0.16, 1, 0.3, 1);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 0.35rem;
    background-color: var(--bane-farve);
  }

  // Mobil: popup'en ligger i bunden af kortet i fuld bredde
  @media (max-width: 600px) {
    top: auto;
    left: s.$spacing-xs;
    right: s.$spacing-xs;
    bottom: s.$spacing-xs;
    width: auto;
    // Dækker højst halvdelen af kortet – resten kan scrolles
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
    padding-top: 0;  // fjerner padding fra h3
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

/* --- Undertekst fra kortfiltret --- */
.popup-undertekst {
  margin: 0.4rem 0 0.6rem;
  font-size: 0.95rem;
  font-weight: 400;
  line-height: 1.4;
}

/* --- Sværhedsgrad (aberne) --- */
.skala {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: s.$spacing-xs;
  margin-top: 0.4rem;
  padding: 0.6rem 0.9rem;
  border-radius: 0.75rem;
  background-color: c.$forest_green25;
  font-size: 0.875rem;
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
// "For alle" på Bounce
.skala-ord {
  font-weight: 800;
  color: c.$primary_darkgreen;
}

/* --- Krav --- */
.popup-krav {
  margin: 0.6rem 0 0;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.4;

  strong {
    font-weight: 800;
  }
}

/* --- Link til forsiden --- */
// Mørk, så den kan læses på den lyse baggrund
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
