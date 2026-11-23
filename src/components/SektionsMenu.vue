<script setup>
// Forsidens egen menu med genveje til sektionerne om Forest Odense.
// Den hører kun til denne side og står derfor ikke i GoMonkeys fælles header,
// men øverst i main lige under headeren. Den bliver hængende under headeren, når man scroller.
// Sikkerhed har ingen egen sektion og fører til FAQ'en, hvor spørgsmålene om sikkerhed står

import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

import forestIkon from '@/assets/images/forrest-ikon.webp'

// Samme rækkefølge som sektionerne på siden (se HomeView.vue)
const LINKS = [
  { tekst: 'Kort', href: '#overblik' },
  { tekst: 'Find din bane', href: '#baner' },
  { tekst: 'Baner', href: '#bane-info' },
  { tekst: 'Priser', href: '#priser' },
  { tekst: 'Sikkerhed', href: '#faq' },
  { tekst: 'Kontakt', href: '#kontakt' },
]

// Headerens højde, så menuen hænger lige under den (headeren er højere på mobil end på desktop)
const headerHoejde = ref(0)
let observer = null

// Elementerne i templaten
const menuEl = ref(null)
const listeEl = ref(null)

// ---------- Aktivt link (stregen under) ----------

// Den sektion, man er ved lige nu, fx '#faq' (null = over den første, fx i hero)
const aktivSektion = ref(null)

// Det link, man sidst klikkede på. Bruges, hvis to links fører til samme sektion
const sidstKlikket = ref(null)

// Teksten på det link, der får stregen
const aktivtLink = computed(() => {
  const muligeLinks = LINKS.filter((l) => l.href === aktivSektion.value)
  if (!muligeLinks.length) return null
  return muligeLinks.find((l) => l.tekst === sidstKlikket.value)?.tekst ?? muligeLinks[0].tekst
})

// true, mens siden glider ned efter et klik. Så hopper stregen ikke forbi de sektioner, man passerer
let gliderEfterKlik = false
let stopTimer = null

// Finder den sektion, hvis top er kommet op under menuen
function findAktivSektion() {
  const graense = headerHoejde.value + (menuEl.value?.offsetHeight ?? 0) + 40
  let aktiv = null

  for (const href of new Set(LINKS.map((l) => l.href))) {
    const el = document.querySelector(href)
    if (el && el.getBoundingClientRect().top <= graense) {
      // Den sektion, der står længst nede på siden og er nået, vinder
      if (!aktiv || el.getBoundingClientRect().top > document.querySelector(aktiv).getBoundingClientRect().top) {
        aktiv = href
      }
    }
  }

  // Helt i bunden af siden er man ved kontakt, selvom footeren ikke når op til menuen
  const iBunden = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
  if (iBunden) aktiv = '#kontakt'

  aktivSektion.value = aktiv
}

// Ved scroll: vent med at opdatere, til siden er færdig med at glide efter et klik
function vedScroll() {
  if (!gliderEfterKlik) {
    findAktivSektion()
    return
  }
  clearTimeout(stopTimer)
  stopTimer = setTimeout(() => {
    gliderEfterKlik = false
    findAktivSektion()
  }, 150)
}

// Klik: stregen flytter sig med det samme til det link, man trykkede på
function vaelgLink(link) {
  sidstKlikket.value = link.tekst
  aktivSektion.value = link.href
  gliderEfterKlik = true
  clearTimeout(stopTimer)
  // Sker der ingen scroll (man er der allerede), slippes låsen igen
  stopTimer = setTimeout(() => { gliderEfterKlik = false }, 1200)
}

// Mobil: det aktive link scrolles ind i synsfeltet i menuen
watch(aktivtLink, async (tekst) => {
  await nextTick()
  const liste = listeEl.value
  const a = liste?.querySelector(`[data-link="${tekst}"]`)
  if (liste && a) liste.scrollTo({ left: a.offsetLeft - 16, behavior: 'smooth' })
})

// ---------- Udtoning i kanten, når der er flere links (mobil) ----------
// true, hvis der er links skjult til venstre / til højre
const merVenstre = ref(false)
const merHoejre = ref(false)
let listeObserver = null

function opdaterKanter() {
  const liste = listeEl.value
  if (!liste) return
  merVenstre.value = liste.scrollLeft > 2
  merHoejre.value = liste.scrollLeft + liste.clientWidth < liste.scrollWidth - 2
}

onMounted(() => {
  const header = document.querySelector('header')
  if (header) {
    observer = new ResizeObserver(() => {
      headerHoejde.value = header.offsetHeight
    })
    observer.observe(header)
  }

  // Tjekker kanterne, når man scroller i menuen, og når skærmen ændrer størrelse
  if (listeEl.value) {
    listeEl.value.addEventListener('scroll', opdaterKanter, { passive: true })
    listeObserver = new ResizeObserver(opdaterKanter)
    listeObserver.observe(listeEl.value)
  }

  window.addEventListener('scroll', vedScroll, { passive: true })
  findAktivSektion()
  opdaterKanter()
})

