<script setup>
// Denne del er primært lavet af Claude 

// Hent vores egen knap
import BaseButton from '@/components/BaseButton.vue'

// Henter værktøjer fra Vue
import { ref, computed, onMounted, onUnmounted } from 'vue'

// Adresserne i Firebase + hentToken, som beviser, at vi er logget ind
import { KORTBANER_URL, KORTFILTER_URL, hentToken } from '@/services/api.js'

// Henter banerne (med navne) fra Firebase "baner"
import { hentBaner } from '@/services/baner.js'

// Henter banernes linjer fra Firebase "kortbaner"
import { hentKortbanerFraFirebase } from '@/services/kortApi.js'

// Laver to punkter om til de tre streger, en bane tegnes med (kant, farve, reb)
import { lavStier } from '@/utils/kortStier.js'


// Kort-tegningens størrelse i dens egne enheder (fra public/kort-base.svg).
// Uden den bliver linjerne placeret forkert
const KORT_BREDDE = 1683.78
const KORT_HOEJDE = 1810.98


// Slipper man et punkt tæt på et andet, sætter det sig oven i det, så linjerne hænger sammen.
// 15 er i kortets enheder, ikke pixels
const SNAP_AFSTAND = 15

// Valgmulighederne i dropdown'en "Sværhedsgrad i kortfiltret"
const SVAERHED_VALG = ['For alle', 'Let', 'Mellem', 'Svær']

// ---------- Værdier, som siden viser ----------

// Alle baner på kortet. Hver linje har et startpunkt og et slutpunkt
const kortbaner = ref([])

// Teksterne fra kortfiltret, i Firebase ligger de som en nummereret liste
const filterPoster = ref([])

// Banerne fra Firebase "baner" – kun til at vise banens rigtige navn
const faellesBaner = ref([])

// true, mens data hentes
const indlaeser = ref(true)
// Fejlbesked, hvis data ikke kunne hentes
const fejlbesked = ref('')
// Besked, fx "Banen er gemt."
const besked = ref('')

// Den bane, man er ved at rette lige nu (null = man retter ikke noget).
const redigerer = ref(null)

// true, mens der gemmes (så knappen viser "Gemmer..." og ikke kan trykkes igen)
const gemmerRedigering = ref(false)

// Id på banen, der er ved at blive slettet, så knappen kan vise "Sletter..."
const sletterId = ref('')

// ---------- Hent data ----------

// Henter alt fra de tre steder i Firebase, når siden åbnes
async function hentAlt() {
  indlaeser.value = true
  fejlbesked.value = ''

  try {
    // Henter alle tre på samme tid. Fejler "baner", bruges en tom liste, så siden stadig virker
    const [geometri, filterSvar, baner] = await Promise.all([
      hentKortbanerFraFirebase(),
      fetch(`${KORTFILTER_URL}.json`).then((r) => {
        if (!r.ok) throw new Error(`Fejl ${r.status}`)
        return r.json()
      }),
      hentBaner().catch(() => [])
    ])

    faellesBaner.value = baner

    // Rydder op i hver bane fra "kortbaner" med tilRedigerbar
    kortbaner.value = geometri.map(tilRedigerbar)

    // Gemmer kortfiltrets tekster sammen med hver posts nummer i Firebase-listen
    filterPoster.value = Object.entries(filterSvar ?? {})
      .filter(([, post]) => post)
      .map(([indeks, post]) => ({ indeks, ...post }))

  // Gik noget galt, vises en fejlbesked, og fejlen skrives i konsollen
  } catch (e) {
    fejlbesked.value = 'Kortets data kunne ikke hentes.'
    console.error(e)

  // Fjerner "Henter kortet...", uanset om det gik godt
  } finally {
    indlaeser.value = false
  }
}

// Rydder op i en bane fra Firebase, så den kan rettes i editoren
function tilRedigerbar(bane) {
  // Banens linjer som en liste (tom, hvis banen ingen linjer har, fx Bounce)
  const segmenter = Object.values(bane.segmenter ?? {}).map((seg) => ({
    // Linjens faste plads i kort-base.svg. Nye linjer fra admin har ingen
    slot: seg.slot ?? null,
    // Nye kopier af punkterne, så de originale data ikke ændres, når man trækker
    punkter: seg.punkter.map(([x, y]) => [x, y])
  }))

  // Den færdige bane med tomme værdier, hvis et felt mangler
  return {
    id: bane.id,
    type: bane.type ?? 'bane',
    navn: bane.navn ?? '',
    farve: bane.farve ?? '',
    segmenter
  }
}

