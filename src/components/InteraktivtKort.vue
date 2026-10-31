<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { hentKortbaner } from '@/services/kortApi.js'
import {
  KORT_BREDDE,
  KORT_HOEJDE,
  MAKS_ZOOM,
  begraens,
  beregnViewBox
} from '@/utils/kortKamera.js'

// 1. MODTAG FILTER PROPPEN FRA KORTVIEW.VUE
const props = defineProps({
  filter: {
    type: [String, Array],
    default: 'alle'
  }
})

const emit = defineEmits(['bane-valgt'])

const kortHolder = ref(null)
const baner = ref([])
const valgtId = ref(null)
const hoverId = ref(null)
const zoom = ref(1)
const indlaeser = ref(true)
const fejl = ref('')

const valgtBane = computed(() =>
  baner.value.find(b => b.id === valgtId.value)
)

let svg
let observer
let controller

const fingre = new Map()
let pinch = null
let sidstTraekket = 0

let center = {
  x: KORT_BREDDE / 2,
  y: KORT_HOEJDE / 2
}

let view

// ==========================================
// NY DEL: FILTRERING AF KORTET
// ==========================================
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

// Lyt efter ændringer i filteret fra App.vue
watch(() => props.filter, opdaterFiltrering)


// ==========================================
// 2. ZOOM OG KORTETS POSITION
// ==========================================

function opdaterKort() {
  if (!svg || !kortHolder.value) return

  const { width, height } = kortHolder.value.getBoundingClientRect()

  view = beregnViewBox({
    center,
    zoom: zoom.value,
    viewportWidth: width,
    viewportHeight: height
  })

  center = view.center

  svg.setAttribute(
    'viewBox',
    `${view.x} ${view.y} ${view.width} ${view.height}`
  )
}

function saetZoom(nyZoom, anker = { x: 0.5, y: 0.5 }) {
  if (!svg || !view) return

  const nytNiveau = begraens(nyZoom, 1, MAKS_ZOOM)
  if (nytNiveau === zoom.value) return

  const punktX = view.x + view.width * anker.x
  const punktY = view.y + view.height * anker.y

  const { width, height } = kortHolder.value.getBoundingClientRect()

  const nyView = beregnViewBox({
    center,
    zoom: nytNiveau,
    viewportWidth: width,
    viewportHeight: height
  })

  center = {
    x: punktX + (0.5 - anker.x) * nyView.width,
    y: punktY + (0.5 - anker.y) * nyView.height
  }

  zoom.value = nytNiveau
  opdaterKort()
}

function nulstilKort() {
  zoom.value = 1
  center = {
    x: KORT_BREDDE / 2,
    y: KORT_HOEJDE / 2
  }
  opdaterKort()
}

function panorer(dx, dy) {
  const { width, height } = kortHolder.value.getBoundingClientRect()
  center.x -= dx / width * view.width
  center.y -= dy / height * view.height
  opdaterKort()
}

function ankerPunkt(x, y) {
  const r = kortHolder.value.getBoundingClientRect()
  return {
    x: begraens((x - r.left) / r.width, 0, 1),
    y: begraens((y - r.top) / r.height, 0, 1)
  }
}

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

function fingerPar() {
  return [...fingre.values()].slice(0, 2)
}

function fingerAfstand(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function fingerMidte(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  }
}

function pointerNed(event) {
  if (!svg || (event.pointerType === 'mouse' && event.button !== 0)) return

  fingre.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
    startX: event.clientX,
    startY: event.clientY,
    flyttet: false
  })

  if (fingre.size === 2) {
    const [a, b] = fingerPar()
    pinch = {
      afstand: fingerAfstand(a, b),
      midte: fingerMidte(a, b)
    }

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
  if (!finger || !view) return

  const dx = event.clientX - finger.x
  const dy = event.clientY - finger.y

  finger.x = event.clientX
  finger.y = event.clientY

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

  if (fingre.size === 1) {
    const sidste = [...fingre.values()][0]
    sidste.startX = sidste.x
    sidste.startY = sidste.y
    sidste.flyttet = false
  }
}

