<script setup>
// INTERAKTIVT KORT
// Selve kortet på kortsiden (KortView.vue). Man kan zoome, trække kortet rundt og klikke
// på en bane, så der kommer en popup (BanePopup.vue) med info om banen.
//
// Overblik – sådan virker det:
// 1. indlaesKort (afsnit 5) henter to ting på samme tid:
//    - banerne fra Firebase via services/kortApi.js (navn, farve og hvor linjerne går)
//    - tegningen af parken: public/kort-base.svg
// 2. SVG-filen læses som tekst og laves om til elementer, som vi selv sætter ind i kortHolder.
//    Det gør vi (i stedet for et <img>), fordi vi skal kunne ændre i tegningen:
//    tegne banernes linjer, skrive navne og gøre banerne klikbare.
// 3. Hver bane-del får data-bane="bane-id", så vi kan finde alle dele af samme bane igen
//    (til markering, når man klikker/holder musen over, og til filteret).
// 4. Zoom og flyt sker ved at ændre SVG'ens viewBox – altså hvilket udsnit af tegningen
//    vi kigger på. Udregningen står i utils/kortKamera.js.
// 5. KortView sender filteret ind som prop, og kortet sender den valgte bane ud med emit.
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'

// Henter banerne til kortet (geometri + tekster)
import { hentKortbaner } from '../services/kortApi.js'

// Popup'en, der vises, når man har klikket på en bane
import BanePopup from './BanePopup.vue'

// Kameraet: kortets størrelse, største zoom og udregningen af viewBox
import {
  KORT_BREDDE,
  KORT_HOEJDE,
  MAKS_ZOOM,
  begraens,
  beregnViewBox
} from '../utils/kortKamera.js'

// ==========================================
// 1. PROPS, EMITS OG VÆRDIER
// ==========================================

// filter kommer fra KortView.vue (som har det fra KortFilter.vue):
// 'alle' = vis alle baner, eller en liste af bane-id'er, fx ['bane-1', 'bane-3']
const props = defineProps({
  filter: {
    type: [String, Array],
    default: 'alle'
  }
})

// Sender id'et på den bane, man klikker på, op til KortView.vue (null = ingen valgt)
const emit = defineEmits(['bane-valgt'])

// Det <div>, som SVG-kortet bliver sat ind i (ref="kortHolder" i templaten)
const kortHolder = ref(null)

// Banerne fra Firebase
const baner = ref([])

// Den bane, man har klikket på – og den, musen er over lige nu
const valgtId = ref(null)
const hoverId = ref(null)

// Hvor meget der er zoomet ind. 1 = hele parken, MAKS_ZOOM = helt tæt på
const zoom = ref(1)

// Til beskederne "Kortet indlæses…" og fejlbeskeden
const indlaeser = ref(true)
const fejl = ref('')

// Hele bane-objektet for den valgte bane – det er den, popup'en viser
const valgtBane = computed(() =>
  baner.value.find(b => b.id === valgtId.value)
)

// Almindelige variabler (ikke ref), fordi templaten ikke skal opdateres, når de ændrer sig:
// svg        = selve SVG-kortet, når det er indlæst
// observer   = holder øje med, om kortets boks skifter størrelse (fx når vinduet ændres)
// controller = kan afbryde hentningen, hvis man forlader siden, før kortet er hentet
let svg
let observer
let controller

// Til mus og touch:
// fingre        = de fingre (eller den mus), der rører kortet lige nu, gemt efter pointerId
// pinch         = afstand og midtpunkt mellem to fingre, når man knibe-zoomer
// sidstTraekket = tidspunktet, hvor man sidst trak i kortet (så et træk ikke tæller som et klik)
const fingre = new Map()
let pinch = null
let sidstTraekket = 0

// Det punkt på tegningen, der er i midten af skærmen. Starter i midten af parken
let center = {
  x: KORT_BREDDE / 2,
  y: KORT_HOEJDE / 2
}

// Det udsnit, der vises lige nu: { x, y, width, height } (svarer til viewBox)
let view

// ==========================================
// FILTRERING AF KORTET
// ==========================================

// Giver alle bane-dele, der IKKE er valgt i filteret, klassen "er-skaermet",
// så de bliver tonet ned (opacity 0.2 – se stilen længere nede i indlaesKort)
function opdaterFiltrering() {
  if (!svg) return

  svg.querySelectorAll('[data-bane]').forEach(element => {
    const baneId = element.dataset.bane
    
    if (props.filter === 'alle') {
      element.classList.remove('er-skaermet')
    } else if (Array.isArray(props.filter)) {
      const erValgt = props.filter.includes(baneId)
      // Sætter en klasse der kan tone elementet ned eller skjule det
      element.classList.toggle('er-skaermet', !erValgt)
    }
  })
}

