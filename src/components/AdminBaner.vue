<script setup>
// Fanen "Baner" i admin. Der er en formular pr. bane, hvor man retter teksterne og tallene,
// og "Gem bane" sender ændringerne til Firebase "baner"

import BaseButton from '@/components/BaseButton.vue'

import { ref, onMounted } from 'vue'

// Adressen på "baner" og hentToken, som beviser, at man er logget ind
import { BANER_URL, hentToken } from '@/services/api.js'

// Felterne i formularen – hver linje bliver til ét felt.
// key = feltet i Firebase, label = teksten over feltet, type = slags felt
const BANE_FIELDS = [
  { key: 'name', label: 'Navn', type: 'text' },
  { key: 'description', label: 'Beskrivelse', type: 'textarea' },
  { key: 'requirements', label: 'Krav', type: 'text' },
  { key: 'trackHeight', label: 'Banehøjde', type: 'text' },
  { key: 'obstacles', label: 'Forhindringer', type: 'text' },
  { key: 'longestGlide', label: 'Længste svæv', type: 'text' },
  { key: 'glideAmount', label: 'Antal svæv', type: 'text' },
  { key: 'trackLength', label: 'Banelængde', type: 'text' },
  { key: 'difficulty', label: 'Sværhedsgrad (fx 37.5%)', type: 'text' },
  { key: 'addOn', label: 'Tilkøb (fx 30 kr.) – tom = intet tilkøb', type: 'text' },
  { key: 'freeFall', label: 'Frit fald (fx 16 m) – tom = intet frit fald', type: 'text' },
  { key: 'altImg', label: 'Alt-tekst til billede', type: 'text' },
  { key: 'class', label: 'Layout', type: 'select', options: ['img-right', 'img-left'] }
]

const baner = ref([])

// En kopi af hver banes felter, som formularerne retter i.
// Intet ændres i Firebase, før man trykker "Gem bane"
const baneForms = ref({})

// Beskeden under hver bane, fx "Banen er gemt."
const baneBeskeder = ref({})

// Id på banen, der gemmes lige nu, så knappen kan vise "Gemmer..."
const gemmerId = ref('')

// true, mens banerne hentes
const indlaeser = ref(true)
// Fejlbesked, hvis banerne ikke kunne hentes
const fejlbesked = ref('')

// Henter alle baner. At læse kræver ikke login – kun at gemme
async function hentBaner() {
  try {
    const res = await fetch(`${BANER_URL}.json`)

    if (!res.ok) throw new Error(`Fejl ${res.status}`)

    const data = await res.json()

    // Laver Firebase-objektet om til en liste, hvor hver bane har sit id med
    baner.value = Object.entries(data ?? {}).map(([id, bane]) => ({ id, ...bane }))

    // Laver en udfyldt formular pr. bane
    baneForms.value = Object.fromEntries(baner.value.map((bane) => [bane.id, lavForm(bane)]))
  } catch (e) {
    fejlbesked.value = 'Banerne kunne ikke hentes.'
    console.error(e)

  } finally {
    indlaeser.value = false
  }
}

// Laver en formular med banens værdi i hvert felt (tomt, hvis det mangler).
// Billedet kommer også med, så et nyt billede først gemmes sammen med de andre felter
function lavForm(bane) {
  return {
    ...Object.fromEntries(BANE_FIELDS.map((f) => [f.key, bane[f.key] ?? ''])),
    svg: bane.svg ?? ''
  }
}

// Laver formularen om til det, der gemmes. Intet billede = null, så Firebase ikke får et tomt felt
function tilGem(form) {
  return { ...form, svg: form.svg || null }
}

// Fakta, der vises på kortet – kun dem, banen har udfyldt
function faktaFor(bane) {
  return BANE_FIELDS.filter(
    (f) => !['name', 'description', 'altImg', 'class'].includes(f.key) && bane[f.key]
  )
}

// ---------- Rediger bane ----------
// Id på banen, hvis formular er åben (null = ingen)
const redigererId = ref(null)

// "Rediger bane": åbner formularen for denne bane
function startRedigering(bane) {
  redigererId.value = bane.id
  baneBeskeder.value[bane.id] = ''
}

// "Annuller": lukker formularen og fjerner de rettelser, der ikke er gemt
function annullerRedigering(bane) {
  baneForms.value[bane.id] = lavForm(bane)
  billedBeskeder.value[bane.id] = ''
  redigererId.value = null
}

