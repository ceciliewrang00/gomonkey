<script setup>
// ==========================================
// INTERAKTIVT KORT
// ==========================================
// Viser kortet over GoMonkey, hvor man kan zoome, trække og klikke på baner.
//
// Overblik over, hvad der sker:
// 1. Når komponenten vises (onMounted), hentes to ting på samme tid:
//    - banedata fra Firebase (hvilke baner der findes, deres farver og streger)
//    - selve kort-tegningen (public/kort-base.svg)
// 2. Banernes streger tegnes ind i SVG'en, og hver bane gøres klikbar.
// 3. SVG'en sættes ind i <div ref="kortHolder"> i templaten.
// 4. Zoom og træk ændrer kun SVG'ens viewBox (udregningerne ligger i kortKamera.js).
//
// SVG'en indsættes med JavaScript og ikke med Vue-template. Derfor bruger vi
// almindelige DOM-funktioner (querySelector, classList, addEventListener) på den.

// Vue-funktioner:
// ref = en værdi, Vue holder øje med. Ændres den, opdateres siden automatisk
// computed = en værdi, der regnes ud fra andre værdier og opdateres af sig selv
// watch = kør en funktion, hver gang en bestemt værdi ændrer sig
// onMounted / onBeforeUnmount = kør kode, når komponenten vises / fjernes
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'

// Henter banerne fra Firebase (se src/services/kortApi.js)
import { hentKortbaner } from '@/services/kortApi.js'

// Knappen, der går tilbage til forrige side
import TilbageKnap from '@/components/TilbageKnap.vue'

// Kamera-matematikken (se src/utils/kortKamera.js)
import {
  KORT_BREDDE,
  KORT_HOEJDE,
  MAKS_ZOOM,
  begraens,
  beregnViewBox
} from '@/utils/kortKamera.js'

// 1. MODTAG FILTER PROPPEN FRA KORTVIEW.VUE
// En prop er en værdi, som forælder-komponenten (KortView.vue) sender ind.
// filter er enten 'alle' eller en liste af bane-id'er, fx ['gron-1', 'rod']
const props = defineProps({
  filter: {
    type: [String, Array],
    default: 'alle'
  }
})

// emit = send en besked op til forælder-komponenten.
// 'bane-valgt' sendes, når man klikker på en bane
const emit = defineEmits(['bane-valgt'])

// Peger på <div ref="kortHolder"> i templaten, hvor SVG'en sættes ind
const kortHolder = ref(null)

// Alle baner fra Firebase
const baner = ref([])

// Id på den bane, man har klikket på (null = ingen)
const valgtId = ref(null)

// Id på den bane, musen er over lige nu (null = ingen)
const hoverId = ref(null)

// Hvor meget der er zoomet ind (1 = hele parken)
const zoom = ref(1)

// true, mens kortet hentes. fejl indeholder en fejlbesked, hvis noget går galt
const indlaeser = ref(true)
const fejl = ref('')

// Finder hele bane-objektet for den valgte bane (bruges til boksen nederst)
const valgtBane = computed(() =>
  baner.value.find(b => b.id === valgtId.value)
)

// Almindelige variabler (ikke ref), fordi siden ikke skal opdateres, når de ændrer sig:
// svg = SVG-elementet, når det er indlæst
// observer = holder øje med, om kortets boks skifter størrelse
// controller = kan afbryde hentningen, hvis man forlader siden
let svg
let observer
let controller

// Fingre/mus, der lige nu trykker på kortet. Nøglen er pointerId
const fingre = new Map()

// Info om en igangværende knib-zoom med to fingre (null = ingen)
let pinch = null

// Tidspunkt for sidste træk. Bruges til at skelne mellem "klik" og "træk"
let sidstTraekket = 0

// Det punkt på kortet, der står midt i boksen. Starter midt på kortet
let center = {
  x: KORT_BREDDE / 2,
  y: KORT_HOEJDE / 2
}

