<script setup>
// Rediger baner (infosiden). Vises i AdminView, når man er logget ind.
// Udseendet kommer fra de fælles styles i AdminView.vue

import BaseButton from '@/components/BaseButton.vue'
import { ref, onMounted, watch } from 'vue'
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

// Id på banen, der er valgt i dropdown ('' = ingen)
const valgtBaneId = ref('')

// En kopi af den valgte bane. Man retter i kopien, til man trykker "Gem"
const baneForm = ref({})

// Besked til brugeren, fx "Banen er gemt."
const baneBesked = ref('')

// Henter alle baner fra Firebase (GET-kald, kræver ikke login)
async function hentBaner() {
  try {
    const res = await fetch(`${BANER_URL}.json`)

    // fetch melder ikke selv fejl ved fx 401 eller 404, så vi tjekker
    if (!res.ok) throw new Error(`Fejl ${res.status}`)

    const data = await res.json()

    // Firebase giver et objekt. Vi laver det til en liste med navnet som id
    baner.value = Object.entries(data ?? {}).map(([id, bane]) => ({ id, ...bane }))
  } catch (e) {
    baneBesked.value = 'Banerne kunne ikke hentes.'
    console.error(e)
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

// Kører hver gang man vælger en ny bane i dropdown
watch(valgtBaneId, (id) => {
  baneBesked.value = ''

  const bane = baner.value.find((b) => b.id === id)

  if (bane) {
    // Én værdi pr. felt i BANE_FIELDS. Mangler banen et felt, bliver det ''
    baneForm.value = Object.fromEntries(BANE_FIELDS.map((f) => [f.key, hentFelt(bane, f.key)]))
  }
})

// Gemmer rettelserne i Firebase. Kræver login.
// Tokenet (loginbeviset) sendes med i adressen (?auth=...), så databasen ved,
// at det er en admin. encodeURIComponent gør teksten sikker at bruge i en adresse
async function gemBane() {
  baneBesked.value = ''

  try {
    const token = await hentToken()

    // PATCH ændrer kun de felter, vi sender. PUT ville slette resten
    const res = await fetch(
      `${BANER_URL}/${encodeURIComponent(valgtBaneId.value)}.json?auth=${encodeURIComponent(token)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tilGem(baneForm.value))
      }
    )

    if (!res.ok) throw new Error(`Fejl ${res.status}`)

    // Opdaterer listen på siden, så den passer med databasen
    const bane = baner.value.find((b) => b.id === valgtBaneId.value)
    Object.assign(bane, tilGem(baneForm.value))

    baneBesked.value = 'Banen er gemt.'
  } catch (e) {
    baneBesked.value = 'Banen kunne ikke gemmes. Prøv igen.'
    console.error(e)
  }
}

// Henter banerne, når komponenten vises
onMounted(hentBaner)
</script>

<template>
  <section class="admin-kort">
    <h2>Rediger baner</h2>

    <!-- Dropdown med alle baner. v-model gemmer den valgte banes id i valgtBaneId,
         og så fylder watch i scriptet formularen ud -->
    <label for="bane">Vælg bane</label>
    <select id="bane" v-model="valgtBaneId">
      <option value="" disabled>Vælg...</option>
      <option v-for="bane in baner" :key="bane.id" :value="bane.id">
        {{ bane.name }}
      </option>
    </select>

    <!-- Redigeringsformular. Vises først, når en bane er valgt -->
    <form v-if="valgtBaneId" class="felter" @submit.prevent="gemBane">
      <!-- Ét felt pr. post i BANE_FIELDS -->
      <div v-for="field in BANE_FIELDS" :key="field.key" class="felt">
        <!-- :for og :id hænger sammen, så et klik på teksten går til feltet -->
        <label :for="'bane-' + field.key">{{ field.label }}</label>

        <!-- Feltets type bestemmer, hvad der vises:
             textarea = stort tekstfelt, select = dropdown, ellers et almindeligt tekstfelt -->
        <textarea
          v-if="field.type === 'textarea'"
          :id="'bane-' + field.key"
          v-model="baneForm[field.key]"
          rows="5"
        ></textarea>

        <select
          v-else-if="field.type === 'select'"
          :id="'bane-' + field.key"
          v-model="baneForm[field.key]"
        >
          <option value="">(ingen)</option>
          <option v-for="option in field.options" :key="option" :value="option">
            {{ option }}
          </option>
        </select>

        <input v-else :id="'bane-' + field.key" v-model="baneForm[field.key]" type="text" />
      </div>

      <div class="knapper">
        <BaseButton type="submit" variant="primary">Gem bane</BaseButton>
      </div>
    </form>

    <!-- role="status" gør, at skærmlæsere læser beskeden højt -->
    <p v-if="baneBesked" role="status">{{ baneBesked }}</p>
  </section>
</template>