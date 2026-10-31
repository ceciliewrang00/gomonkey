<script setup>
// Rediger baner (infosiden). Vises i AdminView, når man er logget ind.
// Udseendet kommer fra de fælles styles i AdminView.vue

import BaseButton from '@/components/BaseButton.vue'
import { ref, onMounted, watch } from 'vue'
import { BANER_URL, hentToken } from '@/services/api.js'

// Felter i bane-formularen. Vil du kunne rette et nyt felt, så tilføj en linje her
const BANE_FIELDS = [
  { key: 'name', label: 'Navn', type: 'text' },
  { key: 'color', label: 'Farve', type: 'select', options: ['grøn', 'blå', 'rød', 'sort', 'brun'] },
  { key: 'number', label: 'Nummer (antal blade)', type: 'text' },
  { key: 'description', label: 'Beskrivelse', type: 'textarea' },
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

const baner = ref([])
const valgtBaneId = ref('')

// En kopi af den valgte bane. Man retter i kopien, til man trykker "Gem"
const baneForm = ref({})

const baneBesked = ref('')

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

// Kører hver gang man vælger en ny bane i dropdown
watch(valgtBaneId, (id) => {
  baneBesked.value = ''

  const bane = baner.value.find((b) => b.id === id)

  if (bane) {
    // Én værdi pr. felt i BANE_FIELDS. Mangler banen et felt, bliver det ''
    baneForm.value = Object.fromEntries(BANE_FIELDS.map((f) => [f.key, bane[f.key] ?? '']))
  }
})

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
        body: JSON.stringify(baneForm.value)
      }
    )

    if (!res.ok) throw new Error(`Fejl ${res.status}`)

    // Opdaterer listen på siden, så den passer med databasen
    const bane = baner.value.find((b) => b.id === valgtBaneId.value)
    Object.assign(bane, baneForm.value)

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
        <label :for="'bane-' + field.key">{{ field.label }}</label>

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

    <p v-if="baneBesked" role="status">{{ baneBesked }}</p>
  </section>
</template>