// Den aktuelle viewBox ({ x, y, width, height }), som beregnViewBox gav
let view

// ==========================================
// NY DEL: FILTRERING AF KORTET
// ==========================================
// Tonér de baner ned, som ikke er valgt i filteret.
// Alle klikbare dele af en bane har attributten data-bane="<bane-id>"
function opdaterFiltrering() {
  if (!svg) return

  svg.querySelectorAll('[data-bane]').forEach(element => {
    const baneId = element.dataset.bane

    if (props.filter === 'alle') {
      // Intet filter: vis alle baner normalt
      element.classList.remove('er-skaermet')
    } else if (Array.isArray(props.filter)) {
      const erValgt = props.filter.includes(baneId)
      // Sætter en klasse der kan tone elementet ned eller skjule det
      // toggle(klasse, true) tilføjer klassen, toggle(klasse, false) fjerner den
      element.classList.toggle('er-skaermet', !erValgt)
    }
  })
}

// Lyt efter ændringer i filteret fra App.vue
// (filteret kommer nu fra KortView.vue via prop'en)
watch(() => props.filter, opdaterFiltrering)


// ==========================================
// 2. ZOOM OG KORTETS POSITION
// ==========================================

// Regner viewBox ud fra center og zoom og sætter den på SVG'en.
// Kaldes efter hver zoom, hvert træk og når boksen skifter størrelse
function opdaterKort() {
  if (!svg || !kortHolder.value) return

  // Boksens størrelse på skærmen i pixels
  const { width, height } = kortHolder.value.getBoundingClientRect()

  view = beregnViewBox({
    center,
    zoom: zoom.value,
    viewportWidth: width,
    viewportHeight: height
  })

  // beregnViewBox kan have flyttet centeret, hvis man trak for langt ud
  center = view.center

  svg.setAttribute(
    'viewBox',
    `${view.x} ${view.y} ${view.width} ${view.height}`
  )
}

// Zoomer til et nyt niveau.
// anker er det punkt i boksen, der zoomes omkring (0.5, 0.5 = midten).
// Ved zoom med musehjul er ankeret der, hvor musen står, så det punkt bliver stående
function saetZoom(nyZoom, anker = { x: 0.5, y: 0.5 }) {
  if (!svg || !view) return

  // Hold zoom mellem 1 og MAKS_ZOOM. Stop, hvis der ikke er nogen ændring
  const nytNiveau = begraens(nyZoom, 1, MAKS_ZOOM)
  if (nytNiveau === zoom.value) return

  // Punktet på kortet (i SVG-koordinater), som ligger under ankeret lige nu
  const punktX = view.x + view.width * anker.x
  const punktY = view.y + view.height * anker.y

  const { width, height } = kortHolder.value.getBoundingClientRect()

  // Hvor stor bliver viewBox'en ved det nye zoomniveau?
  const nyView = beregnViewBox({
    center,
    zoom: nytNiveau,
    viewportWidth: width,
    viewportHeight: height
  })

  // Flyt centeret, så punktet under ankeret bliver på samme sted på skærmen
  center = {
    x: punktX + (0.5 - anker.x) * nyView.width,
    y: punktY + (0.5 - anker.y) * nyView.height
  }

  zoom.value = nytNiveau
  opdaterKort()
}

// "Vis hele parken": tilbage til zoom 1 og midten af kortet
function nulstilKort() {
  zoom.value = 1
  center = {
    x: KORT_BREDDE / 2,
    y: KORT_HOEJDE / 2
  }
  opdaterKort()
}

// Flytter kortet. dx og dy er, hvor mange pixels fingeren/musen har flyttet sig.
// Pixels omregnes til SVG-koordinater, så kortet følger fingeren præcist.
// Minus, fordi kortet skal flytte sig med fingeren (centeret flytter modsat)
function panorer(dx, dy) {
  const { width, height } = kortHolder.value.getBoundingClientRect()
  center.x -= dx / width * view.width
  center.y -= dy / height * view.height
  opdaterKort()
}

