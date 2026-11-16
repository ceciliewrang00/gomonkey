<script setup>
// Administration af quizzen: spørgsmål og svar.
// Hvert svar har et "maksNiveau": den sværeste bane, svaret tillader
// (1 = Let, 2 = Mellem, 3 = Svær). Det laveste svar bestemmer anbefalingen (se quizLogik.js).
// Quizzen bruger ingen point.
// Vises i AdminView, når man er logget ind.
// Udseendet kommer fra de fælles styles i AdminView.vue

import BaseButton from '@/components/BaseButton.vue'
import { ref, onMounted } from 'vue'
import { auth } from '../firebase'
import { SPOERGSMAAL_URL, hentToken } from '@/services/api.js'

// Valgene i "Giver højst"-feltet ved hvert svar
const NIVEAU_VALG = [
  { vaerdi: 3, tekst: 'Svær (ingen begrænsning)' },
  { vaerdi: 2, tekst: 'Mellem' },
  { vaerdi: 1, tekst: 'Let' },
]

// Viser maksNiveau som ord i oversigten
function niveauTekst(n) {
  return { 1: 'Let', 2: 'Mellem', 3: 'Svær' }[n] ?? '–'
}

// ---------- Spørgsmål ----------

// Alle spørgsmål fra databasen, true mens de hentes, og en evt. fejlbesked
const spoergsmaal = ref([])
const indlaeser = ref(true)
const fejlbesked = ref('')

// Henter alle spørgsmål fra Firebase (GET, kræver ikke login).
// Kaldes også efter opret, rediger og slet, så listen altid passer med databasen
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

// Fjerner mellemrum omkring teksterne. Tomme barn- og gruppetekster fjernes helt,
// så quizzen bruger den almindelige tekst i stedet
function rydSvar(svar) {
  const ren = { ...svar, tekst: svar.tekst.trim() }
  for (const felt of ['tekstBarn', 'tekstGruppe']) {
    const vaerdi = (ren[felt] ?? '').trim()
    if (vaerdi) ren[felt] = vaerdi
    else delete ren[felt]
  }
  return ren
}

// ---------- Opret spørgsmål ----------

// Det nye spørgsmål, mens man skriver det i formularen
const nytSpoergsmaal = ref({
  tekst: '',
  // Starter med to svarmuligheder. Flere kan tilføjes
  svar: [
    { id: 's1', tekst: '', maksNiveau: 3 },
    { id: 's2', tekst: '', maksNiveau: 3 }
  ]
})

// true mens der gemmes (knapperne bliver grå), og beskeden efter gemning
const gemmer = ref(false)
const gemBesked = ref('')

// Tilføjer et tomt svar. crypto.randomUUID() laver et unikt id, så Vue kan holde svarene adskilt
function tilfoejSvarmulighed() {
  nytSpoergsmaal.value.svar.push({
    id: crypto.randomUUID(),
    tekst: '',
    maksNiveau: 3
  })
}

// Fjerner et svar ved at beholde alle de andre (filter)
function fjernSvarmulighed(svarId) {
  // Beholder mindst to svarmuligheder
  if (nytSpoergsmaal.value.svar.length <= 2) {
    return
  }

  nytSpoergsmaal.value.svar = nytSpoergsmaal.value.svar.filter((svar) => svar.id !== svarId)
}

// Gemmer det nye spørgsmål i Firebase.
// Først tjekkes login og at alt er udfyldt (return stopper funktionen tidligt)
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
      type: 'niveau',
      raekkefoelge: sidstePlacering + 1,
      svar: nytSpoergsmaal.value.svar.map(rydSvar)
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
        { id: 's1', tekst: '', maksNiveau: 3 },
        { id: 's2', tekst: '', maksNiveau: 3 }
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

// Åbner redigering af et spørgsmål.
// JSON.parse(JSON.stringify(...)) laver en helt ny kopi, også af listen med svar
function startRedigering(sp) {
  // Selvstændig kopi inkl. svarmuligheder, så oversigten ikke ændres før "Gem"
  redigerer.value = JSON.parse(JSON.stringify(sp))
  redigerBesked.value = ''
}

// Lukker redigeringen uden at gemme
function annullerRedigering() {
  redigerer.value = null
  redigerBesked.value = ''
}

// Gemmer det redigerede spørgsmål. Samme tjek som ved opret, og så PUT til databasen
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

  // Fjerner mellemrum omkring tekster og bevarer alle øvrige felter
  data.tekst = data.tekst.trim()
  data.svar = data.svar.map(rydSvar)

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

// Id på det spørgsmål, der slettes lige nu ('' = intet), og beskeden bagefter
const sletterId = ref('')
const sletBesked = ref('')

// Sletter et spørgsmål. Først tjekkes, at det ikke bruges af quizlogikken,
// og så spørges brugeren, om de er sikre (window.confirm)
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

