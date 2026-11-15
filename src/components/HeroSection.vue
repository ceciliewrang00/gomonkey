<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { hentBaner } from '@/services/baner.js'

import { BOOK_URL } from '@/services/api.js'
import heroBillede from '@/assets/images/gomonkey_bane.webp'

const baner = ref([])

onMounted(async () => {
  try {
    baner.value = await hentBaner()
  } catch (e) {
    console.error('Banerne kunne ikke hentes til hero', e)
  }
})

const heroEl = ref(null)
const billedeEl = ref(null)
const wireEl = ref(null)

const TRISSE_START = 0.62
const TRISSE_SLUT = 0.78

let roligBevaegelse = false
let ventendeFrame = null

function placerTrisse(fremskridt) {
  const wire = wireEl.value
  const hero = heroEl.value
  if (!wire || !hero) return
  const laengde = wire.getTotalLength()
  const punkt = wire.getPointAtLength(laengde * (TRISSE_START + (TRISSE_SLUT - TRISSE_START) * fremskridt))
  hero.style.setProperty('--trisse-x', `${punkt.x}%`)
  hero.style.setProperty('--trisse-y', `${punkt.y}%`)
}

function opdaterVedScroll() {
  ventendeFrame = null
  const hero = heroEl.value
  if (!hero) return

  const scroll = window.scrollY
  const hoejde = hero.offsetHeight
  if (scroll > hoejde) return

  const fremskridt = Math.min(Math.max(scroll / hoejde, 0), 1)

  if (!roligBevaegelse && billedeEl.value) {
    billedeEl.value.style.transform = `translate3d(6%, ${scroll * 0.25}px, 0)`
  }
  placerTrisse(roligBevaegelse ? 0 : fremskridt)
}

function vedScroll() {
  if (!ventendeFrame) ventendeFrame = requestAnimationFrame(opdaterVedScroll)
}

onMounted(() => {
  roligBevaegelse = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  opdaterVedScroll()
  window.addEventListener('scroll', vedScroll, { passive: true })
  window.addEventListener('resize', vedScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', vedScroll)
  window.removeEventListener('resize', vedScroll)
  if (ventendeFrame) cancelAnimationFrame(ventendeFrame)
})
</script>

<template>
  <section id="hero" ref="heroEl" class="hero">
    <img ref="billedeEl" :src="heroBillede" alt="" class="hero__billede" fetchpriority="high">

    <div class="hero__gradient" aria-hidden="true"></div>

    <svg class="hero__wire" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path ref="wireEl" d="M -2 4 Q 48 26 102 30" />
    </svg>

    <div class="hero__trisse">
      <span class="hero__trisse-hjul" aria-hidden="true"></span>
      <span class="hero__trisse-snor" aria-hidden="true"></span>
      <p class="hero__badge">
        <strong>{{ baner.length || 8 }} klatrebaner</strong>
        <span>Næste stop: trætoppene</span>
      </p>
    </div>

    <!-- Indhold til venstre, lodret centreret -->
    <div class="hero__indhold">
      <p class="hero__label">
        <img src="@/assets/images/forrest-ikon.webp" alt="" class="hero__label-ikon">
        Forest Odense
      </p>

      <h1 class="hero__titel">
        Hvor højt<br>
        tør du?
      </h1>

      <p class="hero__undertitel">Klatring, svæv og frit fald midt i skoven</p>

      <div class="hero__knapper">
        <a href="#baner" class="button-primary hero__knap-pink">Find din bane</a>
        <a :href="BOOK_URL" class="button-secondary hero__knap-hvid">Se oversigtskort</a>
      </div>

      <ul class="hero__fakta">
        <li>Fra 230 kr.</li>
        <li>3 timer</li>
        <li>Udstyr og instruktion inkluderet</li>
      </ul>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/spacings' as s;
@use '@/assets/styles/colors' as c;

.hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  align-items: center; /* Lodret centreret i højden */
  box-sizing: border-box;
  min-height: clamp(640px, 100vh, 750px);
  padding-top: s.$sektion-luft;
  padding-bottom: s.$spacing-xl;
  background-color: c.$primary_black100;
  color: c.$primary_light25;
}