// Omregner en position på skærmen (clientX/clientY) til en placering i boksen
// fra 0 til 1. Eksempel: (0, 0) = øverste venstre hjørne, (1, 1) = nederste højre
function ankerPunkt(x, y) {
  const r = kortHolder.value.getBoundingClientRect()
  return {
    x: begraens((x - r.left) / r.width, 0, 1),
    y: begraens((y - r.top) / r.height, 0, 1)
  }
}

// Zoom med musehjul eller touchpad.
// deltaY er, hvor meget der er scrollet (negativ = op = zoom ind).
// Math.exp giver en jævn zoom, og begraens forhindrer meget store spring
function vedHjul(event) {
  const faktor = Math.exp(
    -begraens(event.deltaY, -120, 120) * 0.0017
  )
  saetZoom(
    zoom.value * faktor,
    ankerPunkt(event.clientX, event.clientY)
  )
}


// ==========================================
// 3. MUS OG TOUCH
// ==========================================
// Vi bruger "pointer events", som virker ens for mus, finger og pen.
// - pointerNed: en finger/mus trykkes ned
// - pointerFlyt: den flyttes
// - pointerOp: den slippes
// Én finger = træk kortet. To fingre = knib for at zoome.

// De to første fingre på skærmen
function fingerPar() {
  return [...fingre.values()].slice(0, 2)
}

// Afstanden mellem to fingre (Pythagoras)
function fingerAfstand(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// Punktet midt mellem to fingre
function fingerMidte(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  }
}

function pointerNed(event) {
  // Ignorér højreklik og midterklik (kun venstre museknap, button 0, tæller)
  if (!svg || (event.pointerType === 'mouse' && event.button !== 0)) return

  // Husk fingeren: hvor den er nu, hvor den startede, og om den har flyttet sig
  fingre.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
    startX: event.clientX,
    startY: event.clientY,
    flyttet: false
  })

  // Anden finger rører skærmen: start knib-zoom
  if (fingre.size === 2) {
    const [a, b] = fingerPar()
    pinch = {
      afstand: fingerAfstand(a, b),
      midte: fingerMidte(a, b)
    }

    // "Capture" gør, at vi stadig får bevægelserne, selv hvis fingrene
    // glider uden for kortet. try/catch, fordi det kan fejle i sjældne tilfælde
    for (const id of fingre.keys()) {
      try {
        kortHolder.value.setPointerCapture(id)
      } catch {}
    }
    sidstTraekket = performance.now()
  }
}

function pointerFlyt(event) {
  const finger = fingre.get(event.pointerId)
  // Ingen trykket finger (fx musen bevæges bare hen over kortet): gør intet
  if (!finger || !view) return

  // Hvor meget har fingeren flyttet sig siden sidst?
  const dx = event.clientX - finger.x
  const dy = event.clientY - finger.y

  finger.x = event.clientX
  finger.y = event.clientY

  // To fingre: knib-zoom
  if (fingre.size >= 2) {
    const [a, b] = fingerPar()
    const afstand = fingerAfstand(a, b)
    const midte = fingerMidte(a, b)

    if (pinch) {
      // Fingrene længere fra hinanden = zoom ind, tættere sammen = zoom ud
      saetZoom(
        zoom.value * afstand / Math.max(1, pinch.afstand),
        ankerPunkt(pinch.midte.x, pinch.midte.y)
      )
      // Flytter man begge fingre samtidig, flyttes kortet også
      panorer(
        midte.x - pinch.midte.x,
        midte.y - pinch.midte.y
      )
    }

    // Gem den nye afstand og midte til næste bevægelse
    pinch = { afstand, midte }
    sidstTraekket = performance.now()
    return
  }

  // Én finger: vent, til den har flyttet sig mindst 5 pixels.
  // Ellers ville et almindeligt klik på en bane blive set som et træk
  if (
    !finger.flyttet &&
    Math.hypot(
      finger.x - finger.startX,
      finger.y - finger.startY
    ) < 5
  ) return

  // Første gang fingeren flytter sig: det er et træk, og vi "fanger" den
  if (!finger.flyttet) {
    finger.flyttet = true
    try {
      kortHolder.value.setPointerCapture(event.pointerId)
    } catch {}
  }

  panorer(dx, dy)
  sidstTraekket = performance.now()
}

