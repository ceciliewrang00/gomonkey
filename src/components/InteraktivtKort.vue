<script setup>
// Kortet på kortsiden. Det henter banerne og tegningen (public/kort-base.svg), tegner banernes linjer
// og gør dem klikbare. Zoom og træk ændrer SVG'ens viewBox (se utils/kortKamera.js)

import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'

// Henter banerne til kortet (linjer og tekster)
import { hentKortbaner } from '../services/kortApi.js'

// Popup'en, der vises, når man har klikket på en bane
import BanePopup from './BanePopup.vue'

// Kortets størrelse, største zoom og udregningen af udsnittet
import {
  KORT_BREDDE,
  KORT_HOEJDE,
  MAKS_ZOOM,
  begraens,
  beregnViewBox
} from '../utils/kortKamera.js'

// ---------- 1. Props, emits og værdier ----------

// filter = 'alle' eller en liste af bane-id'er, som skal vises
const props = defineProps({
  filter: {
    type: [String, Array],
    default: 'alle'
  }
})

// 'bane-valgt' sender id'et på den bane, man klikker på, op til KortView
const emit = defineEmits(['bane-valgt'])

// Det <div>, som SVG-kortet sættes ind i
const kortHolder = ref(null)

// Banerne fra Firebase
const baner = ref([])

// Den bane, man har klikket på – og den, musen er over
const valgtId = ref(null)
const hoverId = ref(null)

// 1 = hele parken, MAKS_ZOOM = helt tæt på
const zoom = ref(1)

const indlaeser = ref(true)
const fejl = ref('')

// Den valgte bane, som popup'en viser
const valgtBane = computed(() =>
  baner.value.find(b => b.id === valgtId.value)
)

// Almindelige variabler, fordi siden ikke skal opdateres, når de ændrer sig:
// svg = kortet, observer = holder øje med boksens størrelse, controller = kan afbryde hentningen
let svg
let observer
let controller

// fingre = de fingre (eller den mus), der rører kortet, pinch = afstand og midte ved knibe-zoom,
// sidstTraekket = hvornår man sidst trak, så et træk ikke tæller som et klik
const fingre = new Map()
let pinch = null
let sidstTraekket = 0

// Punktet på tegningen, der er midt på skærmen. Starter midt i parken
let center = {
  x: KORT_BREDDE / 2,
  y: KORT_HOEJDE / 2
}

// Udsnittet, der vises lige nu (svarer til viewBox)
let view

// ---------- Filtrering af kortet ----------

// Tone de baner ned, der ikke er valgt i filteret (klassen "er-skaermet")
function opdaterFiltrering() {
  if (!svg) return

  svg.querySelectorAll('[data-bane]').forEach(element => {
    const baneId = element.dataset.bane
    
    if (props.filter === 'alle') {
      element.classList.remove('er-skaermet')
    } else if (Array.isArray(props.filter)) {
      const erValgt = props.filter.includes(baneId)
      // Klassen sættes på, hvis banen ikke er valgt
      element.classList.toggle('er-skaermet', !erValgt)
    }
  })
}

// Kører igen, hver gang filteret ændrer sig
watch(() => props.filter, opdaterFiltrering)


// ---------- 2. Zoom og kortets position ----------

// Hvor mange pixels i venstre side filteret dækker (CSS-variablen --kort-daekket-venstre)
function daekketVenstre() {
  if (!kortHolder.value) return 0
  const vaerdi = getComputedStyle(kortHolder.value).getPropertyValue('--kort-daekket-venstre')
  return parseFloat(vaerdi) || 0
}

// Regner udsnittet ud fra midten og zoom og sætter det på SVG'en.
// Kører efter hver zoom og hvert træk, og når boksen skifter størrelse
function opdaterKort() {
  if (!svg || !kortHolder.value) return

  const { width, height } = kortHolder.value.getBoundingClientRect()

  view = beregnViewBox({
    center,
    zoom: zoom.value,
    viewportWidth: width,
    viewportHeight: height,
    venstreDaekket: daekketVenstre()
  })

  // Midten kan være rykket, så man ikke kan trække kortet væk
  center = view.center

  svg.setAttribute(
    'viewBox',
    `${view.x} ${view.y} ${view.width} ${view.height}`
  )
}