// ---------- Små hjælpe-funktioner ----------

// Finder banen med dette id i "baner"
function faellesFor(id) {
  return faellesBaner.value.find((b) => b.id === id)
}

// Finder kortfilter-teksterne for banen med dette id
function filterFor(id) {
  return filterPoster.value.find((p) => p.id === id)
}

// Finder banens navn – det ligger forskellige steder for faste og nye baner.
// Findes intet navn, vises id'et

function navnFor(bane) {
  return faellesFor(bane.id)?.name || bane.navn || filterFor(bane.id)?.titel || bane.id
}

// Banens farve. Faste baner har farven i _colors.scss, nye baner deres egen
function farveFor(bane) {
  return `var(--kort-bane-${bane.id}, ${bane.farve || '#CED0C0'})`
}

// Alle de andre baners linjer, så de kan vises svagt i editoren
const andreLinjer = computed(() =>
  kortbaner.value
    .filter((b) => b.id !== redigerer.value?.id)
    .flatMap((b) => b.segmenter.map((seg, i) => ({ noegle: `${b.id}-${i}`, punkter: seg.punkter })))
)

// Navne-skiltene oven på de gamle navne i kort-base.svg, så editoren ligner det rigtige kort.
// x og y = midten af skiltet
const SKILTE = [
  { id: 'bane-1', x: 1608.74, y: 1481.98 },
  { id: 'bane-2', x: 1551.66, y: 1348.32 },
  { id: 'bane-3', x: 1466.39, y: 1511.55 },
  { id: 'bane-4', x: 1142.5, y: 1606.91 },
  { id: 'bane-6', x: 623.98, y: 1633.38 },
  { id: 'bane-7', x: 803.05, y: 1282.63 },
  { id: 'bounce', x: 1308.46, y: 1232.49 },
  { id: 'bane-5', x: 1040.11, y: 1446.57 }
]

// Skiltene med navn og en bredde, der passer til navnet (mindst 120, så det gamle skilt dækkes)
const skilte = computed(() =>
  SKILTE.map((s) => {
    const navn = navnFor({ id: s.id })
    return { ...s, navn, bredde: Math.max(120, navn.length * 17 + 36) }
  })
)

// ---------- Rediger en bane ----------

// "Rediger bane": laver en kopi af banen, som man kan rette i
function startRedigering(bane) {
  const post = filterFor(bane.id)
  besked.value = ''
  redigerer.value = {
    ...tilRedigerbar(bane),
    navn: bane.navn || post?.titel || '',
    undertekst: post?.undertekst ?? '',
    svaerhed: post?.svaerhed ?? 'Let',
    farve: bane.farve || '#CED0C0',
    
    // true for faste baner, som ikke viser alle felterne
    harFaelles: Boolean(faellesFor(bane.id))
  }
  aktivLinje.value = null  // ingen linje er valgt endnu
  stopTegning()  // stopper tegning, hvis man var i gang
}

// "Annuller": smider kopien væk – intet er ændret
function annullerRedigering() {
  redigerer.value = null 
  besked.value = ''
  stopTegning()
}

// ---------- Kort-editoren ----------

const editorSvg = ref(null)

// Nummeret på den valgte linje (null = ingen)
const aktivLinje = ref(null)

// Oversætter musens position på skærmen til en position på kortet
function tilKort(event) {
  const svg = [editorSvg.value].flat()[0]
  const pt = svg.createSVGPoint()
  pt.x = event.clientX
  pt.y = event.clientY
  // Omregner fra skærmens koordinater til kortets koordinater
  const p = pt.matrixTransform(svg.getScreenCTM().inverse())
  // Holder punktet inden for kortet
  return [Math.min(Math.max(p.x, 0), KORT_BREDDE), Math.min(Math.max(p.y, 0), KORT_HOEJDE)]
}

// Ligger punkt a og b (næsten) samme sted? Giver true eller false.
// Math.hypot regner afstanden mellem dem ud (Pythagoras)
function sammePunkt(a, b, afstand = 0.5) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) <= afstand
}

// Alle punkter på kortet – fra alle baner – som magneten kan sætte et punkt fast i
function allePunkter() {
  return [
    ...kortbaner.value.filter((b) => b.id !== redigerer.value.id).flatMap((b) => b.segmenter),
    ...redigerer.value.segmenter
  ].flatMap((seg) => seg.punkter)
}