function pointerOp(event) {
  const finger = fingre.get(event.pointerId)
  if (!finger) return

  // Var det et træk eller knib, husker vi tidspunktet, så det ikke bliver et klik
  if (finger.flyttet || pinch) {
    sidstTraekket = performance.now()
  }

  // Glem fingeren og stop knib-zoom
  fingre.delete(event.pointerId)
  pinch = null

  // Slip "capture" igen
  if (kortHolder.value?.hasPointerCapture?.(event.pointerId)) {
    try {
      kortHolder.value.releasePointerCapture(event.pointerId)
    } catch {}
  }

  // Løftes én af to fingre, starter den tilbageværende finger forfra,
  // så kortet ikke hopper
  if (fingre.size === 1) {
    const sidste = [...fingre.values()][0]
    sidste.startX = sidste.x
    sidste.startY = sidste.y
    sidste.flyttet = false
  }
}

// Browseren sender et "click", når man slipper musen – også efter et træk.
// Var der et træk inden for de sidste 250 ms, stoppes klikket, så man ikke
// kommer til at vælge en bane, bare fordi man slap kortet oven på den
function stopKlikEfterTraek(event) {
  if (performance.now() - sidstTraekket < 250) {
    event.preventDefault()
    event.stopPropagation()
  }
}


// ==========================================
// 4. BANEVALG OG MARKERING
// ==========================================

// Vælger en bane. Klikker man på den valgte bane igen, fravælges den.
// Den valgte bane sendes op til KortView.vue med emit
function vaelgBane(id) {
  if (performance.now() - sidstTraekket < 250) return
  valgtId.value = valgtId.value === id ? null : id
  emit('bane-valgt', valgtId.value)
}

// Gør en del af SVG'en klikbar for en bestemt bane.
// role, tabindex og aria-label gør, at den også kan bruges med tastatur og skærmlæser
function goerKlikbar(element, bane) {
  element.classList.add('kort-klikbar')
  element.setAttribute('role', 'button')
  element.setAttribute('tabindex', '0')
  element.setAttribute('aria-label', `Vælg ${bane.navn}`)

  // Klik med mus eller finger
  element.addEventListener('click', () => {
    vaelgBane(bane.id)
  })

  // Enter eller mellemrum, når elementet har fokus (tastatur)
  element.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      vaelgBane(bane.id)
    }
  })

  // Musen kommer ind over banen / forlader den igen
  element.addEventListener('pointerenter', () => {
    hoverId.value = bane.id
  })

  element.addEventListener('pointerleave', () => {
    hoverId.value = null
  })
}

// Fremhæver den bane, musen er over – ellers den valgte bane.
// Klassen er-aktiv giver den hvide glød (se stylingen i indlaesKort)
function opdaterMarkering() {
  if (!svg) return
  const aktiv = hoverId.value || valgtId.value

  svg.querySelectorAll('[data-bane]').forEach(element => {
    element.classList.toggle(
      'er-aktiv',
      element.dataset.bane === aktiv
    )
  })
}

// Opdater markeringen, hver gang den valgte bane eller hover ændrer sig
watch([valgtId, hoverId], opdaterMarkering)


// ==========================================
// 5. FIREBASE OG SVG
// ==========================================

