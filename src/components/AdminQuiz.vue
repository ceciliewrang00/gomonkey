<script setup>
// Administration af quizzen: pointgrænser, spørgsmål og svar.
// Vises i AdminView, når man er logget ind.
// Udseendet kommer fra de fælles styles i AdminView.vue

import BaseButton from '@/components/BaseButton.vue'
import { ref, onMounted } from 'vue'
import { auth } from '../firebase'
import { SPOERGSMAAL_URL, GRAENSER_URL, hentToken } from '@/services/api.js'

// ---------- Spørgsmål ----------

const spoergsmaal = ref([])
const indlaeser = ref(true)
const fejlbesked = ref('')

async function hentSpoergsmaal() {
  try {
    const response = await fetch(`${SPOERGSMAAL_URL}.json`)

    if (!response.ok) {
      throw new Error('Firebase svarede med status ' + response.status)
    }

    const data = await response.json()

    // Databaseobjektet bliver til en liste, sorteret efter rækkefølge
    const liste = Object.values(data ?? {})
    liste.sort((a, b) => (a.raekkefoelge ?? 0) - (b.raekkefoelge ?? 0))

    spoergsmaal.value = liste
  } catch (fejl) {
    fejlbesked.value = 'Spørgsmålene kunne ikke hentes.'
    console.error('Fejl ved hentning af spørgsmål:', fejl)
  } finally {
    indlaeser.value = false
  }
}

// ---------- Opret spørgsmål ----------

const nytSpoergsmaal = ref({
  tekst: '',
  // Starter med to svarmuligheder. Flere kan tilføjes
  svar: [
    { id: 's1', tekst: '', point: 0 },
    { id: 's2', tekst: '', point: 0 }
  ]
})

const gemmer = ref(false)
const gemBesked = ref('')

function tilfoejSvarmulighed() {
  nytSpoergsmaal.value.svar.push({
    id: crypto.randomUUID(),
    tekst: '',
    point: 0
  })
}

function fjernSvarmulighed(svarId) {
  // Beholder mindst to svarmuligheder
  if (nytSpoergsmaal.value.svar.length <= 2) {
    return
  }

  nytSpoergsmaal.value.svar = nytSpoergsmaal.value.svar.filter((svar) => svar.id !== svarId)
}