function stopKlikEfterTraek(event) {
  if (performance.now() - sidstTraekket < 250) {
    event.preventDefault()
    event.stopPropagation()
  }
}


// ==========================================
// 4. BANEVALG OG MARKERING
// ==========================================

function vaelgBane(id) {
  if (performance.now() - sidstTraekket < 250) return
  valgtId.value = valgtId.value === id ? null : id
  emit('bane-valgt', valgtId.value)
}

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

watch([valgtId, hoverId], opdaterMarkering)


// ==========================================
// 5. FIREBASE OG SVG
// ==========================================

async function indlaesKort() {
  indlaeser.value = true
  fejl.value = ''

  controller?.abort()
  controller = new AbortController()

  try {
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

    const dokument = new DOMParser().parseFromString(
      await svar.text(),
      'image/svg+xml'
    )

    if (dokument.querySelector('parsererror')) {
      throw new Error('SVG-filen er ugyldig')
    }

    svg = dokument.documentElement
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')

    for (const bane of baner.value) {
      for (const segment of bane.segmenter ?? []) {
        const gruppe = svg.querySelector(`[id="${segment.slot}"]`)

        if (!gruppe || !segment.paths?.[1]) {
          throw new Error(`Manglende SVG-data: ${segment.slot}`)
        }

        gruppe.classList.add('bane-segment')
        gruppe.dataset.bane = bane.id

        for (const sti of segment.paths) {
          const path = dokument.createElementNS(
            'http://www.w3.org/2000/svg',
            'path'
          )
          path.setAttribute('class', sti.class)
          path.setAttribute('d', sti.d)
          gruppe.appendChild(path)
        }

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
    kortHolder.value.replaceChildren(svg)

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
    sortKontur.dataset.bane = 'sort'
    svg.appendChild(sortKontur)

    nulstilKort()
    opdaterMarkering()
    opdaterFiltrering() // Kør filtrering med det samme kortet er indlæst

  } catch (error) {
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

onMounted(() => {
  observer = new ResizeObserver(opdaterKort)
  observer.observe(kortHolder.value)

  window.addEventListener('pointerup', pointerOp)
  window.addEventListener('pointercancel', pointerOp)

  indlaesKort()
})

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

      <div class="kort-toplinje" aria-hidden="true">
        <span class="kort-brand">GoMonkey <span>Odense</span></span>
      </div>

      <div class="kort-tophoejre">
        <button type="button" class="kort-reset-top" @click="nulstilKort">
          Vis hele parken
        </button>
      </div>

      <div v-if="indlaeser" class="kort-status" role="status">
        Kortet indlæses…
      </div>

      <div v-else-if="fejl" class="kort-status fejl" role="alert">
        <p>{{ fejl }}</p>
        <button type="button" @click="indlaesKort">Prøv igen</button>
      </div>

      <div class="kort-vejledning" aria-hidden="true">
        {{ zoom <= 1 ? 'Træk og zoom for at udforske banerne' : 'Træk for at udforske' }}
      </div>

      <div class="kort-vaerktoejer" aria-label="Kortnavigation">
        <button type="button" aria-label="Zoom ind" :disabled="zoom >= MAKS_ZOOM" @click="saetZoom(zoom * 1.3)">+</button>
        <span class="kort-vaerktoej-linje"></span>
        <button type="button" aria-label="Zoom ud" :disabled="zoom <= 1" @click="saetZoom(zoom / 1.3)">−</button>
      </div>

      <span class="kort-zoom" aria-live="polite">{{ zoom.toFixed(1) }}×</span>

      <div v-if="valgtBane" class="kort-valgt" aria-live="polite">
        <span class="bane-prik" :style="{ backgroundColor: valgtBane.farve }"></span>
        <span>{{ valgtBane.navn }}</span>
        <button type="button" aria-label="Fjern valgt bane" @click="vaelgBane(valgtBane.id)">×</button>
      </div>
    </div>
  </section>
</template>