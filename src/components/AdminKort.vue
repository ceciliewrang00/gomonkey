<script setup>
// Rediger det interaktive kort og kortfiltret. Vises i AdminView under fanen "Kort".
// Udseendet kommer fra de fælles styles i AdminView.vue (+ lidt til kort-editoren herunder)
//
// Data:
//  - Firebase "kortbaner": banens forløb. Hver bane har en liste af linjer (segmenter),
//    og hver linje har to punkter [x, y] i kortets koordinater. Kortet tegner stregerne ud fra dem.
//  - Firebase "mapfilter": teksterne i kortfiltret (undertekst, og navn/sværhedsgrad for nye baner)
//  - Firebase "baner": kun læst her, så vi kan vise banens navn

import BaseButton from '@/components/BaseButton.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { KORTBANER_URL, KORTFILTER_URL, hentToken } from '@/services/api.js'
import { hentBaner } from '@/services/baner.js'
import { hentKortbanerFraFirebase } from '@/services/kortApi.js'
import { lavStier } from '@/utils/kortStier.js'

// Kortets størrelse – samme viewBox som i public/kort-base.svg
const KORT_BREDDE = 1683.78
const KORT_HOEJDE = 1810.98

// Slipper man et punkt tættere end dette på et andet punkt, sættes det oven i det,
// så linjerne hænger sammen
const SNAP_AFSTAND = 15

const SVAERHED_VALG = ['For alle', 'Let', 'Mellem', 'Svær', 'Ekspert']

// Alle kortbaner: { id, type, navn, farve, segmenter: [{ slot, punkter: [[x, y], [x, y]] }] }
const kortbaner = ref([])

// Kortfiltrets poster med deres plads i Firebase-listen (indeks), så vi kan gemme på den rigtige
const filterPoster = ref([])

// Banerne fra fanen "Baner" (kun til navne)
const faellesBaner = ref([])

const indlaeser = ref(true)
const fejlbesked = ref('')
const besked = ref('')

// Kopien af den bane, der redigeres lige nu (null = ingen)
const redigerer = ref(null)
const gemmerRedigering = ref(false)

// Id på banen, der slettes lige nu ('' = ingen)
const sletterId = ref('')

// Formularen til en ny bane
const nyBane = ref(tomNyBane())
const opretter = ref(false)
const opretBesked = ref('')

function tomNyBane() {
  return { navn: '', undertekst: '', type: 'bane', svaerhed: 'Let', farve: '#CED0C0' }
}

// ---------- Hent data ----------

async function hentAlt() {
  indlaeser.value = true
  fejlbesked.value = ''

  try {
    const [geometri, filterSvar, baner] = await Promise.all([
      hentKortbanerFraFirebase(),
      fetch(`${KORTFILTER_URL}.json`).then((r) => {
        if (!r.ok) throw new Error(`Fejl ${r.status}`)
        return r.json()
      }),
      hentBaner().catch(() => [])
    ])

    faellesBaner.value = baner

    kortbaner.value = geometri.map(tilRedigerbar)

    // mapfilter er en liste i Firebase. Vi husker hver posts nummer (indeks)
    filterPoster.value = Object.entries(filterSvar ?? {})
      .filter(([, post]) => post)
      .map(([indeks, post]) => ({ indeks, ...post }))
  } catch (e) {
    fejlbesked.value = 'Kortets data kunne ikke hentes.'
    console.error(e)
  } finally {
    indlaeser.value = false
  }
}

// Gør en bane klar til redigering: kun punkter, ingen færdige streger.
// Firebase kan give lister som objekter, så de laves om til lister
function tilRedigerbar(bane) {
  const segmenter = Object.values(bane.segmenter ?? {}).map((seg) => ({
    slot: seg.slot ?? null,
    punkter: seg.punkter.map(([x, y]) => [x, y])
  }))
  return {
    id: bane.id,
    type: bane.type ?? 'bane',
    navn: bane.navn ?? '',
    farve: bane.farve ?? '',
    segmenter
  }
}

// ---------- Hjælpere til visning ----------

function faellesFor(id) {
  return faellesBaner.value.find((b) => b.id === id)
}

function filterFor(id) {
  return filterPoster.value.find((p) => p.id === id)
}

// Navnet fra fanen "Baner", ellers fra kortet, ellers fra filtret, ellers id'et
function navnFor(bane) {
  return faellesFor(bane.id)?.name || bane.navn || filterFor(bane.id)?.titel || bane.id
}