// Kør opdaterFiltrering igen, hver gang filteret fra KortView.vue ændrer sig
watch(() => props.filter, opdaterFiltrering)


// ==========================================
// 2. ZOOM OG KORTETS POSITION
// ==========================================

// Hvor mange pixels i venstre side, der er dækket af filteret.
// Værdien står som CSS-variablen --kort-daekket-venstre i KortView.vue
// (0px på mobil, hvor filteret er skjult bag en knap)
function daekketVenstre() {
  if (!kortHolder.value) return 0
  const vaerdi = getComputedStyle(kortHolder.value).getPropertyValue('--kort-daekket-venstre')
  return parseFloat(vaerdi) || 0
}

// Regner udsnittet (viewBox) ud fra center og zoom og sætter det på SVG'en.
// Kaldes efter hver zoom og hvert træk – og når kortets boks skifter størrelse
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

  // beregnViewBox kan have rykket midten, så man ikke kan trække kortet helt væk
  center = view.center

  svg.setAttribute(
    'viewBox',
    `${view.x} ${view.y} ${view.width} ${view.height}`
  )
}

// Zoomer til et nyt niveau.
// anker = det sted på skærmen, der skal blive stående, mens man zoomer
// (0.5, 0.5 = midten af skærmen; ved musehjul er det der, hvor musen er)
function saetZoom(nyZoom, anker = { x: 0.5, y: 0.5 }) {
  if (!svg || !view) return

  // Zoom holdes mellem 1 og MAKS_ZOOM
  const nytNiveau = begraens(nyZoom, 1, MAKS_ZOOM)
  if (nytNiveau === zoom.value) return

  // Punktet på tegningen, der lige nu er under ankeret
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

  // Flyt midten, så det samme punkt stadig er under ankeret efter zoomet
  center = {
    x: punktX + (0.5 - anker.x) * nyView.width,
    y: punktY + (0.5 - anker.y) * nyView.height
  }

  zoom.value = nytNiveau
  opdaterKort()
}

// "Vis hele parken": zoom helt ud og centrér kortet
function nulstilKort() {
  zoom.value = 1
  center = {
    x: KORT_BREDDE / 2,
    y: KORT_HOEJDE / 2
  }
  opdaterKort()
}

// Flytter kortet, når man trækker. dx/dy er i skærm-pixels, så de regnes om til
// tegningens koordinater. Minus, fordi kortet skal følge fingeren (træk til højre = se mere til venstre)
function panorer(dx, dy) {
  const { width, height } = kortHolder.value.getBoundingClientRect()
  center.x -= dx / width * view.width
  center.y -= dy / height * view.height
  opdaterKort()
}

// Laver en skærm-position (fx musens) om til en brøkdel af kortets boks:
// 0 = venstre/top, 1 = højre/bund. Bruges som anker i saetZoom
function ankerPunkt(x, y) {
  const r = kortHolder.value.getBoundingClientRect()
  return {
    x: begraens((x - r.left) / r.width, 0, 1),
    y: begraens((y - r.top) / r.height, 0, 1)
  }
}

// Musehjul / to fingre på touchpad. deltaY er hvor meget der er scrollet.
// Det laves om til en faktor lidt over eller under 1, så zoomet føles jævnt
// (scroll op = zoom ind, scroll ned = zoom ud), og der zoomes ind mod musen
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
// "Pointer events" virker både for mus, finger og pen, så vi kun skal skrive koden én gang.
// pointerNed = man trykker, pointerFlyt = man bevæger, pointerOp = man slipper.
// Én finger/mus = træk kortet rundt. To fingre = knib for at zoome.

// De to første fingre på skærmen
function fingerPar() {
  return [...fingre.values()].slice(0, 2)
}

// Afstanden mellem to fingre (Pythagoras)
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

// Man trykker på kortet. Gem fingeren (eller musen), og hvor den startede
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

  // Kommer der en finger nr. 2, starter knibe-zoom: gem afstand og midte mellem fingrene
  if (fingre.size === 2) {
    const [a, b] = fingerPar()
    pinch = {
      afstand: fingerAfstand(a, b),
      midte: fingerMidte(a, b)
    }

    // "Pointer capture" = kortet bliver ved med at få bevægelserne,
    // selv hvis fingeren glider uden for kortet. try/catch, da det kan fejle i ældre browsere
    for (const id of fingre.keys()) {
      try {
        kortHolder.value.setPointerCapture(id)
      } catch {}
    }
    sidstTraekket = performance.now()
  }
}

