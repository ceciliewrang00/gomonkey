<script setup>
// Den store sektion øverst på forsiden med baggrundsbillede, en wire og badges i trisser.
// Når man scroller, glider trisserne hen ad wiren, og billedet bevæger sig langsommere

import { ref, onMounted, onUnmounted } from 'vue'

import { hentBaner, harSvaerhedsgrad } from '@/services/baner.js'

import heroBillede from '@/assets/images/gomonkey_bane.webp'
import abeSvaev from '@/assets/images/Abe.svg'

// Banerne fra Firebase – bruges kun til at tælle dem
const baner = ref([])

// Henter banerne. Går det galt, viser badgen bare "7 klatrebaner"
onMounted(async () => {
  try {
    baner.value = await hentBaner()
  } catch (e) {
    console.error('Banerne kunne ikke hentes til hero', e)
  }
})

// Badgens egen titel – eller antallet af klatrebaner, hvis titel er null.
// Bounce tæller ikke med, fordi det er en aktivitet og ikke en klatrebane
function titelTekst(trisse) {
  const antal = baner.value.filter(harSvaerhedsgrad).length
  return trisse.titel ?? `${antal || 7} klatrebaner`
}

// Elementerne i templaten, som vi måler og flytter
const heroEl = ref(null)
const billedeEl = ref(null)
const wireEl = ref(null)

// Trisserne på wiren. start og slut er, hvor på wiren trissen glider fra og til (0–1).
// snor = hvor langt badget hænger nede, vip = hvor skævt det hænger, abe = aben i stedet for badge
const TRISSER = [
  // Aben hænger der, hvor skiltet med "126 m svæv" sad før
  { id: 'abe', abe: true, start: 0.72, slut: 0.74, vip: '0deg' },
  { id: 'baner', titel: null, under: 'Næste stop: trætoppene', start: 0.86, slut: 0.88, snor: '5.25rem', vip: '-2deg', link: '#bane-info' },
]
// link = skiltet kan klikkes og fører derhen. Skilte uden link er flade, så de ikke ligner knapper
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
      <!-- Skilt med link: kan klikkes og har en pil -->
      <a v-if="!trisse.abe && trisse.link" :href="trisse.link" class="hero__badge hero__badge--link">
        <strong class="h4">
          {{ titelTekst(trisse) }}
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </strong>
        <span class="etiket">{{ trisse.under }}</span>
      </a>
      <!-- Skilt uden link: fladt, uden skygge -->
      <p v-else-if="!trisse.abe" class="hero__badge">
        <strong class="h4">{{ titelTekst(trisse) }}</strong>
        <span class="etiket">{{ trisse.under }}</span>
      </p>
    </div>

    <!-- Indhold til venstre -->
    <div class="hero__indhold">
      <p class="hero__label etiket etiket--lys">
        <img src="@/assets/images/forrest-ikon.webp" alt="" class="hero__label-ikon">
        Forest Odense
      </p>

      <h1>
        Hvilken bane passer til dig?
      </h1>

      <!-- h2 for strukturen, men samme udseende som h3 -->
      <!-- På mobil starter "frit fald midt i skoven" på linje 2 -->
      <h2 class="h3">Klatring, svæv &<br class="hero__mobil-skift"> frit fald midt i skoven</h2>

      <div class="double-button hero__knapper">
        <a href="#baner" class="button-primary button-pink">Find din bane</a>
        <RouterLink to="/kort" class="button-primary">
          Se oversigtskort
          <!-- Samme pil som i "Se banerne"-knappen -->
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </RouterLink>
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
  border-radius: 1rem;
  background-color: c.$primary_light25;
  color: c.$primary_darkgreen;
  // Fladt: ingen skygge, så skiltet ikke ligner en knap
  box-shadow: none;
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

  // Titlen følger .h4 og undertitlen .etiket i _typography.scss
  strong {
    padding: 0;
  }
}

/* Skiltet "7 klatrebaner" kan klikkes og fører ned til baneoversigten.
   Skygge, pil og hover viser, at det er et link */
.hero__badge--link {
  text-decoration: none;
  cursor: pointer;
  box-shadow:
    0 0.15rem 0.3rem rgba(c.$primary_black100, 0.2),
    0 0.75rem 1.75rem rgba(c.$primary_black100, 0.35);
  transition: background-color 0.2s ease, color 0.2s ease;

  strong {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  svg {
    width: 0.9rem;
    height: 0.9rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 0.2s ease;
  }

  &:hover {
    background-color: c.$secondary_purple100;
    color: c.$primary_light25;

    span {
      color: c.$primary_light25;
    }

    svg {
      transform: translateX(3px);
    }
  }

  &:focus-visible {
    outline: 3px solid c.$primary_light25;
    outline-offset: 3px;
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
  // Teksten følger .etiket i _typography.scss
}

.hero__label-ikon {
  width: 2rem;
  height: 2rem;
  filter: brightness(0) invert(1);
}

// Linjeskiftet i undertitlen gælder kun på mobil
.hero__mobil-skift {
  display: none;

  @media (max-width: 767px) {
    display: inline;
  }
}

.hero__knapper {
  margin-top: s.$spacing-l;
  text-shadow: none;

  // Mobil: lidt luft over knapperne, og de står ved siden af hinanden
  @media (max-width: 767px) {
    margin-top: s.$spacing-s;
    flex-wrap: nowrap;
    gap: 0.5rem;

    > * {
      padding-inline: 0.9rem;
      white-space: nowrap;
    }
  }
}

.hero__fakta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin: s.$spacing-s 0 0;
  padding: 0;
  list-style: none;

  // Teksten følger brødtekst-reglerne for li i _typography.scss
  li + li::before {
    content: '·' / '';
    margin: 0 0.6rem;
  }

  // Mobil: de tre fakta står under hinanden, hver med en prik foran
  @media (max-width: 767px) {
    flex-direction: column;
    gap: 0.2rem;

    li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    // Prikken står foran alle tre i stedet for imellem dem
    li::before,
    li + li::before {
      content: '' / '';
      flex-shrink: 0;
      width: 0.35rem;
      height: 0.35rem;
      margin: 0;
      border-radius: 50%;
      background-color: c.$forest_pink100;
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