// Henter banedata og SVG-tegningen og bygger det interaktive kort.
// Kaldes, når siden åbnes, og når man trykker "Prøv igen" efter en fejl
async function indlaesKort() {
  indlaeser.value = true
  fejl.value = ''

  // Afbryd en tidligere hentning, der stadig er i gang, og lav en ny "afbryder"
  controller?.abort()
  controller = new AbortController()

  try {
    // Promise.all henter begge ting på samme tid og venter, til begge er færdige
    const [data, svar] = await Promise.all([
      hentKortbaner({ signal: controller.signal }),
      // BASE_URL er sitets rodadresse. SVG-filen ligger i public/
      fetch(
        `${import.meta.env.BASE_URL}kort-base.svg`,
        { signal: controller.signal }
      )
    ])

    if (!svar.ok) {
      throw new Error('Kunne ikke hente SVG-kortet')
    }

    baner.value = data.baner

    // Laver SVG-teksten om til et rigtigt SVG-dokument, vi kan arbejde med
    const dokument = new DOMParser().parseFromString(
      await svar.text(),
      'image/svg+xml'
    )

    // DOMParser giver et <parsererror>-element, hvis filen er ødelagt
    if (dokument.querySelector('parsererror')) {
      throw new Error('SVG-filen er ugyldig')
    }

    // SVG'en skal fylde hele boksen. "meet" = vis hele viewBox'en uden at strække
    svg = dokument.documentElement
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')

    // --- Tegn banernes streger ind i SVG'en ---
    // Hver bane består af et eller flere segmenter (stykker af banen).
    // segment.slot er id'et på en tom gruppe (<g>) i SVG'en, hvor stregerne skal ind.
    // segment.paths er stregerne fra Firebase (d = selve stregens form)
    for (const bane of baner.value) {
      for (const segment of bane.segmenter ?? []) {
        const gruppe = svg.querySelector(`[id="${segment.slot}"]`)

        // Mangler gruppen i SVG'en, eller mangler streg nr. 2, stopper vi med en fejl
        if (!gruppe || !segment.paths?.[1]) {
          throw new Error(`Manglende SVG-data: ${segment.slot}`)
        }

        // Marker gruppen som en del af denne bane
        gruppe.classList.add('bane-segment')
        gruppe.dataset.bane = bane.id

        // Lav et <path>-element pr. streg og sæt det ind i gruppen
        for (const sti of segment.paths) {
          const path = dokument.createElementNS(
            'http://www.w3.org/2000/svg',
            'path'
          )
          path.setAttribute('class', sti.class)
          path.setAttribute('d', sti.d)
          gruppe.appendChild(path)
        }

        // En usynlig, tyk kopi af stregen ovenpå. Den gør banen nemmere at ramme,
        // fordi selve stregen er tynd (se .bane-hit i stylingen nedenfor)
        const kliksti = dokument.createElementNS(
          'http://www.w3.org/2000/svg',
          'path'
        )
        kliksti.setAttribute('class', 'bane-hit')
        kliksti.setAttribute('d', segment.paths[1].d)
        gruppe.appendChild(kliksti)

        goerKlikbar(gruppe, bane)
      }
    }

    // --- Gør skiltene (bannerne) med banenavne klikbare ---
    // Grupperne i #Banner har ingen id'er, så vi matcher dem på rækkefølge:
    // første skilt = 'gron-1', andet = 'gron-2' osv.
    // Ændres rækkefølgen i SVG-filen, skal listen her også ændres
    const labelIds = [
      'gron-1',
      'gron-2',
      'bla-1',
      'bla-2',
      'rod',
      'sort',
      'bounce',
      'bla-3'
    ]

    svg.querySelectorAll('#Banner > g').forEach((gruppe, i) => {
      const bane = baner.value.find(b => b.id === labelIds[i])
      if (bane) {
        gruppe.dataset.bane = bane.id
        goerKlikbar(gruppe, bane)
      }
    })

    // --- Aktiviteterne Free Fall og Bounce ---
    // De har ingen banestreger, så vi gør deres tegninger i SVG'en klikbare i stedet
    for (const [id, gruppeId] of [
      ['sort', 'Free-Fall'],
      ['bounce', 'Bounce']
    ]) {
      const gruppe = svg.querySelector(`[id="${gruppeId}"]`)
      const bane = baner.value.find(b => b.id === id)

      if (gruppe && bane) {
        gruppe.dataset.bane = id
        goerKlikbar(gruppe, bane)
      }
    }

    // --- Styling inde i SVG'en ---
    // Lægges direkte ind i SVG'en som et <style>-element, fordi Vue's
    // scoped styles ikke kan ramme elementer, der er indsat med JavaScript
    const stil = dokument.createElementNS(
      'http://www.w3.org/2000/svg',
      'style'
    )

    stil.textContent = `
      .kort-klikbar {
        cursor: pointer;
      }

      .bane-hit {
        stroke: transparent;
        stroke-width: 31px;
        stroke-linecap: round;
        fill: none;
        pointer-events: stroke;
      }

      .bane-segment.er-aktiv > path:nth-child(2) {
        stroke-width: 16px;
        filter: drop-shadow(0 0 5px white);
      }

      [data-bane].er-aktiv:not(.bane-segment) {
        filter:
          drop-shadow(0 0 8px white)
          drop-shadow(0 0 12px white);
      }

      .aktivitet-kontur {
        opacity: 0;
        pointer-events: none;
        fill: none;
        stroke: white;
        stroke-width: 11px;
        stroke-linecap: round;
        stroke-linejoin: round;
        filter: drop-shadow(0 0 7px white);
      }

      .aktivitet-kontur.er-aktiv {
        opacity: 1;
      }

      /* SKJULER/TONER BANER NED NÅR DE IKKE ER VALGT I FILTERET */
      [data-bane].er-skaermet {
        opacity: 0.2;
        transition: opacity 0.3s ease;
      }
    `

    svg.appendChild(stil)

    // Sæt den færdige SVG ind på siden (erstatter det, der var i boksen før)
    kortHolder.value.replaceChildren(svg)

    // --- Hvide konturer, der lyser op, når Bounce eller Free Fall er aktiv ---
    const trampolin = svg.querySelector('#Bounce > path.st25')
    const fritFald = svg.querySelector('#Free-Fall')

    if (!trampolin || !fritFald) {
      throw new Error('Kunne ikke finde Bounce eller Free Fall i SVG-kortet')
    }

    // Bounce: en kopi af trampolinens omrids
    const bounceKontur = dokument.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    )
    bounceKontur.setAttribute('d', trampolin.getAttribute('d'))
    bounceKontur.setAttribute('class', 'aktivitet-kontur')
    bounceKontur.dataset.bane = 'bounce'
    svg.appendChild(bounceKontur)

    // Free Fall: en afrundet firkant rundt om tegningen.
    // getBBox giver tegningens position og størrelse. Virker kun, når SVG'en er
    // sat ind på siden – derfor sker det efter replaceChildren ovenfor
    const boks = fritFald.getBBox()
    const sortKontur = dokument.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect'
    )
    sortKontur.setAttribute('x', boks.x - 10)
    sortKontur.setAttribute('y', boks.y - 10)
    sortKontur.setAttribute('width', boks.width + 20)
    sortKontur.setAttribute('height', boks.height + 20)
    sortKontur.setAttribute('rx', '18')
    sortKontur.setAttribute('class', 'aktivitet-kontur')
    sortKontur.dataset.bane = 'sort'
    svg.appendChild(sortKontur)

    // Start med hele parken, og vis markering og filter med det samme
    nulstilKort()
    opdaterMarkering()
    opdaterFiltrering() // Kør filtrering med det samme kortet er indlæst

  } catch (error) {
    // AbortError betyder bare, at vi selv afbrød hentningen – det er ikke en fejl
    if (error.name !== 'AbortError') {
      fejl.value = error.message
      console.error(error)
    }
  } finally {
    // Kører altid til sidst, uanset om det lykkedes eller fejlede
    indlaeser.value = false
  }
}