// Banens farve i editoren. Faste baner har farven i _colors.scss (CSS-variabel herunder)
function farveFor(bane) {
  return `var(--kort-bane-${bane.id}, ${bane.farve || '#CED0C0'})`
}

// Alle andre banes linjer vises svagt i editoren, så man kan se, hvor de går
const andreLinjer = computed(() =>
  kortbaner.value
    .filter((b) => b.id !== redigerer.value?.id)
    .flatMap((b) => b.segmenter.map((seg, i) => ({ noegle: `${b.id}-${i}`, punkter: seg.punkter })))
)

// ---------- Rediger en bane ----------

function startRedigering(bane) {
  const post = filterFor(bane.id)
  besked.value = ''
  redigerer.value = {
    ...tilRedigerbar(bane),
    navn: bane.navn || post?.titel || '',
    undertekst: post?.undertekst ?? '',
    svaerhed: post?.svaerhed ?? 'Let',
    farve: bane.farve || '#CED0C0',
    // Faste baner har navn og sværhedsgrad under fanen "Baner"
    harFaelles: Boolean(faellesFor(bane.id))
  }
  aktivLinje.value = null
  stopTegning()
}

function annullerRedigering() {
  redigerer.value = null
  besked.value = ''
  stopTegning()
}

// ---------- Kort-editoren ----------

const editorSvg = ref(null)

// Den linje, man har klikket på (null = ingen). Kan fjernes med "Fjern valgt linje"
const aktivLinje = ref(null)

// Laver musens/fingerens placering om til kortets koordinater
function tilKort(event) {
  // Editoren ligger inde i v-for, så Vue giver en liste. Der er kun én åben ad gangen
  const svg = [editorSvg.value].flat()[0]
  const pt = svg.createSVGPoint()
  pt.x = event.clientX
  pt.y = event.clientY
  const p = pt.matrixTransform(svg.getScreenCTM().inverse())
  return [Math.min(Math.max(p.x, 0), KORT_BREDDE), Math.min(Math.max(p.y, 0), KORT_HOEJDE)]
}

function sammePunkt(a, b, afstand = 0.5) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) <= afstand
}

// Alle punkter på kortet (alle baner), så nye punkter kan sætte sig fast i dem
function allePunkter() {
  return [
    ...kortbaner.value.filter((b) => b.id !== redigerer.value.id).flatMap((b) => b.segmenter),
    ...redigerer.value.segmenter
  ].flatMap((seg) => seg.punkter)
}

// Ligger der et punkt tæt på, bruges det i stedet – så linjerne hænger sammen.
// undtagen = punkter, der ikke tæller med (dem, man selv trækker i)
function fastgoer(punkt, undtagen = []) {
  const naer = allePunkter().find((p) => !undtagen.includes(p) && sammePunkt(p, punkt, SNAP_AFSTAND))
  return naer ? [naer[0], naer[1]] : [Math.round(punkt[0] * 100) / 100, Math.round(punkt[1] * 100) / 100]
}

function fjernAktivLinje() {
  redigerer.value.segmenter.splice(aktivLinje.value, 1)
  aktivLinje.value = null
}

// ---------- Tegn nye linjer ----------
// Tryk "Tegn linjer", og klik på kortet fra platform til platform.
// Hvert klik laver en linje fra det forrige punkt, så banen tegnes som en kæde

// true, mens man tegner
const tegner = ref(false)

// Punktet, den næste linje starter i (null = første klik er ikke sket endnu)
const tegnStart = ref(null)

// Hvor musen er lige nu – til den stiplede linje, der viser, hvor næste linje kommer
const musPunkt = ref(null)

function startTegning() {
  tegner.value = true
  tegnStart.value = null
  aktivLinje.value = null
}

function stopTegning() {
  tegner.value = false
  tegnStart.value = null
  musPunkt.value = null
}

// Starter tegningen fra et nyt sted (fx en ny gren af banen), uden at stoppe
function nyStart() {
  tegnStart.value = null
}

function klikPaaKort(event) {
  if (!tegner.value) return
  const punkt = fastgoer(tilKort(event))

  if (tegnStart.value && !sammePunkt(tegnStart.value, punkt)) {
    redigerer.value.segmenter.push({ slot: null, punkter: [tegnStart.value, punkt] })
  }
  // Næste linje starter, hvor denne sluttede
  tegnStart.value = [punkt[0], punkt[1]]
}