// Zoomer til et nyt niveau. anker = det sted på skærmen, der bliver stående
// (midten ved knapperne, musen ved musehjulet)
function saetZoom(nyZoom, anker = { x: 0.5, y: 0.5 }) {
  if (!svg || !view) return

  const nytNiveau = begraens(nyZoom, 1, MAKS_ZOOM)
  if (nytNiveau === zoom.value) return

  // Punktet på tegningen under ankeret lige nu
  const punktX = view.x + view.width * anker.x
  const punktY = view.y + view.height * anker.y

  const { width, height } = kortHolder.value.getBoundingClientRect()

  const nyView = beregnViewBox({
    center,
    zoom: nytNiveau,
    viewportWidth: width,
    viewportHeight: height,
    venstreDaekket: daekketVenstre()
  })

  // Flytter midten, så samme punkt stadig er under ankeret efter zoomet
  center = {
    x: punktX + (0.5 - anker.x) * nyView.width,
    y: punktY + (0.5 - anker.y) * nyView.height
  }

  zoom.value = nytNiveau
  opdaterKort()
}

// "Vis hele parken": zoomer helt ud og centrerer kortet
function nulstilKort() {
  zoom.value = 1
  center = {
    x: KORT_BREDDE / 2,
    y: KORT_HOEJDE / 2
  }
  opdaterKort()
}

// Flytter kortet, når man trækker. Skærm-pixels regnes om til tegningens enheder
function panorer(dx, dy) {
  const { width, height } = kortHolder.value.getBoundingClientRect()
  center.x -= dx / width * view.width
  center.y -= dy / height * view.height
  opdaterKort()
}

// Laver en skærm-position om til et tal mellem 0 og 1 i kortets boks
function ankerPunkt(x, y) {
  const r = kortHolder.value.getBoundingClientRect()
  return {
    x: begraens((x - r.left) / r.width, 0, 1),
    y: begraens((y - r.top) / r.height, 0, 1)
  }
}

// Musehjul: scroll op zoomer ind, scroll ned zoomer ud – mod det sted, musen er
function vedHjul(event) {
  const faktor = Math.exp(
    -begraens(event.deltaY, -120, 120) * 0.0017
  )
  saetZoom(
    zoom.value * faktor,
    ankerPunkt(event.clientX, event.clientY)
  )
}


// ---------- 3. Mus og touch ----------
// Én finger eller mus trækker kortet rundt. To fingre kniber for at zoome

// De to første fingre på skærmen
function fingerPar() {
  return [...fingre.values()].slice(0, 2)
}

// Afstanden mellem to fingre
function fingerAfstand(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// Punktet midt imellem to fingre
function fingerMidte(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  }
}

// Man trykker på kortet: gem fingeren, og hvor den startede
function pointerNed(event) {
  // Kun venstre museknap tæller
  if (!svg || (event.pointerType === 'mouse' && event.button !== 0)) return

  fingre.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
    startX: event.clientX,
    startY: event.clientY,
    flyttet: false
  })

  // Kommer der en finger nr. 2, starter knibe-zoom
  if (fingre.size === 2) {
    const [a, b] = fingerPar()
    pinch = {
      afstand: fingerAfstand(a, b),
      midte: fingerMidte(a, b)
    }

    // Kortet bliver ved med at få bevægelserne, selv hvis fingeren glider uden for kortet
    for (const id of fingre.keys()) {
      try {
        kortHolder.value.setPointerCapture(id)
      } catch {}
    }
    sidstTraekket = performance.now()
  }
}

// Man bevæger fingeren, mens man holder nede
function pointerFlyt(event) {
  const finger = fingre.get(event.pointerId)
  if (!finger || !view) return

  // Hvor meget fingeren har flyttet sig siden sidst
  const dx = event.clientX - finger.x
  const dy = event.clientY - finger.y

  finger.x = event.clientX
  finger.y = event.clientY

  // To fingre: kommer de længere fra hinanden, zoomes der ind, og kortet følger med
  if (fingre.size >= 2) {
    const [a, b] = fingerPar()
    const afstand = fingerAfstand(a, b)
    const midte = fingerMidte(a, b)

    if (pinch) {
      saetZoom(
        zoom.value * afstand / Math.max(1, pinch.afstand),
        ankerPunkt(pinch.midte.x, pinch.midte.y)
      )
      panorer(
        midte.x - pinch.midte.x,
        midte.y - pinch.midte.y
      )
    }

    pinch = { afstand, midte }
    sidstTraekket = performance.now()
    return
  }

  // Én finger: det tæller først som et træk, når den har flyttet sig mere end 5 pixels
  if (
    !finger.flyttet &&
    Math.hypot(
      finger.x - finger.startX,
      finger.y - finger.startY
    ) < 5
  ) return

  if (!finger.flyttet) {
    finger.flyttet = true
    try {
      kortHolder.value.setPointerCapture(event.pointerId)
    } catch {}
  }

  panorer(dx, dy)
  sidstTraekket = performance.now()
}