async function opretSpoergsmaal() {
  gemBesked.value = ''

  if (!auth.currentUser) {
    gemBesked.value = 'Du skal være logget ind.'
    return
  }

  // Spørgsmålet og alle svar skal have tekst
  if (
    !nytSpoergsmaal.value.tekst.trim() ||
    nytSpoergsmaal.value.svar.some((svar) => !svar.tekst.trim())
  ) {
    gemBesked.value = 'Udfyld spørgsmålet og alle svarmuligheder.'
    return
  }

  // Point skal være hele tal på mindst 0
  if (nytSpoergsmaal.value.svar.some((svar) => !Number.isInteger(svar.point) || svar.point < 0)) {
    gemBesked.value = 'Point skal være hele tal på mindst 0.'
    return
  }

  gemmer.value = true

  try {
    const token = await hentToken()

    // Unikt id til både databaseplaceringen og spørgsmålet
    const id = crypto.randomUUID()

    // Finder den højeste rækkefølge, så det nye spørgsmål kommer sidst
    const sidstePlacering = Math.max(0, ...spoergsmaal.value.map((sp) => Number(sp.raekkefoelge) || 0))

    const data = {
      id,
      tekst: nytSpoergsmaal.value.tekst.trim(),
      type: 'point',
      raekkefoelge: sidstePlacering + 1,
      svar: nytSpoergsmaal.value.svar.map((svar) => ({
        ...svar,
        tekst: svar.tekst.trim()
      }))
    }

    // PUT gemmer spørgsmålet på dets egen unikke placering
    const response = await fetch(`${SPOERGSMAAL_URL}/${id}.json?auth=${encodeURIComponent(token)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error('Gemning fejlede med status ' + response.status)
    }

    // Henter oversigten igen, så det nye spørgsmål bliver vist
    await hentSpoergsmaal()

    // Tømmer formularen
    nytSpoergsmaal.value = {
      tekst: '',
      svar: [
        { id: 's1', tekst: '', point: 0 },
        { id: 's2', tekst: '', point: 0 }
      ]
    }

    gemBesked.value = 'Spørgsmålet er gemt.'
  } catch (fejl) {
    gemBesked.value = 'Spørgsmålet kunne ikke gemmes. Kontrollér dit login.'
    console.error('Fejl ved oprettelse:', fejl)
  } finally {
    gemmer.value = false
  }
}

// ---------- Rediger spørgsmål ----------

// En kopi af det spørgsmål, der redigeres. null = intet er åbnet
const redigerer = ref(null)
const gemmerRedigering = ref(false)
const redigerBesked = ref('')

function startRedigering(sp) {
  // Selvstændig kopi inkl. svarmuligheder, så oversigten ikke ændres før "Gem"
  redigerer.value = JSON.parse(JSON.stringify(sp))
  redigerBesked.value = ''
}

function annullerRedigering() {
  redigerer.value = null
  redigerBesked.value = ''
}

async function gemRedigering() {
  redigerBesked.value = ''

  if (!redigerer.value || !auth.currentUser) {
    redigerBesked.value = 'Åbn et spørgsmål, og kontrollér dit login.'
    return
  }

  const data = JSON.parse(JSON.stringify(redigerer.value))

  if (!data.tekst.trim() || data.svar.some((svar) => !svar.tekst.trim())) {
    redigerBesked.value = 'Udfyld spørgsmålet og alle svarmuligheder.'
    return
  }

  if (data.svar.some((svar) => !Number.isInteger(svar.point) || svar.point < 0)) {
    redigerBesked.value = 'Point skal være hele tal på mindst 0.'
    return
  }

  // Fjerner mellemrum omkring tekster og bevarer alle øvrige felter
  data.tekst = data.tekst.trim()
  data.svar = data.svar.map((svar) => ({ ...svar, tekst: svar.tekst.trim() }))

  gemmerRedigering.value = true

  try {
    const token = await hentToken()

    // Erstatter det valgte spørgsmål med den redigerede kopi
    const response = await fetch(
      `${SPOERGSMAAL_URL}/${encodeURIComponent(data.id)}.json?auth=${encodeURIComponent(token)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }
    )

    if (!response.ok) {
      throw new Error('Redigering fejlede med status ' + response.status)
    }

    await hentSpoergsmaal()

    redigerer.value = null
    redigerBesked.value = 'Ændringerne er gemt.'
  } catch (fejl) {
    // Formularen bliver åben, så man ikke mister sine rettelser
    redigerBesked.value = 'Ændringerne kunne ikke gemmes.'
    console.error('Fejl ved redigering:', fejl)
  } finally {
    gemmerRedigering.value = false
  }
}

// ---------- Slet spørgsmål ----------

const sletterId = ref('')
const sletBesked = ref('')

async function sletSpoergsmaal(sp) {
  sletBesked.value = ''

  // Spørgsmål, som anbefalinger og betingelser afhænger af, må ikke slettes
  const fasteId = ['hoejde', 'erfaring', 'tryghed', 'fysik', 'oplevelse', 'fritfald', 'vaegt']

  if (fasteId.includes(sp.id)) {
    sletBesked.value = 'Dette spørgsmål bruges af quizlogikken og kan ikke slettes her.'
    return
  }

  // Undgår at slette et spørgsmål, som styrer andre spørgsmåls synlighed
  if (spoergsmaal.value.some((andet) => andet.visHvis?.spoergsmaalId === sp.id)) {
    sletBesked.value = 'Spørgsmålet bruges som betingelse for et andet spørgsmål.'
    return
  }

  if (!auth.currentUser) {
    sletBesked.value = 'Du skal være logget ind.'
    return
  }

  if (!window.confirm(`Vil du slette spørgsmålet: "${sp.tekst}"?`)) {
    return
  }

  sletterId.value = sp.id

  try {
    const token = await hentToken()

    const response = await fetch(
      `${SPOERGSMAAL_URL}/${encodeURIComponent(sp.id)}.json?auth=${encodeURIComponent(token)}`,
      { method: 'DELETE' }
    )

    if (!response.ok) {
      throw new Error('Sletning fejlede med status ' + response.status)
    }

    await hentSpoergsmaal()

    sletBesked.value = 'Spørgsmålet er slettet.'
  } catch (fejl) {
    sletBesked.value = 'Spørgsmålet kunne ikke slettes.'
    console.error('Fejl ved sletning:', fejl)
  } finally {
    sletterId.value = ''
  }
}

