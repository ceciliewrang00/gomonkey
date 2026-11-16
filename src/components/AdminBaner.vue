<script setup>
// Rediger baner (infosiden). Vises i AdminView, når man er logget ind.
// Udseendet kommer fra de fælles styles i AdminView.vue

import BaseButton from '@/components/BaseButton.vue'
import { ref, onMounted } from 'vue'
import { BANER_URL, hentToken } from '@/services/api.js'

// Felter i bane-formularen. Vil du kunne rette et nyt felt, så tilføj en linje her
const BANE_FIELDS = [
  { key: 'name', label: 'Navn', type: 'text' },
  { key: 'description', label: 'Beskrivelse', type: 'textarea' },
  // Teksten i banevælgerens resultat. Skal være neutral, så voksne ikke føler sig talt ned til.
  // Tom = quizzen bygger selv en tekst ud fra banens fakta. Gemmes som quizTekst { mig, barn, gruppe }
  { key: 'quizTekst.mig', label: 'Banevælger: tekst i resultatet', type: 'textarea' },
  { key: 'quizTekst.barn', label: 'Banevælger: tekst, når man svarer for sit barn (valgfri)', type: 'textarea' },
  { key: 'quizTekst.gruppe', label: 'Banevælger: tekst til grupper (valgfri)', type: 'textarea' },
  { key: 'requirements', label: 'Krav', type: 'text' },
  { key: 'trackHeight', label: 'Banehøjde', type: 'text' },
  { key: 'obstacles', label: 'Forhindringer', type: 'text' },
  { key: 'longestGlide', label: 'Længste svæv', type: 'text' },
  { key: 'glideAmount', label: 'Antal svæv', type: 'text' },
  { key: 'trackLength', label: 'Banelængde', type: 'text' },
  { key: 'difficulty', label: 'Sværhedsgrad (fx 37.5%)', type: 'text' },
  { key: 'altImg', label: 'Alt-tekst til billede', type: 'text' },
  { key: 'class', label: 'Layout', type: 'select', options: ['img-right', 'img-left'] }
]

// Alle baner fra databasen
const baner = ref([])

// Én kopi pr. bane, så alle formularer kan vises på én gang.
// Nøglen er banens id. Man retter i kopien, til man trykker "Gem"
const baneForms = ref({})

// Beskeder pr. bane, fx "Banen er gemt." (nøglen er banens id)
const baneBeskeder = ref({})

// Id på banen, der gemmes lige nu ('' = ingen)
const gemmerId = ref('')

// Vises, mens banerne hentes, eller hvis de ikke kunne hentes
const indlaeser = ref(true)
const fejlbesked = ref('')

// Henter alle baner fra Firebase (GET-kald, kræver ikke login)
async function hentBaner() {
  try {
    const res = await fetch(`${BANER_URL}.json`)

    // fetch melder ikke selv fejl ved fx 401 eller 404, så vi tjekker
    if (!res.ok) throw new Error(`Fejl ${res.status}`)

    const data = await res.json()

    // Firebase giver et objekt. Vi laver det til en liste med navnet som id
    baner.value = Object.entries(data ?? {}).map(([id, bane]) => ({ id, ...bane }))

    // Fylder en formular ud pr. bane. Mangler banen et felt, bliver det ''
    baneForms.value = Object.fromEntries(
      baner.value.map((bane) => [
        bane.id,
        Object.fromEntries(BANE_FIELDS.map((f) => [f.key, hentFelt(bane, f.key)]))
      ])
    )
  } catch (e) {
    fejlbesked.value = 'Banerne kunne ikke hentes.'
    console.error(e)
  } finally {
    indlaeser.value = false
  }
}

// Læser et felt fra banen. "quizTekst.barn" betyder feltet barn inde i quizTekst.
// quizTekst kan også være en almindelig tekst – så hører den til "mig"
function hentFelt(bane, key) {
  if (!key.startsWith('quizTekst.')) return bane[key] ?? ''
  const del = key.split('.')[1]
  const qt = bane.quizTekst
  if (typeof qt === 'string') return del === 'mig' ? qt : ''
  return qt?.[del] ?? ''
}