// Fortryder den sidste linje. Under tegning starter man igen fra dens begyndelse
function fortrydLinje() {
  const sidste = redigerer.value.segmenter.pop()
  if (tegner.value && sidste) tegnStart.value = [...sidste.punkter[0]]
  aktivLinje.value = null
}

// Esc stopper tegningen
function tastatur(event) {
  if (event.key === 'Escape' && tegner.value) stopTegning()
}

// ---------- Træk i punkter ----------

// Punkterne, der trækkes i lige nu. Ligger flere linjer i samme punkt (fx en platform),
// flytter de med hinanden, så banen hænger sammen
let trukne = []

function grib(linje, ende, event) {
  // Under tegning er et klik på et punkt bare et klik på kortet
  if (tegner.value) return
  event.preventDefault()
  const greb = redigerer.value.segmenter[linje].punkter[ende]
  trukne = redigerer.value.segmenter.flatMap((seg) => seg.punkter.filter((p) => sammePunkt(p, greb)))
  aktivLinje.value = linje
  // Bliver ved med at få bevægelser, selv om musen kommer uden for punktet
  event.target.setPointerCapture(event.pointerId)
}

function flyt(event) {
  if (tegner.value) {
    musPunkt.value = tilKort(event)
    return
  }
  if (trukne.length === 0) return
  const [x, y] = tilKort(event)
  for (const p of trukne) {
    p[0] = x
    p[1] = y
  }
}

// Når man slipper, sættes punktet oven i et punkt i nærheden (på alle baner)
function slip() {
  if (trukne.length === 0) return
  const [x, y] = fastgoer(trukne[0], trukne)
  for (const p of trukne) {
    p[0] = x
    p[1] = y
  }
  trukne = []
}

// ---------- Gem ----------

// Det, der gemmes i "kortbaner". Kun punkter – stregerne tegnes på kortet
function kortbaneTilGem(r) {
  const data = {
    id: r.id,
    type: r.type,
    segmenter: r.segmenter.map((seg) => ({
      ...(seg.slot ? { slot: seg.slot } : {}),
      punkter: seg.punkter.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100])
    }))
  }
  // Navn og farve gemmes kun på nye baner – faste baner har dem i "Baner" og _colors.scss
  if (!r.harFaelles) {
    data.navn = r.navn.trim()
    data.farve = r.farve
  }
  return data
}