onUnmounted(() => {
  observer?.disconnect()
  listeObserver?.disconnect()
  listeEl.value?.removeEventListener('scroll', opdaterKanter)
  window.removeEventListener('scroll', vedScroll)
  clearTimeout(stopTimer)
})
</script>

<template>
  <div ref="menuEl" class="sektionsmenu" :style="{ '--header-hoejde': `${headerHoejde}px` }">
    <nav class="sektionsmenu__indhold" aria-label="Genveje til Forest Odense">
      <!-- Hvilken side menuen hører til -->
      <span class="sektionsmenu__navn etiket etiket--lys">
        <img :src="forestIkon" alt="" class="sektionsmenu__ikon">
        Forest Odense
      </span>

      <!-- Klasserne viser en udtoning i den side, hvor der er flere links at scrolle til -->
      <ul
        ref="listeEl"
        class="sektionsmenu__links"
        :class="{ 'mer-venstre': merVenstre, 'mer-hoejre': merHoejre }"
      >
        <li v-for="link in LINKS" :key="link.tekst">
          <!-- Det aktive link får en lyserød streg under og aria-current, så skærmlæsere også ved det -->
          <a
            :href="link.href"
            :data-link="link.tekst"
            class="lille-tekst"
            :class="{ aktiv: aktivtLink === link.tekst }"
            :aria-current="aktivtLink === link.tekst ? 'location' : undefined"
            @click="vaelgLink(link)"
          >{{ link.tekst }}</a>
        </li>
      </ul>
    </nav>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/spacings' as s;

// Mørkegrøn bar i fuld bredde, der hænger fast under headeren
.sektionsmenu {
  position: sticky;
  top: var(--header-hoejde, 0px);
  z-index: 15;
  background-color: c.$primary_darkgreen;
  color: c.$primary_light25;
  box-shadow: 0 1px 0 rgba(c.$primary_light25, 0.08);
}

// Indholdet flugter med sektionerne på siden
.sektionsmenu__indhold {
  display: flex;
  align-items: center;
  gap: s.$spacing-m;
  padding: 0.6rem max(#{s.$spacing-m}, calc((100% - #{s.$indhold-bredde}) / 2));
}

// "Forest Odense" med skov-ikonet, adskilt fra linkene med en tynd streg
.sektionsmenu__navn {
  display: none;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  padding-right: s.$spacing-m;
  border-right: 1px solid rgba(c.$primary_light25, 0.2);
  // Teksten følger .etiket i _typography.scss
  white-space: nowrap;

  // Vises fra tablet og op – på mobil er der kun plads til linkene
  @media (min-width: 768px) {
    display: flex;
  }
}

.sektionsmenu__ikon {
  width: 1.4rem;
  height: 1.4rem;
  filter: brightness(0) invert(1);
}

.sektionsmenu__links {
  display: flex;
  gap: 0.25rem;
  min-width: 0;
  margin: 0 0 0 -0.75rem;
  padding: 0;
  list-style: none;
  // Mobil: linkene står på én linje og kan scrolles sidelæns
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  // Udtoning i kanten, hvor der er flere links, så man kan se, at menuen kan scrolles
  &.mer-hoejre {
    mask-image: linear-gradient(to right, #000 calc(100% - 3rem), transparent);
  }

  &.mer-venstre {
    mask-image: linear-gradient(to left, #000 calc(100% - 3rem), transparent);
  }

  &.mer-venstre.mer-hoejre {
    mask-image: linear-gradient(to right, transparent, #000 3rem, #000 calc(100% - 3rem), transparent);
  }

  @media (min-width: 768px) {
    margin-left: -0.5rem;
  }

  li {
    flex-shrink: 0;
    padding: 0;
  }

  a {
    position: relative;
    display: block;
    padding: 0.5rem 0.75rem;
    color: rgba(c.$primary_light25, 0.8);
    // Teksten følger .lille-tekst i _typography.scss (14px, vægt 300)
    text-decoration: none;
    white-space: nowrap;
    transition: color 0.2s ease;

    // Stregen under linket. Den vokser frem, når linket bliver aktivt
    &::after {
      content: '';
      position: absolute;
      left: 0.75rem;
      right: 0.75rem;
      bottom: 0.15rem;
      height: 2px;
      border-radius: 2px;
      background-color: c.$forest_pink100;
      transform: scaleX(0);
      transition: transform 0.25s ease;
    }

    &:hover {
      color: c.$primary_light25;
    }

    // Aktivt link: lys tekst og lyserød streg under
    &.aktiv {
      color: c.$primary_light25;

      &::after {
        transform: scaleX(1);
      }
    }

    &:focus-visible {
      outline: 2px solid c.$forest_pink100;
      outline-offset: -2px;
      border-radius: 0.4rem;
    }

    @media (prefers-reduced-motion: reduce) {
      &::after {
        transition: none;
      }
    }
  }
}
</style>