// Laver formularen om til det, der gemmes: de tre quizTekst-felter samles i ét
// objekt { mig, barn, gruppe }. Tomme felter udelades, og er alle tomme, slettes quizTekst (null)
function tilGem(form) {
  const data = {}
  const quizTekst = {}
  for (const [key, vaerdi] of Object.entries(form)) {
    if (key.startsWith('quizTekst.')) {
      const tekst = String(vaerdi ?? '').trim()
      if (tekst) quizTekst[key.split('.')[1]] = tekst
    } else {
      data[key] = vaerdi
    }
  }
  data.quizTekst = Object.keys(quizTekst).length ? quizTekst : null
  return data
}

// Gemmer rettelserne i Firebase. Kræver login.
// Tokenet (loginbeviset) sendes med i adressen (?auth=...), så databasen ved,
// at det er en admin. encodeURIComponent gør teksten sikker at bruge i en adresse
async function gemBane(bane) {
  baneBeskeder.value[bane.id] = ''
  gemmerId.value = bane.id

  try {
    const token = await hentToken()
    const data = tilGem(baneForms.value[bane.id])

    // PATCH ændrer kun de felter, vi sender. PUT ville slette resten
    const res = await fetch(
      `${BANER_URL}/${encodeURIComponent(bane.id)}.json?auth=${encodeURIComponent(token)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }
    )

    if (!res.ok) throw new Error(`Fejl ${res.status}`)

    // Opdaterer listen på siden, så den passer med databasen (fx navnet i overskriften)
    Object.assign(bane, data)

    baneBeskeder.value[bane.id] = 'Banen er gemt.'
  } catch (e) {
    baneBeskeder.value[bane.id] = 'Banen kunne ikke gemmes. Prøv igen.'
    console.error(e)
  } finally {
    gemmerId.value = ''
  }
}

// Henter banerne, når komponenten vises
onMounted(hentBaner)
</script>

<template>
  <h2>Rediger baner</h2>

  <!-- v-if / v-else-if / v-else: kun én af dem vises ad gangen -->
  <p v-if="indlaeser">Henter baner...</p>
  <p v-else-if="fejlbesked">{{ fejlbesked }}</p>
  <p v-else-if="baner.length === 0">Der er ingen baner endnu.</p>

  <div v-else class="admin-liste">
    <!-- Ét kort pr. bane, med formularen åben fra starten -->
    <form
      v-for="(bane, indeks) in baner"
      :key="bane.id"
      class="admin-kort felter"
      @submit.prevent="gemBane(bane)"
    >
      <h3>{{ bane.name }}</h3>

      <!-- Ét felt pr. post i BANE_FIELDS -->
      <div v-for="field in BANE_FIELDS" :key="field.key" class="felt">
        <!-- :for og :id hænger sammen, så et klik på teksten går til feltet.
             indeks gør id'et unikt, fordi der er en formular pr. bane -->
        <label :for="'bane-' + indeks + '-' + field.key">{{ field.label }}</label>

        <!-- Feltets type bestemmer, hvad der vises:
             textarea = stort tekstfelt, select = dropdown, ellers et almindeligt tekstfelt -->
        <textarea
          v-if="field.type === 'textarea'"
          :id="'bane-' + indeks + '-' + field.key"
          v-model="baneForms[bane.id][field.key]"
          rows="5"
        ></textarea>

        <select
          v-else-if="field.type === 'select'"
          :id="'bane-' + indeks + '-' + field.key"
          v-model="baneForms[bane.id][field.key]"
        >
          <option value="">(ingen)</option>
          <option v-for="option in field.options" :key="option" :value="option">
            {{ option }}
          </option>
        </select>

        <input
          v-else
          :id="'bane-' + indeks + '-' + field.key"
          v-model="baneForms[bane.id][field.key]"
          type="text"
        />
      </div>

      <div class="knapper">
        <BaseButton type="submit" variant="primary" :disabled="gemmerId !== ''">
          {{ gemmerId === bane.id ? 'Gemmer...' : 'Gem bane' }}
        </BaseButton>
      </div>

      <!-- role="status" gør, at skærmlæsere læser beskeden højt -->
      <p v-if="baneBeskeder[bane.id]" role="status">{{ baneBeskeder[bane.id] }}</p>
    </form>
  </div>
</template>
