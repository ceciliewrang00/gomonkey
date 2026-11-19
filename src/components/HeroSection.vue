<script setup>
// Den store sektion øverst på forsiden med baggrundsbillede, en wire og badges i trisser.
// Når man scroller, glider trisserne hen ad wiren, og billedet bevæger sig langsommere

import { ref, onMounted, onUnmounted } from 'vue'

import { hentBaner } from '@/services/baner.js'

import heroBillede from '@/assets/images/gomonkey_bane.webp'
import abeSvaev from '@/assets/images/Abe.svg'

// Banerne fra Firebase – bruges kun til at tælle dem
const baner = ref([])

// Henter banerne. Går det galt, viser badgen bare "8 klatrebaner"
onMounted(async () => {
  try {
    baner.value = await hentBaner()
  } catch (e) {
    console.error('Banerne kunne ikke hentes til hero', e)
  }
})

// Badgens egen titel – eller antallet af baner, hvis titel er null
function titelTekst(trisse) {
  return trisse.titel ?? `${baner.value.length || 8} klatrebaner`
}

// Elementerne i templaten, som vi måler og flytter
const heroEl = ref(null)
const billedeEl = ref(null)
const wireEl = ref(null)

// Trisserne på wiren. start og slut er, hvor på wiren trissen glider fra og til (0–1).
// snor = hvor langt badget hænger nede, vip = hvor skævt det hænger, abe = aben i stedet for badge
const TRISSER = [
  { id: 'abe', abe: true, start: 0.17, slut: 0.25, vip: '0deg' },
  { id: 'svaev', titel: '126 m svæv', under: 'parkens længste', start: 0.78, slut: 0.8, snor: '8.5rem', vip: '8deg' },
  { id: 'baner', titel: null, under: 'Næste stop: trætoppene', start: 0.91, slut: 0.93, snor: '5.25rem', vip: '-2deg' },
]
// Alle trisse-elementerne på siden
const trisseEls = ref([])

// true, hvis brugeren har slået "reducér bevægelse" til. Så står alt stille
let roligBevaegelse = false

// Id på den opdatering, der venter på at blive tegnet
let ventendeFrame = null

// Flytter hver trisse hen til sit punkt på wiren.
// fremskridt = hvor langt man har scrollet (0 = toppen, 1 = forbi hero)
function placerTrisser(fremskridt) {
  const wire = wireEl.value
  if (!wire) return
  const laengde = wire.getTotalLength()
  trisseEls.value.forEach((el) => {
    const trisse = TRISSER.find((t) => t.id === el.dataset.trisse)
    if (!trisse) return
    // Punktet på wiren mellem trissens start og slut, alt efter hvor langt man har scrollet
    const punkt = wire.getPointAtLength(laengde * (trisse.start + (trisse.slut - trisse.start) * fremskridt))
    // Giver punktet til CSS'en, som placerer trissen
    el.style.setProperty('--trisse-x', `${punkt.x}%`)
    el.style.setProperty('--trisse-y', `${punkt.y}%`)
  })
}

// Regner ud, hvor langt man har scrollet gennem hero, og flytter billedet og trisserne
function opdaterVedScroll() {
  ventendeFrame = null
  const hero = heroEl.value
  if (!hero) return

  const scroll = window.scrollY
  const hoejde = hero.offsetHeight
  // Er hero scrollet ud af syne, flyttes intet
  if (scroll > hoejde) return

  const fremskridt = Math.min(Math.max(scroll / hoejde, 0), 1)

  if (!roligBevaegelse && billedeEl.value) {
    // Desktop: billedet er skubbet 6 % til højre
    const forskydning = window.matchMedia('(max-width: 767px)').matches ? '0%' : '6%'
    // Billedet flyttes med en fjerdedel af scrollet, så det ser ud til at bevæge sig langsommere
    billedeEl.value.style.transform = `translate3d(${forskydning}, ${scroll * 0.25}px, 0)`
  }
  placerTrisser(roligBevaegelse ? 0 : fremskridt)
}