// Man bevæger fingeren/musen, mens man holder nede
function pointerFlyt(event) {
  const finger = fingre.get(event.pointerId)
  if (!finger || !view) return

  // Hvor meget fingeren har flyttet sig siden sidst
  const dx = event.clientX - finger.x
  const dy = event.clientY - finger.y

  finger.x = event.clientX
  finger.y = event.clientY

  // To fingre: knibe-zoom. Kommer fingrene længere fra hinanden, zoomes der ind.
  // Flytter man begge fingre, følger kortet også med (panorer)
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

  // Én finger: først når den har flyttet sig mere end 5 pixels, tæller det som et træk.
  // Så bliver et lille ryk under et klik ikke til et træk
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

// Man slipper. Fingeren fjernes, og knibe-zoom stopper
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

  // Slipper man én af to fingre, starter den sidste finger forfra som et nyt træk
  if (fingre.size === 1) {
    const sidste = [...fingre.values()][0]
    sidste.startX = sidste.x
    sidste.startY = sidste.y
    sidste.flyttet = false
  }
}

// Når man slipper efter et træk, sender browseren også et klik.
// Er der trukket for under 250 ms siden, stoppes klikket, så man ikke vælger en bane ved et uheld
function stopKlikEfterTraek(event) {
  if (performance.now() - sidstTraekket < 250) {
    event.preventDefault()
    event.stopPropagation()
  }
}


// ==========================================
// 4. BANEVALG OG MARKERING
// ==========================================

// Vælger en bane (eller fravælger den, hvis man klikker på den samme igen).
// Den valgte bane sendes til KortView.vue, og popup'en vises via valgtBane
function vaelgBane(id) {
  if (performance.now() - sidstTraekket < 250) return
  valgtId.value = valgtId.value === id ? null : id
  emit('bane-valgt', valgtId.value)
}

