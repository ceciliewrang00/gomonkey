<script setup>
// HVEM SKAL MED? + BANESTIGEN
import { ref, computed } from 'vue'
import { niveauFor, trinFor, NIVEAUER } from '@/services/baner.js'

const props = defineProps({
  baner: { type: Array, default: () => [] },
})

const ANBEFALINGER = {
  smaa: ['bounce', 'bane-1', 'bane-2'],
  boern7: ['bounce', 'bane-3', 'bane-4', 'bane-5'],
  voksne: ['bane-4', 'bane-5', 'bane-6'],
  adrenalin: ['bane-6', 'bane-7'],
}

const VALG = [
  { id: 'smaa', ikon: '', titel: 'De små', under: '4–6 år' },
  { id: 'boern7', ikon: '', titel: 'Børn 7+', under: 'fra 110 cm' },
  { id: 'voksne', ikon: '', titel: 'Voksne', under: 'fra 140 cm' },
  { id: 'adrenalin', ikon: '', titel: 'Adrenalin', under: 'de vildeste' },
]

const valgt = ref(null)

function vaelg(id) {
  valgt.value = valgt.value === id ? null : id
}

const anbefalede = computed(() => {
  if (!valgt.value) return []
  const ider = ANBEFALINGER[valgt.value] ?? []
  return props.baner.filter((bane) => ider.includes(bane.id))
})

function erAnbefalet(bane) {
  return anbefalede.value.some((b) => b.id === bane.id)
}

const anbefalingTekst = computed(() => {
  const navne = anbefalede.value.map((b) => b.name)
  if (!navne.length) return ''
  if (navne.length === 1) return `Prøv ${navne[0]}`
  return `Prøv ${navne.slice(0, -1).join(', ')} og ${navne.at(-1)}`
})

function kravTekst(bane) {
  const krav = String(bane.requirements ?? '').trim().replace(/^Mindst/i, 'Min.').replace(/\.$/, '')
  return krav || 'Ingen krav'
}

const zoner = computed(() =>
  NIVEAUER.map((niveau, i) => ({
    navn: niveau.navn,
    antal: props.baner.filter((bane) => trinFor(bane) === i + 1).length,
  })).filter((zone) => zone.antal > 0)
)