// Kører ved scroll og ændret vinduesstørrelse, men opdaterer højst én gang pr. skærmopdatering
function vedScroll() {
  if (!ventendeFrame) ventendeFrame = requestAnimationFrame(opdaterVedScroll)
}

// Tjekker "reducér bevægelse", placerer trisserne og begynder at lytte efter scroll
onMounted(() => {
  roligBevaegelse = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  opdaterVedScroll()
  window.addEventListener('scroll', vedScroll, { passive: true })
  window.addEventListener('resize', vedScroll)
})

// Fjerner lytterne igen, når man forlader forsiden
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
      <path ref="wireEl" d="M -2 2 Q 45 9 102 15" />
    </svg>

    <!-- Badges, der hænger i trisser på wiren -->
    <div
      v-for="trisse in TRISSER"
      :key="trisse.id"
      ref="trisseEls"
      :data-trisse="trisse.id"
      class="hero__trisse"
      :class="`hero__trisse--${trisse.id}`"
      :style="{ '--snor': trisse.snor, '--vip': trisse.vip }"
    >
      <!-- Aben har sin egen trisse i tegningen -->
      <span v-if="!trisse.abe" class="hero__trisse-hjul" aria-hidden="true"></span>

      <img v-if="trisse.abe" :src="abeSvaev" alt="" class="hero__abe" aria-hidden="true">

      <span v-if="!trisse.abe" class="hero__trisse-snor" aria-hidden="true"></span>
      <p v-if="!trisse.abe" class="hero__badge">
        <strong>{{ titelTekst(trisse) }}</strong>
        <span>{{ trisse.under }}</span>
      </p>
    </div>

    <!-- Indhold til venstre -->
    <div class="hero__indhold">
      <p class="hero__label">
        <img src="@/assets/images/forrest-ikon.webp" alt="" class="hero__label-ikon">
        Forest Odense
      </p>

      <h1>
        Hvor højt<br>
        tør du?
      </h1>

      <!-- h2 for strukturen, men samme udseende som h3 -->
      <h2 class="h3">Klatring, svæv og frit fald midt i skoven</h2>

      <div class="double-button hero__knapper">
        <a href="#baner" class="button-primary button-pink">Find din bane</a>
        <RouterLink to="/kort" class="button-secondary button-secondary--light">Se oversigtskort</RouterLink>
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
@use '@/assets/styles/mixins' as m;

.hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  align-items: center; /* Lodret centreret i højden */
  box-sizing: border-box;
  // Mindst 640px, ellers en skærm høj, men højst 750px
  min-height: clamp(640px, 100vh, 750px);
  padding-top: s.$sektion-luft;
  padding-bottom: s.$spacing-xl;
  @include m.section-black100;
}