// Gør en del af SVG-tegningen til en knap for banen.
// Elementerne er ikke lavet med Vue-templaten, så vi kan ikke bruge @click –
// derfor sætter vi lytterne på med addEventListener.
// role, tabindex og aria-label gør, at man også kan vælge banen med tastaturet (Enter/mellemrum)
function goerKlikbar(element, bane) {
  element.classList.add('kort-klikbar')
  element.setAttribute('role', 'button')
  element.setAttribute('tabindex', '0')
  element.setAttribute('aria-label', `Vælg ${bane.navn}`)

  element.addEventListener('click', () => {
    vaelgBane(bane.id)
  })

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

// Får banen, man holder musen over (eller har valgt), til at lyse op.
// Alle dele med samme data-bane får klassen "er-aktiv" (hvidt skær – se stilen i indlaesKort)
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

// Kør opdaterMarkering, hver gang valgt bane eller hover ændrer sig
watch([valgtId, hoverId], opdaterMarkering)


// ==========================================
// 5. FIREBASE OG SVG
// ==========================================

// Henter banerne og tegningen og bygger hele kortet. Kaldes i onMounted
// og igen, hvis man trykker "Prøv igen" efter en fejl
async function indlaesKort() {
  indlaeser.value = true
  fejl.value = ''

  // Afbryd en tidligere hentning, der måske stadig er i gang
  controller?.abort()
  controller = new AbortController()

  try {
    // Promise.all henter begge ting på samme tid og venter, til begge er færdige
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

    // DOMParser laver SVG-teksten om til rigtige elementer, som vi kan søge i og ændre
    const dokument = new DOMParser().parseFromString(
      await svar.text(),
      'image/svg+xml'
    )

    if (dokument.querySelector('parsererror')) {
      throw new Error('SVG-filen er ugyldig')
    }

    // <svg>-elementet selv. Det skal fylde hele boksen og bevare sine proportioner
    svg = dokument.documentElement
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')

    // Linjer, der er lavet i admin, har ingen fast plads ("slot") i kort-base.svg.
    // De samles i én gruppe lige under navne-labels, så de ligger oven på træerne
    let nyeLinjer = null

    // BANERNES LINJER
    // Hver bane består af en eller flere linjer (segmenter). For hver linje:
    // find dens gruppe i SVG'en (eller lav en ny), tegn stregerne og gør den klikbar
    for (const bane of baner.value) {
      for (const segment of bane.segmenter ?? []) {
        let gruppe = segment.slot ? svg.querySelector(`[id="${segment.slot}"]`) : null

        if (!segment.paths?.[1]) {
          throw new Error(`Manglende SVG-data: ${segment.slot ?? bane.id}`)
        }

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

        // Hver linje er tre streger oven på hinanden: kant, farve og reb (se utils/kortStier.js).
        // SVG-elementer skal laves med createElementNS og SVG-adressen, ellers bliver de ikke vist
        segment.paths.forEach((sti, i) => {
          const path = dokument.createElementNS(
            'http://www.w3.org/2000/svg',
            'path'
          )
          path.setAttribute('class', sti.class)
          path.setAttribute('d', sti.d)
          // Farvestregen (nr. 2): faste baner får farven fra _colors.scss (--kort-bane-<id>),
          // nye baner fra admin bruger deres egen "farve"
          if (i === 1 && bane.farve) {
            path.style.stroke = `var(--kort-bane-${bane.id}, ${bane.farve})`
          }
          gruppe.appendChild(path)
        })

        // En usynlig, bred streg oven på linjen, så den er nemmere at ramme med musen/fingeren
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

    // NAVNE-LABELS
    // Rækkefølgen af labels i kort-base.svg (gruppen #Banner) – label nr. 1 hører til bane-1 osv.
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

    // Navne-labels på kortet. Navnene i kort-base.svg er tegnet som former (de gamle navne
    // "Blå 1" osv.), så de skjules, og banens rigtige navn fra Firebase skrives i stedet –
    // samme navn som på forsiden og i popup'en. Labelens felt bliver banens farve
    svg.querySelectorAll('#Banner > g').forEach((gruppe, i) => {
      const bane = baner.value.find(b => b.id === labelIds[i])
      if (!bane) return

      gruppe.dataset.bane = bane.id
      gruppe.classList.add('bane-label')
      goerKlikbar(gruppe, bane)

      const felt = gruppe.querySelector('rect')
      const gammeltNavn = gruppe.querySelector(':scope > g')
      if (!felt) return

      // Skjuler det gamle, indtegnede navn
      if (gammeltNavn) gammeltNavn.style.display = 'none'

      // Feltet i banens farve (fra $kort-bane-farver via --kort-bane-<id> i KortView.vue)
      felt.style.fill = `var(--kort-bane-${bane.id})`

      // Det nye navn, centreret i feltet
      const x = parseFloat(felt.getAttribute('x')) + parseFloat(felt.getAttribute('width')) / 2
      const y = parseFloat(felt.getAttribute('y')) + parseFloat(felt.getAttribute('height')) / 2
      const tekst = dokument.createElementNS('http://www.w3.org/2000/svg', 'text')
      tekst.setAttribute('x', x)
      tekst.setAttribute('y', y)
      tekst.setAttribute('class', 'bane-label__tekst')
      tekst.setAttribute('aria-hidden', 'true') // Knappen har allerede et aria-label med navnet
      tekst.textContent = bane.navn
      gruppe.appendChild(tekst)
    })

    // AKTIVITETER
    // Free Fall og Bounce er ikke linjer, men tegninger i kort-base.svg.
    // De gøres også klikbare, så man kan få popup'en for dem
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

    // STIL INDE I SVG'EN
    // Komponentens <style scoped> virker ikke på elementer, vi selv har sat ind med JavaScript.
    // Derfor lægges CSS'en for klik, markering og filter direkte ind i SVG'en som et <style>-element
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

      /* SKJULER/TONER BANER NED NÅR DE IKKE ER VALGT I FILTERET */
      [data-bane].er-skaermet {
        opacity: 0.2;
        transition: opacity 0.3s ease;
      }
    `

    svg.appendChild(stil)

    // Nu er kortet færdigt – sæt det ind på siden (erstatter det, der var før)
    kortHolder.value.replaceChildren(svg)

    // Skiltene (navne-labels) får en bredde, der passer til navnet, med ens luft på alle sider.
    // Teksten kan først måles, når kortet står på siden – derfor sker det her.
    // Skiltet beholder sin midte, så det står samme sted på kortet som før
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
      // Helt runde ender som en pille
      felt.setAttribute('rx', SKILT_HOEJDE / 2)
      felt.setAttribute('ry', SKILT_HOEJDE / 2)
    })


    // HVIDE KONTURER OM AKTIVITETERNE
    // Bounce og Free Fall har ingen streg, der kan lyse op. Derfor får de en usynlig hvid kontur,
    // som bliver synlig, når aktiviteten er valgt eller har musen over sig (klassen er-aktiv).
    // Bounce får en kontur med trampolinens form, Free Fall en afrundet firkant rundt om tegningen
    const trampolin = svg.querySelector('#Bounce > path.st25')
    const fritFald = svg.querySelector('#Free-Fall')

    if (!trampolin || !fritFald) {
      throw new Error('Kunne ikke finde Bounce eller Free Fall i SVG-kortet')
    }

    const bounceKontur = dokument.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    )
    bounceKontur.setAttribute('d', trampolin.getAttribute('d'))
    bounceKontur.setAttribute('class', 'aktivitet-kontur')
    bounceKontur.dataset.bane = 'bounce'
    svg.appendChild(bounceKontur)

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

    // Start med hele parken, og vis markering og filter, som de står lige nu
    nulstilKort()
    opdaterMarkering()
    opdaterFiltrering()

  } catch (error) {
    // AbortError = vi har selv afbrudt hentningen (fx forladt siden) – det er ikke en fejl
    if (error.name !== 'AbortError') {
      fejl.value = error.message
      console.error(error)
    }
  } finally {
    indlaeser.value = false
  }
}


// ==========================================
// 6. START OG OPRYDNING
// ==========================================

// Når kortet er vist på siden:
// - ResizeObserver kører opdaterKort, når boksen skifter størrelse (fx vinduet ændres)
// - pointerup/pointercancel lyttes på hele vinduet, så et træk også stopper, hvis man
//   slipper uden for kortet
// - kortet hentes
onMounted(() => {
  observer = new ResizeObserver(opdaterKort)
  observer.observe(kortHolder.value)

  window.addEventListener('pointerup', pointerOp)
  window.addEventListener('pointercancel', pointerOp)

  indlaesKort()
})

// Når man forlader kortsiden: stop hentning, observer og lyttere, så intet kører videre
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
      <!-- Tom boks, som SVG-kortet bliver sat ind i fra indlaesKort.
           Her lyttes efter mus/touch (træk og knib) og musehjul (zoom).
           touch-action: none = browseren må ikke selv scrolle/zoome siden, når man rører kortet -->
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

      <!-- Øverst til højre: "Vis hele parken" + lukkeknap -->
      <div class="kort-tophoejre">
        <!-- Udseendet kommer fra .button-primary i _buttons.scss -->
        <button type="button" class="button-primary kort-reset-top" @click="nulstilKort">
          Vis hele parken
        </button>
        <!-- Kryds: går altid til forsiden. Udseendet kommer fra .button-close i _buttons.scss -->
        <RouterLink to="/" class="button-close kort-luk" aria-label="Luk kortet og gå til forsiden">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </RouterLink>
      </div>

      <!-- Besked, mens kortet hentes – eller fejlbesked med "Prøv igen" -->
      <div v-if="indlaeser" class="kort-status" role="status">
        Kortet indlæses…
      </div>

      <div v-else-if="fejl" class="kort-status fejl" role="alert">
        <p>{{ fejl }}</p>
        <button type="button" @click="indlaesKort">Prøv igen</button>
      </div>

      <!-- Lille hjælpetekst, der skifter, når man har zoomet ind -->
      <div class="kort-vejledning" aria-hidden="true">
        {{ zoom <= 1 ? 'Hele parken er synlig · Zoom for at udforske banerne' : 'Træk for at udforske' }}
      </div>

      <!-- + og − zoomer 30 % ad gangen. Knapperne slås fra ved største og mindste zoom -->
      <div class="kort-vaerktoejer" aria-label="Kortnavigation">
        <button type="button" aria-label="Zoom ind" :disabled="zoom >= MAKS_ZOOM" @click="saetZoom(zoom * 1.3)">+</button>
        <span class="kort-vaerktoej-linje"></span>
        <button type="button" aria-label="Zoom ud" :disabled="zoom <= 1" @click="saetZoom(zoom / 1.3)">−</button>
      </div>

      <!-- Viser zoomniveauet, fx "2.4×" -->
      <span class="kort-zoom" aria-live="polite">{{ zoom.toFixed(1) }}×</span>

      <!-- Popup'en for den valgte bane. Transition fader den ind og ud.
           Lukkeknappen kalder vaelgBane med samme id, så banen bliver fravalgt -->
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