// ---------- Pointgrænser ----------

// Blå bane fra 5 point og rød bane fra 9 point er startværdier
const baneGraenser = ref({
  blaaFra: 5,
  roedFra: 9
})

const gemmerGraenser = ref(false)
const graenseBesked = ref('')

async function hentBaneGraenser() {
  try {
    const response = await fetch(`${GRAENSER_URL}.json`)

    if (!response.ok) {
      throw new Error('Hentning fejlede med status ' + response.status)
    }

    const data = await response.json()

    // Tjekker, at data indeholder gyldige pointgrænser
    if (
      !data ||
      !Number.isInteger(data.blaaFra) ||
      !Number.isInteger(data.roedFra) ||
      data.blaaFra < 1 ||
      data.roedFra <= data.blaaFra
    ) {
      throw new Error('Pointgrænserne mangler eller er ugyldige')
    }

    baneGraenser.value = data
  } catch (fejl) {
    graenseBesked.value = 'Pointgrænserne kunne ikke hentes. Felterne viser startværdierne 5 og 9.'
    console.error('Fejl ved hentning af pointgrænser:', fejl)
  }
}

async function gemBaneGraenser() {
  graenseBesked.value = ''

  const { blaaFra, roedFra } = baneGraenser.value

  // Hele tal, mindst 1 for blå og en højere grænse for rød
  if (
    !Number.isInteger(blaaFra) ||
    !Number.isInteger(roedFra) ||
    blaaFra < 1 ||
    roedFra <= blaaFra
  ) {
    graenseBesked.value = 'Brug hele tal. Blå skal være mindst 1, og rød skal være højere end blå.'
    return
  }

  if (!auth.currentUser) {
    graenseBesked.value = 'Du skal være logget ind.'
    return
  }

  gemmerGraenser.value = true

  try {
    const token = await hentToken()

    // PUT erstatter indholdet på denne placering
    const response = await fetch(`${GRAENSER_URL}.json?auth=${encodeURIComponent(token)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blaaFra, roedFra })
    })

    if (!response.ok) {
      throw new Error('Gemning fejlede med status ' + response.status)
    }

    graenseBesked.value = 'Pointgrænserne er gemt.'
  } catch (fejl) {
    graenseBesked.value = 'Pointgrænserne kunne ikke gemmes.'
    console.error('Fejl ved gemning af pointgrænser:', fejl)
  } finally {
    gemmerGraenser.value = false
  }
}

// Henter alt, når komponenten vises
onMounted(() => {
  hentSpoergsmaal()
  hentBaneGraenser()
})
</script>

<template>
  <!-- Pointgrænser -->
  <section class="admin-kort">
    <h2>Pointgrænser for baner</h2>

    <p>Pointgrænserne bruges sammen med krav til højde, erfaring og tryghed.</p>

    <label for="blaa-fra">Blå bane fra antal point</label>
    <input id="blaa-fra" v-model.number="baneGraenser.blaaFra" type="number" min="1" step="1" required />

    <label for="roed-fra">Rød bane fra antal point</label>
    <input id="roed-fra" v-model.number="baneGraenser.roedFra" type="number" min="2" step="1" required />

    <div class="knapper">
      <BaseButton type="button" variant="primary" :disabled="gemmerGraenser" @click="gemBaneGraenser">
        {{ gemmerGraenser ? 'Gemmer...' : 'Gem pointgrænser' }}
      </BaseButton>
    </div>

    <p v-if="graenseBesked" role="status">{{ graenseBesked }}</p>
  </section>

  <!-- Opret spørgsmål -->
  <section class="admin-kort">
    <h2>Opret spørgsmål</h2>

    <label for="nyt-spoergsmaal">Spørgsmålstekst</label>
    <input id="nyt-spoergsmaal" v-model="nytSpoergsmaal.tekst" type="text" required />

    <div v-for="(svar, indeks) in nytSpoergsmaal.svar" :key="svar.id">
      <label :for="'nyt-svar-' + svar.id">Svarmulighed {{ indeks + 1 }}</label>
      <input :id="'nyt-svar-' + svar.id" v-model="svar.tekst" type="text" required />

      <label :for="'nye-point-' + svar.id">Point</label>
      <input
        :id="'nye-point-' + svar.id"
        v-model.number="svar.point"
        type="number"
        min="0"
        step="1"
        required
      />

      <!-- Vises kun, når der er mere end to svar -->
      <div v-if="nytSpoergsmaal.svar.length > 2" class="knapper">
        <BaseButton
          type="button"
          variant="pink"
          :disabled="gemmer"
          @click="fjernSvarmulighed(svar.id)"
        >
          Fjern svarmulighed
        </BaseButton>
      </div>
    </div>

    <div class="knapper">
      <BaseButton type="button" variant="pink" :disabled="gemmer" @click="tilfoejSvarmulighed">
        Tilføj svarmulighed
      </BaseButton>
      <BaseButton type="button" variant="primary" :disabled="gemmer" @click="opretSpoergsmaal">
        {{ gemmer ? 'Gemmer...' : 'Gem spørgsmål' }}
      </BaseButton>
    </div>

    <p v-if="gemBesked" role="status">{{ gemBesked }}</p>
  </section>

  <!-- Beskeder om redigering og sletning vises her, også når formularen er lukket -->
  <p v-if="redigerBesked" role="status">{{ redigerBesked }}</p>
  <p v-if="sletBesked" role="status">{{ sletBesked }}</p>

  <!-- Liste med spørgsmål -->
  <p v-if="indlaeser">Henter spørgsmål...</p>
  <p v-else-if="fejlbesked">{{ fejlbesked }}</p>
  <p v-else-if="spoergsmaal.length === 0">Der er ingen spørgsmål endnu.</p>

  <div v-else class="admin-liste">
    <article v-for="sp in spoergsmaal" :key="sp.id" class="admin-kort">
      <h3>{{ sp.raekkefoelge }}. {{ sp.tekst }}</h3>

      <p>Type: {{ sp.type }}</p>

      <ul>
        <li v-for="svar in sp.svar" :key="svar.id">
          {{ svar.tekst }} — {{ svar.point }} point
        </li>
      </ul>

      <!-- Åbner en kopi af dette spørgsmål til redigering -->
      <div class="knapper">
        <BaseButton type="button" variant="primary" @click="startRedigering(sp)">
          Rediger spørgsmål
        </BaseButton>
      </div>

      <!-- Vises kun på det spørgsmål, der redigeres -->
      <section v-if="redigerer?.id === sp.id" class="redigering">
        <h3>Rediger spørgsmål</h3>

        <label :for="'rediger-tekst-' + sp.id">Spørgsmålstekst</label>
        <input :id="'rediger-tekst-' + sp.id" v-model="redigerer.tekst" type="text" required />

        <div v-for="(svar, indeks) in redigerer.svar" :key="svar.id">
          <label :for="'rediger-svar-' + sp.id + '-' + svar.id">
            Svarmulighed {{ indeks + 1 }}
          </label>
          <input
            :id="'rediger-svar-' + sp.id + '-' + svar.id"
            v-model="svar.tekst"
            type="text"
            required
          />

          <!-- Point kan kun rettes på almindelige pointspørgsmål -->
          <div v-if="redigerer.type === 'point'">
            <label :for="'rediger-point-' + sp.id + '-' + svar.id">Point</label>
            <input
              :id="'rediger-point-' + sp.id + '-' + svar.id"
              v-model.number="svar.point"
              type="number"
              min="0"
              step="1"
              required
            />
          </div>
        </div>

        <div class="knapper">
          <BaseButton type="button" variant="pink" @click="annullerRedigering">Annuller</BaseButton>
          <BaseButton
            type="button"
            variant="primary"
            :disabled="gemmerRedigering"
            @click="gemRedigering"
          >
            {{ gemmerRedigering ? 'Gemmer...' : 'Gem ændringer' }}
          </BaseButton>
        </div>
      </section>

      <div class="knapper">
        <BaseButton
          type="button"
          variant="pink"
          :disabled="sletterId !== ''"
          @click="sletSpoergsmaal(sp)"
        >
          {{ sletterId === sp.id ? 'Sletter...' : 'Slet spørgsmål' }}
        </BaseButton>
      </div>
    </article>
  </div>
</template>