// Magneten: ligger der et andet punkt tæt på, bruges det i stedet. Ellers rundes punktet af.
// undtagen = punkter, der ikke tæller, fx det punkt, man selv trækker i
function fastgoer(punkt, undtagen = []) {
  const naer = allePunkter().find((p) => !undtagen.includes(p) && sammePunkt(p, punkt, SNAP_AFSTAND))
  return naer ? [naer[0], naer[1]] : [Math.round(punkt[0] * 100) / 100, Math.round(punkt[1] * 100) / 100]
}

// "Fjern valgt linje": tager linjen ud af listen
function fjernAktivLinje() {
  redigerer.value.segmenter.splice(aktivLinje.value, 1)
  aktivLinje.value = null
}

// ---------- Tegn nye linjer ----------
// Første klik er startpunktet, og hvert klik derefter laver en linje fra det forrige punkt

// true, mens man tegner
const tegner = ref(false)

// Punktet, den næste linje starter i (null = intet klik endnu)
const tegnStart = ref(null)

// Hvor musen er – til den stiplede linje, der viser næste linje
const musPunkt = ref(null)

function startTegning() {
  tegner.value = true
  tegnStart.value = null
  aktivLinje.value = null
}

// "Færdig" (eller Esc): stopper med at tegne
function stopTegning() {
  tegner.value = false
  tegnStart.value = null
  musPunkt.value = null
}

// "Start et nyt sted": næste klik bliver et nyt startpunkt, fx hvis banen deler sig
function nyStart() {
  tegnStart.value = null
}

// Kører ved hvert klik på kortet, men gør kun noget, mens man tegner
function klikPaaKort(event) {
  if (!tegner.value) return

  // Hvor på kortet der blev klikket (sat fast i et punkt i nærheden)
  const punkt = fastgoer(tilKort(event))

  // Laver en linje fra startpunktet til klikket – men ikke, hvis man klikker samme sted to gange
  if (tegnStart.value && !sammePunkt(tegnStart.value, punkt)) {
    redigerer.value.segmenter.push({ slot: null, punkter: [tegnStart.value, punkt] })
  }
  // Næste linje starter, hvor denne sluttede
  tegnStart.value = [punkt[0], punkt[1]]
}

// "Fortryd sidste linje": fjerner den sidste linje.
// Tegner man, fortsætter man fra hvor den fjernede linje startede
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
// Når man ikke tegner, kan man flytte banen ved at trække i de hvide prikker

// De punkter, man trækker i. Hvor to linjer mødes, ligger to punkter oven i hinanden,
// og de skal flytte sig sammen
let trukne = []

// Man trykker på en prik. ende = 0 (start) eller 1 (slut)
function grib(linje, ende, event) {
  // Mens man tegner, tæller et klik på en prik som et klik på kortet
  if (tegner.value) return
  event.preventDefault()

  const greb = redigerer.value.segmenter[linje].punkter[ende]
  // Samler alle punkter, der ligger samme sted som det, man greb
  trukne = redigerer.value.segmenter.flatMap((seg) => seg.punkter.filter((p) => sammePunkt(p, greb)))
  aktivLinje.value = linje
  // Prikken bliver ved med at følge musen, selv hvis man trækker hurtigt
  event.target.setPointerCapture(event.pointerId)
}

// Musen bevæger sig: mens man tegner, huskes musens position,
// og mens man trækker, flyttes prikkerne hen til musen
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

// Man giver slip. Er der et punkt tæt på, sætter prikken sig fast i det
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

// Laver banen klar til Firebase "kortbaner". Vi gemmer kun punkterne –
// stregerne regner kortet selv ud
function kortbaneTilGem(r) {
  const data = {
    id: r.id,
    type: r.type,
    // slot kommer kun med, hvis linjen har en
    segmenter: r.segmenter.map((seg) => ({
      ...(seg.slot ? { slot: seg.slot } : {}),
      punkter: seg.punkter.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100])
    }))
  }
  // Navn og farve gemmes kun for nye baner
  if (!r.harFaelles) {
    data.navn = r.navn.trim()
    data.farve = r.farve
  }
  return data
}