// "Gem bane": sender rettelserne til Firebase med beviset på login bag på adressen
async function gemBane(bane) {
  baneBeskeder.value[bane.id] = ''
  gemmerId.value = bane.id

  try {
    const token = await hentToken()
    const data = tilGem(baneForms.value[bane.id])

    // PATCH retter kun de felter, vi sender med
    const res = await fetch(
      `${BANER_URL}/${encodeURIComponent(bane.id)}.json?auth=${encodeURIComponent(token)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }
    )

    if (!res.ok) throw new Error(`Fejl ${res.status}`)

    // Kopierer de gemte værdier over i banen på siden, så fx overskriften viser det nye navn
    Object.assign(bane, data)

    baneBeskeder.value[bane.id] = 'Banen er gemt.'
    redigererId.value = null
  } catch (e) {
    baneBeskeder.value[bane.id] = 'Banen kunne ikke gemmes. Prøv igen.'
    console.error(e)
  } finally {
    gemmerId.value = ''
  }
}

// ---------- Banens billede (SVG) ---------- 
// Beskeden om billedet under hver bane
const billedBeskeder = ref({})

// Laver SVG-teksten om til en adresse, som et <img> kan vise
function billedeSrc(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

// Download: laver SVG-teksten om til en fil og får browseren til at hente den som fx bane-1.svg
function downloadBillede(bane) {
  const svg = baneForms.value[bane.id].svg
  const fil = new Blob([svg], { type: 'image/svg+xml' })
  const adresse = URL.createObjectURL(fil)

  const link = document.createElement('a')
  link.href = adresse
  link.download = `${bane.id}.svg`
  link.click()

  URL.revokeObjectURL(adresse)
}

// Upload: lægger den valgte SVG-fil i formularen. Den gemmes først, når man trykker "Gem bane"
async function uploadBillede(bane, event) {
  const fil = event.target.files[0]
  if (!fil) return

  const tekst = await fil.text()

  // Er det ikke en SVG-fil, vises en besked i stedet
  if (!tekst.includes('<svg')) {
    billedBeskeder.value[bane.id] = 'Filen er ikke en SVG. Vælg en .svg-fil.'
  } else {
    baneForms.value[bane.id].svg = tekst
    billedBeskeder.value[bane.id] = 'Nyt billede valgt. Tryk "Gem bane" for at gemme det.'
  }

  // Tømmer feltet, så man kan vælge den samme fil igen
  event.target.value = ''
}

// Henter banerne, når fanen vises
onMounted(hentBaner)
</script>

<template>
  <h2>Rediger baner</h2>

  <p v-if="indlaeser">Henter baner...</p>
  <p v-else-if="fejlbesked">{{ fejlbesked }}</p>
  <p v-else-if="baner.length === 0">Der er ingen baner endnu.</p>

  <div v-else class="admin-liste">
    <!-- Ét kort pr. bane med navn, beskrivelse og fakta – ligesom i quizzen -->
    <article v-for="(bane, indeks) in baner" :key="bane.id" class="admin-kort">
      <h3>{{ bane.name }}</h3>

      <p v-if="bane.description">{{ bane.description }}</p>

      <ul>
        <li v-for="field in faktaFor(bane)" :key="field.key">
          {{ field.label.split(' (')[0] }}: {{ bane[field.key] }}
        </li>
      </ul>

      <div class="knapper">
        <BaseButton type="button" variant="primary" @click="startRedigering(bane)">
          Rediger bane
        </BaseButton>
      </div>

      <!-- Skærmlæsere læser beskeden højt -->
      <p v-if="baneBeskeder[bane.id]" role="status">{{ baneBeskeder[bane.id] }}</p>

      <!-- Vises kun på den bane, der redigeres. @submit.prevent gemmer uden at genindlæse siden -->
      <form
        v-if="redigererId === bane.id"
        class="redigering felter"
        @submit.prevent="gemBane(bane)"
      >
        <h3>Rediger {{ bane.name }}</h3>

        <!-- Ét felt pr. linje i BANE_FIELDS. v-model forbinder feltet med banens kopi -->
        <div v-for="field in BANE_FIELDS" :key="field.key" class="felt">
          <label :for="'bane-' + indeks + '-' + field.key">{{ field.label }}</label>

          <!-- textarea = stort tekstfelt, select = dropdown, ellers et almindeligt tekstfelt -->
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

        <!-- Banens billede: se det, download det eller upload et nyt -->
        <div class="felt">
          <h4>Banens billede</h4>

          <!-- Viser formularens billede – også et nyt, der ikke er gemt endnu -->
          <img
            v-if="baneForms[bane.id].svg"
            :src="billedeSrc(baneForms[bane.id].svg)"
            :alt="baneForms[bane.id].altImg || 'Billede af ' + bane.name"
            class="bane-billede"
          />
          <p v-else>Banen har intet billede endnu.</p>

          <div class="knapper">
            <!-- type="button", så knappen ikke gemmer formularen -->
            <BaseButton
              v-if="baneForms[bane.id].svg"
              type="button"
              variant="secondary"
              @click="downloadBillede(bane)"
            >
              Download billede (.svg)
            </BaseButton>
          </div>

          <!-- Filvælgeren viser kun SVG-filer -->
          <label :for="'bane-' + indeks + '-upload'">Upload nyt billede (.svg)</label>
          <input
            :id="'bane-' + indeks + '-upload'"
            type="file"
            accept=".svg,image/svg+xml"
            @change="uploadBillede(bane, $event)"
          />
          <p v-if="billedBeskeder[bane.id]" role="status">{{ billedBeskeder[bane.id] }}</p>
        </div>

        <div class="knapper knapper--gem">
          <BaseButton type="button" variant="secondary" @click="annullerRedigering(bane)">Annuller</BaseButton>
          <BaseButton type="submit" variant="primary" :disabled="gemmerId !== ''">
            {{ gemmerId === bane.id ? 'Gemmer...' : 'Gem bane' }}
          </BaseButton>
        </div>
      </form>
    </article>
  </div>
</template>