.hero__billede {
  position: absolute;
  top: -15%;
  left: 0;
  z-index: -2;
  width: 100%;
  height: 115%;
  object-fit: cover;
  object-position: 30% 30%;
  transform: translate3d(6%, 0, 0);
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, transparent 10%, #000 55%);
  mask-image: linear-gradient(90deg, transparent 0%, transparent 10%, #000 55%);
  will-change: transform;
}

.hero__gradient {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: m.billede-gradient();
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
  // Drejer om hjulet, så snor og badge hænger skævt som et pendul
  transform-origin: 50% 0.45rem;
  transform: translate(-50%, -0.45rem) rotate(var(--vip, 0deg));
  transition: left 0.4s ease-out, top 0.4s ease-out;
  // Svinger en lille smule frem og tilbage
  animation: svinge 4.5s ease-in-out infinite;
}

// Den anden trisse svinger i sit eget tempo
.hero__trisse--baner {
  animation-duration: 5.5s;
  animation-delay: -2s;
}

@keyframes svinge {
  0%, 100% { transform: translate(-50%, -0.45rem) rotate(calc(var(--vip, 0deg) - 2deg)); }
  50% { transform: translate(-50%, -0.45rem) rotate(calc(var(--vip, 0deg) + 2deg)); }
}

/* Alt på wiren hænger som rigtigt udstyr: et trissehjul, en snor
   og et mærke med en lyserød ring, hvor snoren går ind */
.hero__trisse-hjul {
  position: relative;
  z-index: 1;
  width: 0.95rem;
  height: 0.95rem;
  box-sizing: border-box;
  border: 3px solid c.$primary_light25;
  border-radius: 50%;
  background-color: c.$primary_darkgreen;
  box-shadow: 0 1px 4px rgba(c.$primary_black100, 0.5);
}

.hero__trisse-snor {
  width: 1.5px;
  height: var(--snor, 1.75rem);  // længden sættes pr. trisse i TRISSER
  margin-top: -2px;
  background-color: rgba(c.$primary_light25, 0.9);
}

// Mærket, som snoren er bundet fast i
.hero__badge {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  margin: 0;
  padding: 0.7rem 1.1rem 0.6rem;
  border-radius: 0.8rem;
  background-color: c.$primary_light25;
  color: c.$primary_darkgreen;
  box-shadow:
    0 0.15rem 0.3rem rgba(c.$primary_black100, 0.2),
    0 0.75rem 1.75rem rgba(c.$primary_black100, 0.35);
  font-size: 0.75rem;
  line-height: 1.25;
  text-align: center;
  white-space: nowrap;

  // Ringen, hvor snoren er bundet fast
  &::before {
    content: '';
    position: absolute;
    top: -0.3rem;
    left: 50%;
    width: 0.6rem;
    height: 0.6rem;
    box-sizing: border-box;
    border: 2px solid c.$forest_pink100;
    border-radius: 50%;
    background-color: c.$primary_darkgreen;
    transform: translateX(-50%);
  }

  strong {
    font-size: 0.95rem;
    font-weight: 900;
    letter-spacing: -0.01em;
  }

  span {
    color: c.$primary_black75;
  }
}

/* Aben, der svæver på wiren. Tegningen flyttes, så abens egen trisse sidder på wiren,
   og den svinger mere, når man holder musen over den */
.hero__trisse--abe {
  // Pendulet drejer om trissen
  transform-origin: 50% 0.45rem;
  animation: abe-sving 3.5s ease-in-out infinite;
}

.hero__trisse--abe:hover {
  animation-duration: 0.9s;
}

@keyframes abe-sving {
  0%, 100% { transform: translate(-50%, -0.45rem) rotate(-7deg); }
  50% { transform: translate(-50%, -0.45rem) rotate(7deg); }
}

.hero__abe {
  display: block;
  width: 10rem;
  height: auto;
  // Flytter tegningen, så trissen står øverst i midten
  margin-top: 0.45rem;
  transform: translate(-7.1%, -21.4%);
  // Tynd lys kant, så aben kan ses på den mørke skov
  filter:
    drop-shadow(0 0 1px rgba(c.$primary_light25, 0.9))
    drop-shadow(0 0 1px rgba(c.$primary_light25, 0.9))
    drop-shadow(0 0.4rem 0.8rem rgba(c.$primary_black100, 0.35));
  cursor: pointer;
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
  gap: s.$spacing-xs;
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

.hero__knapper {
  margin-top: s.$spacing-l;
  text-shadow: none;
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

  // Mobil: hvert faktum bliver en lille pille, så de bryder pænt over på flere linjer
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
  // Mobil: hero er kun så høj som indholdet
  .hero {
    min-height: auto;
  }

  // Mobil: billedet er ikke skubbet til højre.
  // object-position flytter billedet vandret
  .hero__billede {
    object-position: 30% 30%;
  }

  // Badget ville ligge oven på overskriften, så det skjules
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

  // Kun "klatrebaner"-badget vises
  .hero__trisse--svaev,
  .hero__trisse--abe {
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

  // Ingen svingen
  .hero__trisse {
    transition: none;
    animation: none;
  }
}
</style>