// Man slipper: fingeren fjernes, og knibe-zoom stopper
function pointerOp(event) {
  const finger = fingre.get(event.pointerId)
  if (!finger) return

  if (finger.flyttet || pinch) {
    sidstTraekket = performance.now()
  }

  fingre.delete(event.pointerId)
  pinch = null

  if (kortHolder.value?.hasPointerCapture?.(event.pointerId)) {
    try {
      kortHolder.value.releasePointerCapture(event.pointerId)
    } catch {}
  }

  // Slipper man én af to fingre, starter den sidste forfra som et nyt træk
  if (fingre.size === 1) {
    const sidste = [...fingre.values()][0]
    sidste.startX = sidste.x
    sidste.startY = sidste.y
    sidste.flyttet = false
  }
}

// Efter et træk sender browseren også et klik. Det stoppes,
// så man ikke vælger en bane ved et uheld
function stopKlikEfterTraek(event) {
  if (performance.now() - sidstTraekket < 250) {
    event.preventDefault()
    event.stopPropagation()
  }
}


// ---------- 4. Banevalg og markering ----------

// Vælger en bane – eller fravælger den, hvis man klikker på den igen
function vaelgBane(id) {
  // Lige efter et træk tæller det ikke som et klik
  if (performance.now() - sidstTraekket < 250) return
  valgtId.value = valgtId.value === id ? null : id
  emit('bane-valgt', valgtId.value)
}

// Gør en del af tegningen til en knap for banen. Den er ikke lavet i templaten,
// så vi kan ikke bruge @click – lytterne sættes på i koden
function goerKlikbar(element, bane) {
  element.classList.add('kort-klikbar')
  element.setAttribute('role', 'button')
  element.setAttribute('tabindex', '0')
  element.setAttribute('aria-label', `Vælg ${bane.navn}`)

  element.addEventListener('click', () => {
    vaelgBane(bane.id)
  })

  // Enter eller mellemrum vælger banen
  element.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      vaelgBane(bane.id)
    }
  })

  element.addEventListener('pointerenter', () => {
    hoverId.value = bane.id
  })

  element.addEventListener('pointerleave', () => {
    hoverId.value = null
  })
}

// Får banen, musen er over (eller den valgte), til at lyse op med klassen "er-aktiv"
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

// Kører igen, når den valgte bane eller hover ændrer sig
watch([valgtId, hoverId], opdaterMarkering)


// ---------- 5. Firebase og SVG ----------