async function skrivFirebase(url, metode, data) {
  const token = await hentToken()
  const res = await fetch(`${url}.json?auth=${encodeURIComponent(token)}`, {
    method: metode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(`Fejl ${res.status}`)
}

// Gemmer kortfiltrets tekster. Findes banen ikke i filtret, lægges den sidst i listen
async function gemFilter(id, felter) {
  const post = filterFor(id)
  if (post) {
    await skrivFirebase(`${KORTFILTER_URL}/${post.indeks}`, 'PATCH', felter)
    Object.assign(post, felter)
  } else {
    const indeks = String(Math.max(-1, ...filterPoster.value.map((p) => Number(p.indeks))) + 1)
    await skrivFirebase(`${KORTFILTER_URL}/${indeks}`, 'PUT', { id, ...felter })
    filterPoster.value.push({ indeks, id, ...felter })
  }
}

// Tjekker en hex-farvekode, fx "#b8433f" eller "#b43". Mangler # foran, sættes den på.
// Giver null, hvis koden ikke er gyldig
function rensFarve(tekst) {
  const kode = String(tekst ?? '').trim()
  const medHaven = kode.startsWith('#') ? kode : '#' + kode
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(medHaven) ? medHaven.toLowerCase() : null
}

const FARVE_FEJL = 'Skriv farven som en hex-kode, fx #b8433f.'

async function gemRedigering() {
  const r = redigerer.value
  besked.value = ''

  if (!r.harFaelles && !r.navn.trim()) {
    besked.value = 'Banen skal have et navn.'
    return
  }

  if (!r.harFaelles) {
    const farve = rensFarve(r.farve)
    if (!farve) {
      besked.value = FARVE_FEJL
      return
    }
    r.farve = farve
  }

  gemmerRedigering.value = true
  try {
    const data = kortbaneTilGem(r)

    // PUT erstatter hele banen, så slettede linjer også forsvinder
    await skrivFirebase(`${KORTBANER_URL}/${encodeURIComponent(r.id)}`, 'PUT', data)

    const filterFelter = { undertekst: r.undertekst.trim() }
    if (!r.harFaelles) {
      filterFelter.titel = r.navn.trim()
      filterFelter.svaerhed = r.svaerhed
    }
    await gemFilter(r.id, filterFelter)

    // Opdaterer listen på siden
    const indeks = kortbaner.value.findIndex((b) => b.id === r.id)
    kortbaner.value[indeks] = tilRedigerbar(data)

    redigerer.value = null
    besked.value = 'Banen er gemt. Kortet viser ændringen, næste gang det åbnes.'
  } catch (e) {
    besked.value = 'Banen kunne ikke gemmes. Prøv igen.'
    console.error(e)
  } finally {
    gemmerRedigering.value = false
  }
}

// ---------- Slet bane ----------

// Fjerner banen fra kortet ("kortbaner") og fra kortfiltret ("mapfilter").
// Faste baner har også tekster under fanen "Baner" – de bliver liggende
async function sletBane(bane) {
  besked.value = ''

  const navn = navnFor(bane)
  const advarsel = faellesFor(bane.id)
    ? `Vil du slette "${navn}" fra kortet og kortfiltret?\n\nTeksterne under fanen "Baner" bliver liggende.`
    : `Vil du slette "${navn}" fra kortet og kortfiltret?`
  if (!window.confirm(advarsel)) return

  sletterId.value = bane.id
  try {
    const token = await hentToken()
    const slet = async (url) => {
      const res = await fetch(`${url}.json?auth=${encodeURIComponent(token)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Fejl ${res.status}`)
    }

    await slet(`${KORTBANER_URL}/${encodeURIComponent(bane.id)}`)

    // mapfilter er en liste. Den slettede plads bliver tom, og kortfiltret springer tomme over
    const post = filterFor(bane.id)
    if (post) {
      await slet(`${KORTFILTER_URL}/${post.indeks}`)
      filterPoster.value = filterPoster.value.filter((p) => p !== post)
    }

    kortbaner.value = kortbaner.value.filter((b) => b.id !== bane.id)
    if (redigerer.value?.id === bane.id) redigerer.value = null

    besked.value = `"${navn}" er slettet.`
  } catch (e) {
    besked.value = 'Banen kunne ikke slettes. Prøv igen.'
    console.error(e)
  } finally {
    sletterId.value = ''
  }
}

// ---------- Opret bane ----------

// Nyt id: bane-8, bane-9 osv. (et højere nummer end de eksisterende)
function nytId() {
  const numre = kortbaner.value
    .map((b) => Number(b.id.match(/^bane-(\d+)$/)?.[1]))
    .filter((n) => !Number.isNaN(n))
  return `bane-${Math.max(0, ...numre) + 1}`
}

async function opretBane() {
  opretBesked.value = ''
  const ny = nyBane.value

  if (!ny.navn.trim()) {
    opretBesked.value = 'Skriv et navn til banen.'
    return
  }

  const farve = rensFarve(ny.farve)
  if (!farve) {
    opretBesked.value = FARVE_FEJL
    return
  }
  ny.farve = farve

  opretter.value = true
  try {
    const id = nytId()
    const data = kortbaneTilGem({ ...ny, id, segmenter: [], harFaelles: false })
    await skrivFirebase(`${KORTBANER_URL}/${id}`, 'PUT', data)
    await gemFilter(id, { titel: ny.navn.trim(), undertekst: ny.undertekst.trim(), svaerhed: ny.svaerhed })

    const bane = tilRedigerbar(data)
    kortbaner.value.push(bane)
    nyBane.value = tomNyBane()
    opretBesked.value = 'Banen er oprettet. Tegn dens linjer på kortet ovenfor.'

    // Åbner den nye bane, så man kan tegne linjerne med det samme
    if (bane.type === 'bane') startRedigering(bane)
  } catch (e) {
    opretBesked.value = 'Banen kunne ikke oprettes. Prøv igen.'
    console.error(e)
  } finally {
    opretter.value = false
  }
}

onMounted(() => {
  hentAlt()
  window.addEventListener('keydown', tastatur)
})

onUnmounted(() => {
  window.removeEventListener('keydown', tastatur)
})
</script>

<template>
  <h2>Rediger kort og kortfilter</h2>

  <p v-if="besked" role="status">{{ besked }}</p>

  <!-- v-if / v-else-if / v-else: kun én af dem vises ad gangen -->
  <p v-if="indlaeser">Henter kortet...</p>
  <p v-else-if="fejlbesked">{{ fejlbesked }}</p>
  <p v-else-if="kortbaner.length === 0">Der er ingen baner på kortet endnu.</p>

  <div v-else class="admin-liste">
    <!-- Ét kort pr. bane -->
    <article v-for="bane in kortbaner" :key="bane.id" class="admin-kort">
      <h3>
        <span class="farve-prik" :style="{ background: farveFor(bane) }" aria-hidden="true"></span>
        {{ navnFor(bane) }}
      </h3>

      <p>Type: {{ bane.type }} · Linjer: {{ bane.segmenter.length }}</p>
      <p v-if="filterFor(bane.id)?.undertekst">Kortfilter: {{ filterFor(bane.id).undertekst }}</p>

      <div class="knapper">
        <BaseButton type="button" variant="primary" @click="startRedigering(bane)">
          Rediger bane
        </BaseButton>
      </div>

      <!-- Vises kun på den bane, der redigeres -->
      <section v-if="redigerer?.id === bane.id" class="redigering">
        <h3>Rediger {{ navnFor(bane) }}</h3>

        <!-- Navn og sværhedsgrad: faste baner retter man under fanen "Baner" -->
        <template v-if="!redigerer.harFaelles">
          <label :for="'kort-navn-' + bane.id">Navn</label>
          <input :id="'kort-navn-' + bane.id" v-model="redigerer.navn" type="text" required />

          <label :for="'kort-svaerhed-' + bane.id">Sværhedsgrad i kortfiltret</label>
          <select :id="'kort-svaerhed-' + bane.id" v-model="redigerer.svaerhed">
            <option v-for="s in SVAERHED_VALG" :key="s" :value="s">{{ s }}</option>
          </select>

          <label :for="'kort-farve-' + bane.id">Farve på kortet (hex-kode, fx #b8433f)</label>
          <div class="farve-raekke">
            <input
              :id="'kort-farve-' + bane.id"
              v-model="redigerer.farve"
              type="text"
              placeholder="#b8433f"
              class="farve-felt"
            />
            <!-- Viser farven, så snart koden er gyldig -->
            <span
              class="farve-prik farve-proeve"
              :style="{ background: rensFarve(redigerer.farve) ?? 'transparent' }"
              aria-hidden="true"
            ></span>
          </div>
        </template>
        <p v-else>Navn og sværhedsgrad rettes under fanen "Baner".</p>

        <label :for="'kort-undertekst-' + bane.id">Undertekst i kortfiltret (fx "Tarzan spring")</label>
        <input :id="'kort-undertekst-' + bane.id" v-model="redigerer.undertekst" type="text" />

        <label :for="'kort-type-' + bane.id">Type</label>
        <select :id="'kort-type-' + bane.id" v-model="redigerer.type">
          <option value="bane">Bane (har linjer på kortet)</option>
          <option value="aktivitet">Aktivitet (ingen linjer, fx Bounce)</option>
        </select>

        <!-- Kort-editoren. Alt rettes ved at klikke og trække på kortet -->
        <template v-if="redigerer.type === 'bane'">
          <!-- Hjælpeteksten skifter, så den passer til det, man er i gang med -->
          <p class="hjaelp" role="status">
            <template v-if="tegner && !tegnStart">
              Klik på kortet, hvor linjen skal starte. Klik tæt på et punkt for at fortsætte derfra.
            </template>
            <template v-else-if="tegner">
              Klik, hvor linjen skal slutte. Bliv ved med at klikke for at tegne videre. Tryk Esc eller "Færdig", når du er færdig.
            </template>
            <template v-else>
              Træk i de hvide punkter for at flytte banen. Klik på en linje for at vælge den.
            </template>
          </p>

          <!-- Værktøjer over kortet -->
          <div class="knapper editor-knapper">
            <template v-if="!tegner">
              <BaseButton type="button" variant="primary" @click="startTegning">Tegn linjer</BaseButton>
              <BaseButton
                v-if="aktivLinje !== null"
                type="button"
                variant="secondary"
                @click="fjernAktivLinje"
              >
                Fjern valgt linje
              </BaseButton>
            </template>
            <template v-else>
              <BaseButton type="button" variant="primary" @click="stopTegning">Færdig</BaseButton>
              <BaseButton v-if="tegnStart" type="button" variant="secondary" @click="nyStart">
                Start et nyt sted
              </BaseButton>
              <BaseButton
                v-if="redigerer.segmenter.length"
                type="button"
                variant="secondary"
                @click="fortrydLinje"
              >
                Fortryd sidste linje
              </BaseButton>
            </template>
          </div>

          <svg
            ref="editorSvg"
            class="kort-editor"
            :class="{ 'tegner': tegner }"
            :viewBox="`0 0 ${KORT_BREDDE} ${KORT_HOEJDE}`"
            role="img"
            :aria-label="'Kort med ' + navnFor(bane) + 's linjer'"
            @click="klikPaaKort"
            @pointermove="flyt"
            @pointerup="slip"
            @pointercancel="slip"
            @pointerleave="musPunkt = null"
          >
            <image href="/kort-base.svg" x="0" y="0" :width="KORT_BREDDE" :height="KORT_HOEJDE" />

            <!-- De andre baners linjer, svagt -->
            <line
              v-for="l in andreLinjer"
              :key="l.noegle"
              class="anden-linje"
              :x1="l.punkter[0][0]"
              :y1="l.punkter[0][1]"
              :x2="l.punkter[1][0]"
              :y2="l.punkter[1][1]"
            />

            <!-- Denne banes linjer, tegnet som på det rigtige kort. Klik for at vælge en -->
            <g
              v-for="(seg, i) in redigerer.segmenter"
              :key="'seg-' + i"
              class="linje"
              :class="{ 'er-aktiv': aktivLinje === i }"
              @click="!tegner && (aktivLinje = aktivLinje === i ? null : i)"
            >
              <path class="kant" :d="lavStier(seg.punkter)[0].d" />
              <path class="farve" :d="lavStier(seg.punkter)[1].d" :style="{ stroke: farveFor(redigerer) }" />
              <path class="reb" :d="lavStier(seg.punkter)[2].d" />
              <!-- Usynlig, bred streg, så linjen er nem at ramme -->
              <path class="klikflade" :d="lavStier(seg.punkter)[1].d" />
            </g>

            <!-- Stiplet linje fra sidste punkt til musen, mens man tegner -->
            <line
              v-if="tegner && tegnStart && musPunkt"
              class="forhaandsvisning"
              :x1="tegnStart[0]"
              :y1="tegnStart[1]"
              :x2="musPunkt[0]"
              :y2="musPunkt[1]"
              :style="{ stroke: farveFor(redigerer) }"
            />

            <!-- Punkterne, man kan trække i -->
            <template v-for="(seg, i) in redigerer.segmenter" :key="'punkter-' + i">
              <circle
                v-for="(p, ende) in seg.punkter"
                :key="ende"
                class="haandtag"
                :class="{ 'er-aktiv': aktivLinje === i }"
                :cx="p[0]"
                :cy="p[1]"
                r="14"
                @pointerdown="grib(i, ende, $event)"
              />
            </template>

            <!-- Startpunktet for næste linje -->
            <circle
              v-if="tegner && tegnStart"
              class="tegn-start"
              :cx="tegnStart[0]"
              :cy="tegnStart[1]"
              r="18"
            />
          </svg>
        </template>

        <div class="knapper">
          <BaseButton type="button" variant="secondary" @click="annullerRedigering">Annuller</BaseButton>
          <BaseButton type="button" variant="primary" :disabled="gemmerRedigering" @click="gemRedigering">
            {{ gemmerRedigering ? 'Gemmer...' : 'Gem ændringer' }}
          </BaseButton>
        </div>

        <!-- Slet ligger inde i redigeringen, så man ikke kommer til at trykke på den ved en fejl -->
        <div class="knapper">
          <BaseButton
            type="button"
            variant="secondary"
            :disabled="sletterId !== '' || gemmerRedigering"
            @click="sletBane(bane)"
          >
            {{ sletterId === bane.id ? 'Sletter...' : 'Slet bane' }}
          </BaseButton>
        </div>
      </section>
    </article>
  </div>

  <!-- Opret bane (under listen, ligesom i quiz) -->
  <section v-if="!indlaeser && !fejlbesked" class="admin-kort">
    <h2>Opret bane</h2>

    <label for="ny-kortbane-navn">Navn</label>
    <input id="ny-kortbane-navn" v-model="nyBane.navn" type="text" required />

    <label for="ny-kortbane-undertekst">Undertekst i kortfiltret (valgfri)</label>
    <input id="ny-kortbane-undertekst" v-model="nyBane.undertekst" type="text" />

    <label for="ny-kortbane-type">Type</label>
    <select id="ny-kortbane-type" v-model="nyBane.type">
      <option value="bane">Bane (har linjer på kortet)</option>
      <option value="aktivitet">Aktivitet (ingen linjer, fx Bounce)</option>
    </select>

    <label for="ny-kortbane-svaerhed">Sværhedsgrad i kortfiltret</label>
    <select id="ny-kortbane-svaerhed" v-model="nyBane.svaerhed">
      <option v-for="s in SVAERHED_VALG" :key="s" :value="s">{{ s }}</option>
    </select>

    <label for="ny-kortbane-farve">Farve på kortet (hex-kode, fx #b8433f)</label>
    <div class="farve-raekke">
      <input
        id="ny-kortbane-farve"
        v-model="nyBane.farve"
        type="text"
        placeholder="#b8433f"
        class="farve-felt"
      />
      <!-- Viser farven, så snart koden er gyldig -->
      <span
        class="farve-prik farve-proeve"
        :style="{ background: rensFarve(nyBane.farve) ?? 'transparent' }"
        aria-hidden="true"
      ></span>
    </div>

    <div class="knapper">
      <BaseButton type="button" variant="primary" :disabled="opretter" @click="opretBane">
        {{ opretter ? 'Opretter...' : 'Opret bane' }}
      </BaseButton>
    </div>

    <p v-if="opretBesked" role="status">{{ opretBesked }}</p>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;

// Banefarverne fra $kort-bane-farver – samme som på kortet, så editoren viser de rigtige farver
.admin-liste {
  @each $id, $farve in c.$kort-bane-farver {
    --kort-bane-#{$id}: #{$farve};
  }
}

h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.farve-prik {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.hjaelp {
  margin-top: 1rem;
}

// Kortet fylder kortets bredde og bevarer formatet
.kort-editor {
  display: block;
  width: 100%;
  max-width: 40rem;
  height: auto;
  margin-top: 1rem;
  border-radius: 1rem;
  background-color: c.$forest_green25;
  // Så man kan trække med fingeren uden at siden scroller
  touch-action: none;
  user-select: none;
}

// De tre streger – samme tykkelser og farver som i kort-base.svg
.kant {
  fill: none;
  stroke: #f6edda;
  stroke-width: 15px;
  stroke-linecap: round;
}

.farve {
  fill: none;
  stroke-width: 10px;
  stroke-linecap: round;
}

.reb {
  fill: none;
  stroke: #7b6d4b;
  stroke-width: 1.3px;
}

.er-aktiv .farve {
  stroke-width: 16px;
}

.anden-linje {
  stroke: c.$primary_black100;
  stroke-width: 6px;
  stroke-linecap: round;
  opacity: 0.25;
}

.haandtag {
  fill: white;
  stroke: c.$primary_black100;
  stroke-width: 3px;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  &.er-aktiv {
    stroke: c.$secondary_purple100;
    stroke-width: 5px;
  }
}

// Under tegning er markøren et sigtekorn
.kort-editor.tegner {
  cursor: crosshair;
}

.linje {
  cursor: pointer;
}

.tegner .linje,
.tegner .haandtag {
  cursor: crosshair;
}

// Gør linjerne nemme at ramme uden at gøre dem tykkere
.klikflade {
  fill: none;
  stroke: transparent;
  stroke-width: 30px;
  stroke-linecap: round;
}

.forhaandsvisning {
  stroke-width: 8px;
  stroke-dasharray: 16 12;
  stroke-linecap: round;
  opacity: 0.8;
  pointer-events: none;
}

.tegn-start {
  fill: none;
  stroke: c.$secondary_purple100;
  stroke-width: 5px;
  pointer-events: none;
}

.editor-knapper {
  margin-top: 0.5rem;
}

// Hex-feltet med en prik ved siden af, der viser farven
.farve-raekke {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

// Feltet skal ikke være lige så bredt som tekstfelterne
.farve-felt {
  max-width: 10rem;
}

.farve-proeve {
  width: 2rem;
  height: 2rem;
  border: 2px solid c.$primary_black100;
}
</style>