// Sender data til Firebase med beviset på login.
// PUT erstatter det hele, PATCH retter kun de felter, vi sender med
async function skrivFirebase(url, metode, data) {
  const token = await hentToken()
  const res = await fetch(`${url}.json?auth=${encodeURIComponent(token)}`, {
    method: metode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(`Fejl ${res.status}`)
}

// Gemmer banens tekster i kortfiltret. Findes banen, rettes den på sin plads.
// Har banen ingen tekster endnu, lægges de sidst i listen
async function gemFilter(id, felter) {
  const post = filterFor(id)
  if (post) {
    await skrivFirebase(`${KORTFILTER_URL}/${post.indeks}`, 'PATCH', felter)
    Object.assign(post, felter)
  } else {
    // Nummeret efter det højeste i listen
    const indeks = String(Math.max(-1, ...filterPoster.value.map((p) => Number(p.indeks))) + 1)
    await skrivFirebase(`${KORTFILTER_URL}/${indeks}`, 'PUT', { id, ...felter })
    filterPoster.value.push({ indeks, id, ...felter })
  }
}

// Tjekker, om man har skrevet en gyldig farvekode, fx "#b8433f" eller "#b43".
// Mangler #, sættes den på. Giver koden med små bogstaver, eller null hvis den er forkert
function rensFarve(tekst) {
  const kode = String(tekst ?? '').trim()
  const medHaven = kode.startsWith('#') ? kode : '#' + kode
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(medHaven) ? medHaven.toLowerCase() : null
}

// Fejlbeskeden ved en forkert farve
const FARVE_FEJL = 'Skriv farven som en hex-kode, fx #b8433f.'

// "Gem ændringer": tjekker formularen og gemmer banen i Firebase
async function gemRedigering() {
  const r = redigerer.value
  besked.value = ''

  // Nye baner skal have et navn og en gyldig farve
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

    // 1) Gemmer linjerne. PUT erstatter hele banen, så en fjernet linje også forsvinder i Firebase
    await skrivFirebase(`${KORTBANER_URL}/${encodeURIComponent(r.id)}`, 'PUT', data)

    // 2) Gemmer teksterne i kortfiltret. Titel og sværhedsgrad kun for nye baner
    const filterFelter = { undertekst: r.undertekst.trim() }
    if (!r.harFaelles) {
      filterFelter.titel = r.navn.trim()
      filterFelter.svaerhed = r.svaerhed
    }
    await gemFilter(r.id, filterFelter)

    // 3) Opdaterer banen på siden uden at hente alt igen
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

// "Slet bane": fjerner banen fra kortet og kortfiltret.
// En fast bane bliver liggende under fanen "Baner"
async function sletBane(bane) {
  besked.value = ''

  // Spørger først, om man er sikker. Trykker man Annuller, stopper vi
  const navn = navnFor(bane)
  const advarsel = faellesFor(bane.id)
    ? `Vil du slette "${navn}" fra kortet og kortfiltret?\n\nTeksterne under fanen "Baner" bliver liggende.`
    : `Vil du slette "${navn}" fra kortet og kortfiltret?`
  if (!window.confirm(advarsel)) return

  sletterId.value = bane.id
  try {
    // Sletter det, der ligger på en adresse i Firebase
    const token = await hentToken()
    const slet = async (url) => {
      const res = await fetch(`${url}.json?auth=${encodeURIComponent(token)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Fejl ${res.status}`)
    }

    // 1) Sletter banens linjer
    await slet(`${KORTBANER_URL}/${encodeURIComponent(bane.id)}`)

    // 2) Sletter banens tekster i kortfiltret. Pladsen bliver tom, og de andre beholder deres numre
    const post = filterFor(bane.id)
    if (post) {
      await slet(`${KORTFILTER_URL}/${post.indeks}`)
      filterPoster.value = filterPoster.value.filter((p) => p !== post)
    }

    // 3) Fjerner banen fra siden og lukker redigeringen, hvis den var åben
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

// Når fanen åbnes: hent data, og lyt efter Esc-tasten
onMounted(() => {
  hentAlt()
  window.addEventListener('keydown', tastatur)
})

// Når fanen lukkes: stop med at lytte efter tasten
onUnmounted(() => {
  window.removeEventListener('keydown', tastatur)
})
</script>

<template>
  <h2>Rediger kort og kortfilter</h2>

  <p v-if="besked" role="status">{{ besked }}</p>

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

            <!-- Navne-skilte i banens farve – som på det interaktive kort -->
            <g v-for="s in skilte" :key="'skilt-' + s.id" class="skilt">
              <rect
                :x="s.x - s.bredde / 2"
                :y="s.y - 26"
                :width="s.bredde"
                height="52"
                rx="26"
                :style="{ fill: `var(--kort-bane-${s.id})` }"
              />
              <text :x="s.x" :y="s.y">{{ s.navn }}</text>
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

// Klik på skiltene går igennem til kortet
.skilt {
  pointer-events: none;

  text {
    font-family: 'Montserrat', sans-serif;
    font-size: 26px;
    font-weight: 800;
    fill: c.$primary_light25;
    text-anchor: middle;
    dominant-baseline: central;
  }
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