// Henter banerne og tegningen og bygger hele kortet.
// Kører, når siden åbnes, og når man trykker "Prøv igen"
async function indlaesKort() {
  indlaeser.value = true
  fejl.value = ''

  // Afbryder en tidligere hentning, der måske stadig er i gang
  controller?.abort()
  controller = new AbortController()

  try {
    // Henter banerne og tegningen på samme tid
    const [data, svar] = await Promise.all([
      hentKortbaner({ signal: controller.signal }),
      fetch(
        `${import.meta.env.BASE_URL}kort-base.svg`,
        { signal: controller.signal }
      )
    ])

    if (!svar.ok) {
      throw new Error('Kunne ikke hente SVG-kortet')
    }

    baner.value = data.baner

    // Laver SVG-teksten om til elementer, vi kan ændre i
    const dokument = new DOMParser().parseFromString(
      await svar.text(),
      'image/svg+xml'
    )

    if (dokument.querySelector('parsererror')) {
      throw new Error('SVG-filen er ugyldig')
    }

    // SVG'en skal fylde hele boksen og bevare sine proportioner
    svg = dokument.documentElement
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')

    // Linjer fra admin har ingen fast plads i kort-base.svg.
    // De samles i én gruppe lige under navne-labels
    let nyeLinjer = null

    // Banernes linjer: find hver linjes gruppe (eller lav en ny), tegn stregerne og gør den klikbar
    for (const bane of baner.value) {
      for (const segment of bane.segmenter ?? []) {
        let gruppe = segment.slot ? svg.querySelector(`[id="${segment.slot}"]`) : null

        // Mangler linjen sin farvestreg, er data i stykker
        if (!segment.paths?.[1]) {
          throw new Error(`Manglende SVG-data: ${segment.slot ?? bane.id}`)
        }

        // Ingen fast plads: lav en ny gruppe i "nye-linjer"
        if (!gruppe) {
          if (!nyeLinjer) {
            nyeLinjer = dokument.createElementNS('http://www.w3.org/2000/svg', 'g')
            nyeLinjer.setAttribute('id', 'nye-linjer')
            const labels = svg.querySelector('#Banner')
            if (labels) labels.before(nyeLinjer)
            else svg.appendChild(nyeLinjer)
          }
          gruppe = dokument.createElementNS('http://www.w3.org/2000/svg', 'g')
          nyeLinjer.appendChild(gruppe)
        }

        gruppe.classList.add('bane-segment')
        gruppe.dataset.bane = bane.id

        // Hver linje er tre streger: kant, farve og reb (se utils/kortStier.js)
        segment.paths.forEach((sti, i) => {
          const path = dokument.createElementNS(
            'http://www.w3.org/2000/svg',
            'path'
          )
          path.setAttribute('class', sti.class)
          path.setAttribute('d', sti.d)
          // Faste baner får farven fra _colors.scss, nye baner fra admin deres egen farve
          if (i === 1 && bane.farve) {
            path.style.stroke = `var(--kort-bane-${bane.id}, ${bane.farve})`
          }
          gruppe.appendChild(path)
        })

        // Usynlig, bred streg, så linjen er nem at ramme
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

    // Navne-labels: rækkefølgen af labels i kort-base.svg – label nr. 1 hører til bane-1 osv.
    const labelIds = [
      'bane-1',
      'bane-2',
      'bane-3',
      'bane-4',
      'bane-6',
      'bane-7',
      'bounce',
      'bane-5'
    ]

    // De gamle navne i kort-base.svg skjules, og banens navn fra Firebase skrives i stedet.
    // Feltet får banens farve
    svg.querySelectorAll('#Banner > g').forEach((gruppe, i) => {
      const bane = baner.value.find(b => b.id === labelIds[i])
      if (!bane) return

      gruppe.dataset.bane = bane.id
      gruppe.classList.add('bane-label')
      goerKlikbar(gruppe, bane)

      const felt = gruppe.querySelector('rect')
      const gammeltNavn = gruppe.querySelector(':scope > g')
      if (!felt) return

      if (gammeltNavn) gammeltNavn.style.display = 'none'

      felt.style.fill = `var(--kort-bane-${bane.id})`

      // Det nye navn midt i feltet
      const x = parseFloat(felt.getAttribute('x')) + parseFloat(felt.getAttribute('width')) / 2
      const y = parseFloat(felt.getAttribute('y')) + parseFloat(felt.getAttribute('height')) / 2
      const tekst = dokument.createElementNS('http://www.w3.org/2000/svg', 'text')
      tekst.setAttribute('x', x)
      tekst.setAttribute('y', y)
      tekst.setAttribute('class', 'bane-label__tekst')
      tekst.setAttribute('aria-hidden', 'true')  // knappen har allerede et aria-label med navnet
      tekst.textContent = bane.navn
      gruppe.appendChild(tekst)
    })

    // Aktiviteter: Free Fall og Bounce er tegninger, men gøres også klikbare
    for (const [id, gruppeId] of [
      ['bane-7', 'Free-Fall'],
      ['bounce', 'Bounce']
    ]) {
      const gruppe = svg.querySelector(`[id="${gruppeId}"]`)
      const bane = baner.value.find(b => b.id === id)

      if (gruppe && bane) {
        gruppe.dataset.bane = id
        goerKlikbar(gruppe, bane)
      }
    }

    // Scoped styles virker ikke på elementer, vi selv sætter ind,
    // så CSS'en for klik, markering og filter lægges direkte ind i SVG'en
    const stil = dokument.createElementNS(
      'http://www.w3.org/2000/svg',
      'style'
    )

    stil.textContent = `
      .kort-klikbar {
        cursor: pointer;
      }

      .bane-label__tekst {
        font-family: 'Montserrat', sans-serif;
        font-size: 26px;
        font-weight: 800;
        fill: #EFE9E5;
        text-anchor: middle;
        dominant-baseline: central;
        pointer-events: none;
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

      /* Tonet ned, når banen ikke er valgt i filteret */
      [data-bane].er-skaermet {
        opacity: 0.2;
        transition: opacity 0.3s ease;
      }
    `

    svg.appendChild(stil)

    // Sætter det færdige kort ind på siden
    kortHolder.value.replaceChildren(svg)

    // Skiltene får en bredde, der passer til navnet. Teksten kan først måles,
    // når kortet står på siden
    const SKILT_LUFT_SIDE = 18
    const SKILT_HOEJDE = 52
    svg.querySelectorAll('.bane-label').forEach((label) => {
      const felt = label.querySelector('rect')
      const tekst = label.querySelector('.bane-label__tekst')
      if (!felt || !tekst) return

      const midteX = parseFloat(tekst.getAttribute('x'))
      const midteY = parseFloat(tekst.getAttribute('y'))
      const bredde = tekst.getBBox().width + SKILT_LUFT_SIDE * 2

      felt.setAttribute('x', midteX - bredde / 2)
      felt.setAttribute('y', midteY - SKILT_HOEJDE / 2)
      felt.setAttribute('width', bredde)
      felt.setAttribute('height', SKILT_HOEJDE)
      felt.setAttribute('rx', SKILT_HOEJDE / 2)
      felt.setAttribute('ry', SKILT_HOEJDE / 2)
    })


    // Bounce og Free Fall får en hvid kontur, som bliver synlig, når de er valgt eller har musen over sig
    const trampolin = svg.querySelector('#Bounce > path.st25')
    const fritFald = svg.querySelector('#Free-Fall')

    if (!trampolin || !fritFald) {
      throw new Error('Kunne ikke finde Bounce eller Free Fall i SVG-kortet')
    }

    // Bounce: samme form som trampolinen
    const bounceKontur = dokument.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    )
    bounceKontur.setAttribute('d', trampolin.getAttribute('d'))
    bounceKontur.setAttribute('class', 'aktivitet-kontur')
    bounceKontur.dataset.bane = 'bounce'
    svg.appendChild(bounceKontur)

    // Free Fall: en firkant lidt større end tegningen
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
    sortKontur.dataset.bane = 'bane-7'
    svg.appendChild(sortKontur)

    // Starter med hele parken og viser markering og filter
    nulstilKort()
    opdaterMarkering()
    opdaterFiltrering()

  } catch (error) {
    // AbortError = vi har selv afbrudt hentningen – det er ikke en fejl
    if (error.name !== 'AbortError') {
      fejl.value = error.message
      console.error(error)
    }
  } finally {
    indlaeser.value = false
  }
}


// ---------- 6. Start og oprydning ----------

// Når kortet er vist: hold øje med boksens størrelse, lyt efter slip på hele vinduet,
// og hent kortet
onMounted(() => {
  observer = new ResizeObserver(opdaterKort)
  observer.observe(kortHolder.value)

  window.addEventListener('pointerup', pointerOp)
  window.addEventListener('pointercancel', pointerOp)

  indlaesKort()
})

// Stopper hentning, observer og lyttere, når man forlader kortsiden
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
    <div class="kort-stage">
      <!-- Boksen, som SVG-kortet sættes ind i. Her lyttes efter træk, knib og musehjul.
           touch-action: none = browseren må ikke selv scrolle siden, når man rører kortet -->
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

      <!-- Øverst til højre: "Vis hele parken" og lukkeknappen -->
      <div class="kort-tophoejre">
        <button type="button" class="button-primary kort-reset-top" @click="nulstilKort">
          Vis hele parken
        </button>
        <!-- Krydset går til forsiden -->
        <RouterLink to="/" class="button-close kort-luk" aria-label="Luk kortet og gå til forsiden">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </RouterLink>
      </div>

      <!-- Besked, mens kortet hentes – eller en fejl med "Prøv igen" -->
      <div v-if="indlaeser" class="kort-status" role="status">
        Kortet indlæses…
      </div>

      <div v-else-if="fejl" class="kort-status fejl" role="alert">
        <p>{{ fejl }}</p>
        <button type="button" class="button-primary" @click="indlaesKort">Prøv igen</button>
      </div>

      <!-- Hjælpetekst, der skifter, når man har zoomet ind -->
      <div class="kort-vejledning lille-tekst" aria-hidden="true">
        {{ zoom <= 1 ? 'Hele parken er synlig · Zoom for at udforske banerne' : 'Træk for at udforske' }}
      </div>

      <!-- + og − zoomer 30 % ad gangen -->
      <div class="kort-vaerktoejer" aria-label="Kortnavigation">
        <button type="button" aria-label="Zoom ind" :disabled="zoom >= MAKS_ZOOM" @click="saetZoom(zoom * 1.3)">+</button>
        <span class="kort-vaerktoej-linje"></span>
        <button type="button" aria-label="Zoom ud" :disabled="zoom <= 1" @click="saetZoom(zoom / 1.3)">−</button>
      </div>

      <span class="kort-zoom etiket" aria-live="polite">{{ zoom.toFixed(1) }}×</span>

      <!-- Popup'en for den valgte bane. Lukkeknappen fravælger banen -->
      <Transition name="fade">
  <BanePopup 
    v-if="valgtBane" 
    :bane="valgtBane" 
    @luk="vaelgBane(valgtBane.id)" 
  />
</Transition>
    </div>
  </section>
</template>