// ==========================================
// 6. START OG OPRYDNING
// ==========================================

onMounted(() => {
  // Opdater kortet, hver gang boksen skifter størrelse (fx når vinduet ændres)
  observer = new ResizeObserver(opdaterKort)
  observer.observe(kortHolder.value)

  // Lyt på hele vinduet, så vi også opdager, at man slipper uden for kortet
  window.addEventListener('pointerup', pointerOp)
  window.addEventListener('pointercancel', pointerOp)

  indlaesKort()
})

// Ryd op, når man forlader siden, så intet kører videre i baggrunden
onBeforeUnmount(() => {
  controller?.abort()
  observer?.disconnect()

  window.removeEventListener('pointerup', pointerOp)
  window.removeEventListener('pointercancel', pointerOp)

  fingre.clear()
})

</script>

<template>
  <section class="kort-shell" aria-label="GoMonkey interaktivt kort">
    <!-- Scenen: kortet i bunden, og knapper/bokse lagt ovenpå (position: absolute) -->
    <div class="kort-stage">
      <!-- Her sætter indlaesKort() SVG'en ind. Den er tom i starten.
           Musen, fingre og musehjul fanges her og styrer zoom og træk.
           touch-action: none stopper browserens egen zoom/scroll på touch -->
      <div
        ref="kortHolder"
        class="kort-visning"
        style="touch-action: none"
        role="region"
        aria-label="Kort over GoMonkey."
        @pointerdown="pointerNed"
        @pointermove="pointerFlyt"
        @pointerup="pointerOp"
        @pointercancel="pointerOp"
        @click.capture="stopKlikEfterTraek"
        @wheel.prevent="vedHjul"
      ></div>

      <!-- Toplinjen øverst til venstre: tilbageknap, logo og "Vis hele parken" (tilbage til zoom 1).
           Logoet er kun pynt, derfor aria-hidden -->
      <div class="kort-toplinje">
        <TilbageKnap />
        <span class="kort-brand" aria-hidden="true">GoMonkey <span>Odense</span></span>
        <button type="button" class="kort-reset-top" @click="nulstilKort">
          Vis hele parken
        </button>
      </div>

      <!-- Vises, mens kortet hentes -->
      <div v-if="indlaeser" class="kort-status" role="status">
        Kortet indlæses…
      </div>

      <!-- Vises, hvis noget gik galt, med en knap til at prøve igen -->
      <div v-else-if="fejl" class="kort-status fejl" role="alert">
        <p>{{ fejl }}</p>
        <button type="button" @click="indlaesKort">Prøv igen</button>
      </div>

      <!-- Hjælpetekst nederst til venstre. Teksten skifter, når man har zoomet -->
      <div class="kort-vejledning" aria-hidden="true">
        {{ zoom <= 1 ? 'Træk og zoom for at udforske banerne' : 'Træk for at udforske' }}
      </div>

      <!-- Zoomknapper nederst til højre. Hvert tryk zoomer 1,3 gange.
           :disabled gør knappen grå, når man ikke kan zoome længere -->
      <div class="kort-vaerktoejer" aria-label="Kortnavigation">
        <button type="button" aria-label="Zoom ind" :disabled="zoom >= MAKS_ZOOM" @click="saetZoom(zoom * 1.3)">+</button>
        <span class="kort-vaerktoej-linje"></span>
        <button type="button" aria-label="Zoom ud" :disabled="zoom <= 1" @click="saetZoom(zoom / 1.3)">−</button>
      </div>

      <!-- Viser zoomniveauet, fx "1.3×". toFixed(1) = én decimal -->
      <span class="kort-zoom" aria-live="polite">{{ zoom.toFixed(1) }}×</span>

      <!-- Boks med den valgte bane: farveprik, navn og en knap til at fravælge -->
      <div v-if="valgtBane" class="kort-valgt" aria-live="polite">
        <span class="bane-prik" :style="{ backgroundColor: valgtBane.farve }"></span>
        <span>{{ valgtBane.navn }}</span>
        <button type="button" aria-label="Fjern valgt bane" @click="vaelgBane(valgtBane.id)">×</button>
      </div>
    </div>
  </section>
</template>