// Henter alt, når komponenten vises
onMounted(() => {
  hentSpoergsmaal()
})
</script>

<template>
  <!-- Opret spørgsmål -->
  <section class="admin-kort">
    <h2>Opret spørgsmål</h2>

    <label for="nyt-spoergsmaal">Spørgsmålstekst</label>
    <input id="nyt-spoergsmaal" v-model="nytSpoergsmaal.tekst" type="text" required />

    <!-- Ét sæt felter pr. svarmulighed. indeks starter ved 0, derfor indeks + 1 -->
    <div v-for="(svar, indeks) in nytSpoergsmaal.svar" :key="svar.id">
      <label :for="'nyt-svar-' + svar.id">Svarmulighed {{ indeks + 1 }}</label>
      <input :id="'nyt-svar-' + svar.id" v-model="svar.tekst" type="text" required />

      <!-- Valgfri tekster, når man svarer for sit barn eller en gruppe (fx "Det tør mit barn ikke") -->
      <label :for="'nyt-svar-barn-' + svar.id">Tekst, når man svarer for sit barn (valgfri)</label>
      <input :id="'nyt-svar-barn-' + svar.id" v-model="svar.tekstBarn" type="text" />

      <label :for="'nyt-svar-gruppe-' + svar.id">Tekst, når man svarer for en gruppe (valgfri)</label>
      <input :id="'nyt-svar-gruppe-' + svar.id" v-model="svar.tekstGruppe" type="text" />

      <label :for="'nyt-niveau-' + svar.id">Giver højst</label>
      <select :id="'nyt-niveau-' + svar.id" v-model.number="svar.maksNiveau">
        <option v-for="v in NIVEAU_VALG" :key="v.vaerdi" :value="v.vaerdi">{{ v.tekst }}</option>
      </select>

      <!-- Vises kun, når der er mere end to svar -->
      <div v-if="nytSpoergsmaal.svar.length > 2" class="knapper">
        <BaseButton
          type="button"
          variant="secondary"
          :disabled="gemmer"
          @click="fjernSvarmulighed(svar.id)"
        >
          Fjern svarmulighed
        </BaseButton>
      </div>
    </div>

    <div class="knapper">
      <BaseButton type="button" variant="secondary" :disabled="gemmer" @click="tilfoejSvarmulighed">
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
  <!-- v-if / v-else-if / v-else: kun én af dem vises ad gangen -->
  <p v-if="indlaeser">Henter spørgsmål...</p>
  <p v-else-if="fejlbesked">{{ fejlbesked }}</p>
  <p v-else-if="spoergsmaal.length === 0">Der er ingen spørgsmål endnu.</p>

  <div v-else class="admin-liste">
    <!-- Ét kort pr. spørgsmål med tekst, type og svar -->
    <article v-for="sp in spoergsmaal" :key="sp.id" class="admin-kort">
      <h3>{{ sp.raekkefoelge }}. {{ sp.tekst }}</h3>

      <p>Type: {{ sp.type }}</p>

      <ul>
        <li v-for="svar in sp.svar" :key="svar.id">
          {{ svar.tekst }}<template v-if="svar.maksNiveau"> — giver højst {{ niveauTekst(svar.maksNiveau) }}</template>
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

          <!-- Valgfri tekster, når man svarer for sit barn eller en gruppe -->
          <label :for="'rediger-svar-barn-' + sp.id + '-' + svar.id">Tekst, når man svarer for sit barn (valgfri)</label>
          <input :id="'rediger-svar-barn-' + sp.id + '-' + svar.id" v-model="svar.tekstBarn" type="text" />

          <label :for="'rediger-svar-gruppe-' + sp.id + '-' + svar.id">Tekst, når man svarer for en gruppe (valgfri)</label>
          <input :id="'rediger-svar-gruppe-' + sp.id + '-' + svar.id" v-model="svar.tekstGruppe" type="text" />

          <!-- "Giver højst" kan kun rettes på spørgsmål, der styrer anbefalingen -->
          <div v-if="redigerer.type === 'niveau'">
            <label :for="'rediger-niveau-' + sp.id + '-' + svar.id">Giver højst</label>
            <select :id="'rediger-niveau-' + sp.id + '-' + svar.id" v-model.number="svar.maksNiveau">
              <option v-for="v in NIVEAU_VALG" :key="v.vaerdi" :value="v.vaerdi">{{ v.tekst }}</option>
            </select>
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

      <!-- Alle slet-knapper er grå, mens et spørgsmål slettes -->
      <div class="knapper">
        <BaseButton
          type="button"
          variant="secondary"
          :disabled="sletterId !== ''"
          @click="sletSpoergsmaal(sp)"
        >
          {{ sletterId === sp.id ? 'Sletter...' : 'Slet spørgsmål' }}
        </BaseButton>
      </div>
    </article>
  </div>
</template>