.hero__billede {
  position: absolute;
  top: -15%;
  left: 0;
  z-index: -2;
  width: 100%;
  height: 115%;
  object-fit: cover;
  object-position: 50% 30%;
  transform: translate3d(6%, 0, 0);
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, transparent 10%, #000 55%);
  mask-image: linear-gradient(90deg, transparent 0%, transparent 10%, #000 55%);
  will-change: transform;
}

.hero__gradient {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(
      100deg,
      rgba(c.$primary_black100, 0.85) 0%,
      rgba(c.$primary_black100, 0.45) 45%,
      rgba(c.$primary_black100, 0) 75%
    );
}

.hero__wire {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;

  path {
    fill: none;
    stroke: rgba(c.$primary_light25, 0.85);
    stroke-width: 2px;
    vector-effect: non-scaling-stroke;
  }
}

.hero__trisse {
  position: absolute;
  left: var(--trisse-x, 70%);
  top: var(--trisse-y, 24%);
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -0.45rem);
  transition: left 0.4s ease-out, top 0.4s ease-out;
}

.hero__trisse-hjul {
  width: 0.9rem;
  height: 0.9rem;
  border: 2.5px solid c.$primary_light25;
  border-radius: 50%;
  background-color: c.$primary_black100;
}

.hero__trisse-snor {
  width: 2px;
  height: 1.75rem;
  background-color: c.$primary_light25;
}

.hero__badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0;
  padding: 0.55rem 1rem;
  border-radius: 1rem;
  background-color: c.$primary_light25;
  color: c.$primary_darkgreen;
  box-shadow: 0 0.5rem 1.5rem rgba(c.$primary_black100, 0.3);
  font-size: 0.8rem;
  line-height: 1.25;
  text-align: center;
  white-space: nowrap;
  transform: rotate(-4deg);

  strong {
    font-size: 0.95rem;
    font-weight: 900;
  }
}

.hero__indhold {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 42rem;
  text-align: left; /* Venstrestillet tekst */
  text-shadow: 0 2px 16px rgba(c.$primary_black100, 0.35);
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* Elementerne flugter til venstre */
}

.hero__label {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.6rem;
  margin: 0 0 s.$spacing-s;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero__label-ikon {
  width: 2rem;
  height: 2rem;
  filter: brightness(0) invert(1);
}

.hero__titel {

  color: c.$primary_light25;
 
}

.hero__undertitel {
  margin: s.$spacing-s 0 0;
  font-size: clamp(1.15rem, 2vw, 1.5rem);
  font-weight: 500;
  line-height: 1.3;
}

.hero__knapper {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 1rem;
  margin-top: s.$spacing-l;
  text-shadow: none;
}

.hero__knap-pink {
  background-color: c.$forest_pink100;
  color: c.$primary_black100;

  &:hover {
    background-color: c.$secondary_purple100;
    color: c.$primary_light25;
  }
}

.hero__knap-hvid {
  border-color: c.$primary_light25;
  color: c.$primary_light25;

  &:hover {
    background-color: c.$primary_light25;
    border-color: c.$primary_light25;
    color: c.$primary_darkgreen;
  }
}

.hero__knap-pink,
.hero__knap-hvid {
  &:focus-visible {
    outline: 3px solid c.$primary_light25;
    outline-offset: 3px;
  }
}

.hero__fakta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin: s.$spacing-s 0 0;
  padding: 0;
  list-style: none;

  li {
    font-size: 0.9rem;
    font-weight: 500;
    line-height: 1.6;
  }

  li + li::before {
    content: '·' / '';
    margin: 0 0.6rem;
  }

  // Mobil: linjen kan ikke være på én række, og så ville en prik ende alene
  // i starten af næste linje. Her bliver hvert faktum i stedet en lille pille
  // med lys kant, og pillerne bryder pænt over på flere linjer
  @media (max-width: 767px) {
    gap: 0.4rem;

    li {
      padding: 0.2rem 0.75rem;
      border: 1px solid rgba(c.$primary_light25, 0.45);
      border-radius: 2rem;
      background-color: rgba(c.$primary_black100, 0.25);
      font-size: 0.8rem;
      line-height: 1.5;
      white-space: nowrap;
    }

    li + li::before {
      content: none;
    }
  }
}

@media (max-width: 767px) {
  // Mobil: ingen fast højde – hero er kun så høj som teksten og knapperne
  .hero {
    min-height: auto;
  }

  // Badget ville ligge oven på overskriften, når hero er så lav, så det skjules
  .hero__trisse {
    display: none;
  }
}

@media (max-width: 1199px) {
  .hero {
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    gap: s.$spacing-l;
  }

  .hero__wire,
  .hero__trisse-hjul,
  .hero__trisse-snor {
    display: none;
  }

  .hero__trisse {
    left: auto;
    right: s.$spacing-m;
    top: s.$spacing-m;
    transform: none;
    transition: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__billede {
    transform: translate3d(6%, 0, 0) !important;
  }

  .hero__trisse {
    transition: none;
  }
}
</style>