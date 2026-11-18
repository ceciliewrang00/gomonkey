<script setup>
// HERO – den store sektion øverst på forsiden (HomeView)
// Et baggrundsbillede, en wire (en buet SVG-streg) hen over billedet og nogle badges,
// der hænger i "trisser" på wiren. Når man scroller ned, glider trisserne lidt hen ad wiren,
// og billedet bevæger sig langsommere end siden (parallakse-effekt).
//
// Data:
//  - Banerne fra Firebase (services/baner.js) – bruges kun til at tælle dem, fx "8 klatrebaner"
import { ref, onMounted, onUnmounted } from 'vue'
import { hentBaner } from '@/services/baner.js'

import heroBillede from '@/assets/images/gomonkey_bane.webp'
import abeSvaev from '@/assets/images/Abe.svg'

// Alle baner fra Firebase (tom liste, indtil de er hentet)
const baner = ref([])

onMounted(async () => {
  try {
    baner.value = await hentBaner()
  } catch (e) {
    console.error('Banerne kunne ikke hentes til hero', e)
  }
})

// Titlen i badgen: badgens egen titel, eller antallet af baner, hvis titel er null
function titelTekst(trisse) {
  return trisse.titel ?? `${baner.value.length || 8} klatrebaner`
}

// Referencer til elementer i templaten (ref="heroEl" osv.), så vi kan måle og flytte dem
const heroEl = ref(null)
const billedeEl = ref(null)
const wireEl = ref(null)

// Trisserne på wiren. Hver har sin egen tekst og sit eget stykke af wiren
// (0 = wirens start til venstre, 1 = slutningen til højre).
// Trissen starter ved "start" og glider hen til "slut", mens man scroller forbi hero.
// titel: null = antallet af baner fra Firebase, fx "8 klatrebaner"
// snor: hvor langt badget hænger under wiren (længere = lavere)
// vip: hvor skævt badget hænger, som om det har sat i sving (0deg = lige)
// abe: true = i stedet for en badge hænger GoMonkey-aben på hovedet i halen fra wiren
const TRISSER = [
  { id: 'abe', abe: true, start: 0.17, slut: 0.25, vip: '0deg' },
  { id: 'svaev', titel: '126 m svæv', under: 'parkens længste', start: 0.78, slut: 0.8, snor: '8.5rem', vip: '8deg' },
  { id: 'baner', titel: null, under: 'Næste stop: trætoppene', start: 0.91, slut: 0.93, snor: '5.25rem', vip: '-2deg' },
]
// Alle trisse-elementerne på siden (ref="trisseEls" i v-for giver en liste)
const trisseEls = ref([])

// true, hvis brugeren har slået "reducér bevægelse" til i sit styresystem.
// Så står billedet og trisserne stille
let roligBevaegelse = false

// Id på den opdatering, der venter på at blive tegnet (se vedScroll)
let ventendeFrame = null

// Flytter hver trisse hen til sit punkt på wiren.
// Wiren tegnes i et 0–100-koordinatsystem, så punktet kan bruges direkte som procent
function placerTrisser(fremskridt) {
  const wire = wireEl.value
  if (!wire) return
  const laengde = wire.getTotalLength()
  trisseEls.value.forEach((el) => {
    const trisse = TRISSER.find((t) => t.id === el.dataset.trisse)
    if (!trisse) return
    const punkt = wire.getPointAtLength(laengde * (trisse.start + (trisse.slut - trisse.start) * fremskridt))
    el.style.setProperty('--trisse-x', `${punkt.x}%`)
    el.style.setProperty('--trisse-y', `${punkt.y}%`)
  })
}

// Regner ud, hvor langt man har scrollet ned gennem hero (fremskridt: 0 = toppen, 1 = forbi),
// og flytter billedet og trisserne derefter
function opdaterVedScroll() {
  ventendeFrame = null
  const hero = heroEl.value
  if (!hero) return

  const scroll = window.scrollY
  const hoejde = hero.offsetHeight
  // Er hero scrollet helt ud af syne, er der ingen grund til at flytte noget
  if (scroll > hoejde) return

  const fremskridt = Math.min(Math.max(scroll / hoejde, 0), 1)

  if (!roligBevaegelse && billedeEl.value) {
    // Desktop: billedet er skubbet 6 % til højre. Mobil: ingen forskydning (se CSS)
    const forskydning = window.matchMedia('(max-width: 767px)').matches ? '0%' : '6%'
    // Billedet flyttes 25 % af scroll-afstanden ned, så det ser ud til at bevæge sig langsommere
    billedeEl.value.style.transform = `translate3d(${forskydning}, ${scroll * 0.25}px, 0)`
  }
  placerTrisser(roligBevaegelse ? 0 : fremskridt)
}

// Kører, hver gang man scroller eller ændrer vinduets størrelse.
// scroll kan ske mange gange i sekundet, så vi beder browseren om at køre opdaterVedScroll
// én gang ved næste skærmopdatering (requestAnimationFrame) i stedet for hver eneste gang
function vedScroll() {
  if (!ventendeFrame) ventendeFrame = requestAnimationFrame(opdaterVedScroll)
}

// Når hero er vist: tjek "reducér bevægelse", placér trisserne og begynd at lytte efter scroll
onMounted(() => {
  roligBevaegelse = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  opdaterVedScroll()
  window.addEventListener('scroll', vedScroll, { passive: true })
  window.addEventListener('resize', vedScroll)
})