function gaaTilBane(id) {
  const maal = document.getElementById(id)
  if (!maal) return
  const roligt = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  maal.scrollIntoView({ behavior: roligt ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <section class="hvem" aria-labelledby="hvem-titel">
    <h2 id="hvem-titel" class="hvem__titel">Hvem skal med?</h2>
    <p class="hvem__under">Vælg og se hvilke baner der passer</p>

    <div class="hvem__valg">
      <button
        v-for="v in VALG"
        :key="v.id"
        type="button"
        class="valg"
        :class="{ 'er-valgt': valgt === v.id }"
        :aria-pressed="valgt === v.id"
        @click="vaelg(v.id)"
      >
        <span class="valg__ikon" aria-hidden="true">{{ v.ikon }}</span>
        <span class="valg__tekst">
          <span class="valg__titel">{{ v.titel }}</span>
          <span class="valg__under">{{ v.under }}</span>
        </span>
      </button>
    </div>

    <!-- Banestigen: Alle baner på én række uden scrolling -->
    <div v-if="baner.length" class="stige-ramme">
      <div class="stige" :class="{ 'har-valg': valgt }" :style="{ '--antal': baner.length }">
        <ol class="stige__baner" aria-label="Banerne fra let til svær">
          <li v-for="bane in baner" :key="bane.id" class="stige__bane">
            <button
              type="button"
              class="stige__prik-wrapper"
              :aria-label="`${bane.name}, ${niveauFor(bane)}, ${kravTekst(bane)}${erAnbefalet(bane) ? ', anbefalet' : ''} – gå til banen`"
              @click="gaaTilBane(bane.id)"
            >
              <span
                class="stige__prik"
                :class="[`bane--${bane.id}`, { 'er-anbefalet': erAnbefalet(bane) }]"
                :data-bane="bane.id"
              >
                <span class="stige__tooltip" aria-hidden="true">{{ bane.name }} · {{ kravTekst(bane) }}</span>
              </span>
            </button>
            <span class="stige__navn" aria-hidden="true">{{ bane.name }}</span>
          </li>
        </ol>

        <div class="stige__zoner" aria-hidden="true">
          <span v-for="zone in zoner" :key="zone.navn" :style="{ gridColumn: `span ${zone.antal}` }">
            {{ zone.navn }}
          </span>
        </div>
      </div>
    </div>

  
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;

$prik: 1.5rem;

.hvem {
  box-sizing: border-box;
  padding: 1.25rem;
  border-radius: 1rem;
  background-color: rgba(c.$primary_darkgreen, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: c.$primary_light25;
}

.hvem__titel {
  margin: 0;
  padding: 0;
  color: c.$primary_light25;
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.2;
}

.hvem__under {
  margin: 0.2rem 0 0.9rem;
  font-size: 0.8rem;
  line-height: 1.35;
  color: rgba(c.$primary_light25, 0.85);
}

.hvem__valg {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.valg {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.55rem 0.7rem;
  border: 1.5px solid rgba(c.$primary_light25, 0.35);
  border-radius: 0.75rem;
  background-color: rgba(c.$primary_light25, 0.06);
  color: c.$primary_light25;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;

  &:hover {
    border-color: c.$primary_light25;
  }

  &:focus-visible {
    outline: 2px solid c.$forest_pink100;
    outline-offset: 2px;
  }

  &.er-valgt {
    border-color: c.$primary_light25;
    background-color: c.$primary_light25;
    color: c.$primary_darkgreen;
  }
}

.valg__ikon {
  font-size: 1.25rem;
  line-height: 1;
}

.valg__tekst {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.valg__titel {
  font-size: 0.85rem;
  font-weight: 800;
  line-height: 1.2;
}

.valg__under {
  font-size: 0.7rem;
  line-height: 1.3;
  opacity: 0.85;
}

/* --- Banestigen --- */
.stige-ramme {
  margin-top: 0.85rem;
  padding-top: 0.5rem;
  width: 100%;
}

.stige {
  position: relative;
  width: 100%;
}

.stige__baner,
.stige__zoner {
  display: grid;
  grid-template-columns: repeat(var(--antal), minmax(0, 1fr));
  width: 100%;
}

.stige__baner {
  position: relative;
  margin: 0;
  padding: 0;
  list-style: none;

  &::before {
    content: '';
    position: absolute;
    top: calc(0.5rem + (#{$prik} / 2));
    left: calc(100% / var(--antal) / 2);
    right: calc(100% / var(--antal) / 2);
    height: 2px;
    background-color: rgba(c.$primary_light25, 0.5);
  }
}

.stige__bane {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}

.stige__prik-wrapper {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border: none;
  background: none;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid c.$forest_pink100;
    outline-offset: 2px;
    border-radius: 50%;
  }
}

.stige__prik {
  position: relative;
  width: $prik;
  height: $prik;
  border: 2px solid rgba(c.$primary_light25, 0.7);
  border-radius: 50%;
  background-color: var(--bane-farve, #{c.$primary_black50});
  transition: transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease;

  .stige__prik-wrapper:hover &,
  .stige__prik-wrapper:focus-visible & {
    transform: scale(1.18);
  }
}

@each $id, $farve in c.$kort-bane-farver {
  .bane--#{$id} {
    --bane-farve: #{$farve};
  }
}

.har-valg .stige__prik {
  opacity: 0.3;
}

.har-valg .stige__prik.er-anbefalet {
  opacity: 1;
  border-color: c.$primary_light25;
  box-shadow: 0 0 0 3px c.$primary_light25;
}

.stige__navn {
  font-size: clamp(0.5rem, 1.5vw, 0.65rem);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  transition: opacity 0.2s ease;
}

.har-valg .stige__bane:has(.stige__prik:not(.er-anbefalet)) .stige__navn {
  opacity: 0.4;
}

.stige__tooltip {
  position: absolute;
  bottom: calc(100% + 0.3rem);
  left: 50%;
  z-index: 3;
  padding: 0.3rem 0.55rem;
  border-radius: 0.4rem;
  background-color: c.$primary_light25;
  color: c.$primary_darkgreen;
  font-size: 0.7rem;
  font-weight: 700;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 0.2rem) scale(0.85);
  transition: opacity 0.15s ease, transform 0.15s ease;

  .stige__prik-wrapper:hover &,
  .stige__prik-wrapper:focus-visible & {
    opacity: 1;
    transform: translate(-50%, 0) scale(0.85);
  }
}

.stige__bane:first-child .stige__tooltip {
  left: 20%;
}

.stige__bane:last-child .stige__tooltip {
  left: 80%;
}

.stige__zoner {
  margin-top: 0.5rem;

  span {
    margin: 0 0.1rem;
    padding-top: 0.3rem;
    border-top: 2px solid rgba(c.$primary_light25, 0.5);
    font-size: clamp(0.5rem, 1.4vw, 0.65rem);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-align: center;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.hvem__anbefaling {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.6rem;
  min-height: 1.3rem;
  margin: 0.9rem 0 0;
  font-size: 0.8rem;
  line-height: 1.4;

  strong {
    font-weight: 800;
  }
}

@media (prefers-reduced-motion: reduce) {
  .valg,
  .stige__prik,
  .stige__navn,
  .stige__tooltip {
    transition: none;
  }
}
</style>