// Når man forlader forsiden, fjernes lytterne igen, så de ikke kører videre på andre sider
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

    <!-- Badges, der hænger i trisser på wiren. Teksterne står i TRISSER i scriptet -->
    <div
      v-for="trisse in TRISSER"
      :key="trisse.id"
      ref="trisseEls"
      :data-trisse="trisse.id"
      class="hero__trisse"
      :class="`hero__trisse--${trisse.id}`"
      :style="{ '--snor': trisse.snor, '--vip': trisse.vip }"
    >
      <!-- Aben har sin egen trisse i tegningen, så den får ikke det almindelige hjul -->
      <span v-if="!trisse.abe" class="hero__trisse-hjul" aria-hidden="true"></span>

      <!-- Aben, der svæver på wiren (Abe.svg). Kun pynt -->
      <img v-if="trisse.abe" :src="abeSvaev" alt="" class="hero__abe" aria-hidden="true">

      <span v-if="!trisse.abe" class="hero__trisse-snor" aria-hidden="true"></span>
      <p v-if="!trisse.abe" class="hero__badge">
        <strong>{{ titelTekst(trisse) }}</strong>
        <span>{{ trisse.under }}</span>
      </p>
    </div>

    <!-- Indhold til venstre, lodret centreret -->
    <div class="hero__indhold">
      <p class="hero__label">
        <img src="@/assets/images/forrest-ikon.webp" alt="" class="hero__label-ikon">
        Forest Odense
      </p>

      <h1>
        Hvor højt<br>
        tør du?
      </h1>

      <!-- h2 for strukturen, men samme udseende som h3 (.h3 fra _typography.scss) -->
      <h2 class="h3">Klatring, svæv og frit fald midt i skoven</h2>

      <!-- .double-button og knapperne kommer fra main.scss og _buttons.scss -->
      <div class="double-button hero__knapper">
        <a href="#baner" class="button-primary button-pink">Find din bane</a>
        <!-- RouterLink til kortsiden (/kort), ligesom "Se det fulde kort" længere nede -->
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
  // Mørk baggrund og lys tekst – samme mixin som de andre mørke sektioner
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
  // Samme gradient som banner-sektionen (billede-gradient i _mixins.scss)
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
  // Drejer om hjulet (toppen), så snor og badge hænger skævt som et pendul.
  // --vip sættes pr. trisse i TRISSER
  transform-origin: 50% 0.45rem;
  transform: translate(-50%, -0.45rem) rotate(var(--vip, 0deg));
  transition: left 0.4s ease-out, top 0.4s ease-out;
  // Svinger en lille smule frem og tilbage omkring sin skæve vinkel
  animation: svinge 4.5s ease-in-out infinite;
}

// Den anden trisse svinger i sit eget tempo, så de ikke bevæger sig i takt
.hero__trisse--baner {
  animation-duration: 5.5s;
  animation-delay: -2s;
}

@keyframes svinge {
  0%, 100% { transform: translate(-50%, -0.45rem) rotate(calc(var(--vip, 0deg) - 2deg)); }
  50% { transform: translate(-50%, -0.45rem) rotate(calc(var(--vip, 0deg) + 2deg)); }
}

/* --- Den røde tråd på wiren ---
   Alt på wiren hænger på samme måde, som rigtigt udstyr i parken:
   - et lyst trissehjul med mørk midte på wiren
   - en tynd lys snor ned
   - et lyst "mærke" (som et skilt på en bane) med et hul i toppen, hvor snoren går ind.
   Hullet har en lyserød ring – den lyserøde farve går igen i aben, så alt hænger sammen */
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
  height: var(--snor, 1.75rem); // Længden sættes pr. trisse i TRISSER
  margin-top: -2px;
  background-color: rgba(c.$primary_light25, 0.9);
}

// Mærket. Snoren er bundet i en lille ring, der sidder på mærkets øverste kant
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

  // Ringen på mærkets øverste kant, hvor snoren er bundet fast
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

/* --- Aben, der svæver på wiren ---
   Tegningen (Abe.svg) har sin egen trisse øverst. Trissens punkt ligger
   57,1 % inde og 21,4 % nede i tegningen – billedet flyttes, så netop det punkt
   sidder på wiren. Så svinger aben også om trissen som et pendul.
   Aben svinger mere end badgerne – og rigtig meget, når man holder musen over den */
.hero__trisse--abe {
  // Pendulets omdrejningspunkt = trissen (se margin-top på .hero__abe)
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
  // Flytter tegningen, så trissen (57,1 % / 21,4 %) står i containerens midte øverst
  margin-top: 0.45rem;
  transform: translate(-7.1%, -21.4%);
  // Tynd lys kant rundt om aben, så den mørkegrønne abe kan ses på den mørke skov
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

  // Mobil: billedet er ikke skubbet til højre (det er det kun på desktop).
  // Udtoningen i venstre side (mask-image) er den samme som på desktop, så teksten
  // står på mørk baggrund. Det første tal i object-position flytter billedet vandret:
  // større tal = pigen længere til venstre, mindre tal = længere til højre
  .hero__billede {
    object-position: 30% 30%;
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

  // Kun "klatrebaner"-badget vises her – ellers ville de ligge oven på hinanden
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

  // Ingen svingen – badgen hænger bare stille i sin skæve vinkel
  .hero__trisse {
    transition: none;
    animation: none;
  }
}
</style>