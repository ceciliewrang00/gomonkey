<script setup>
// ADMIN: FANEN "BANER"
// Her retter man teksterne og tallene om hver bane (Firebase "baner").
// Det, man gemmer her, vises på forsidens banekort, i popup'en på kortet og i quizzen.
// Filen vises i AdminView.vue under fanen "Baner". Udseendet kommer fra AdminView.vue.
//
// Sådan virker det:
// 1. Alle baner hentes, og der laves en formular pr. bane med banens nuværende tekster
// 2. Man retter i formularen (det er en kopi – intet gemmes endnu)
// 3. "Gem bane" sender ændringerne til Firebase
//
// Banens billede er en SVG, som ligger i Firebase som tekst i feltet "svg".
// Man kan se billedet, downloade det som en .svg-fil og uploade en ny (se "Banens billede" længere nede)

import BaseButton from '@/components/BaseButton.vue'
import { ref, onMounted } from 'vue'

// Adressen på "baner" i Firebase + hentToken, som giver beviset på, at man er logget ind
import { BANER_URL, hentToken } from '@/services/api.js'

// Felterne i formularen. Hver linje bliver til ét felt på siden:
//   key   = feltets navn i Firebase
//   label = teksten over feltet
//   type  = 'text' (lille felt), 'textarea' (stort felt) eller 'select' (dropdown)
// Vil du kunne rette et nyt felt, så tilføj bare en linje her
const BANE_FIELDS = [
  { key: 'name', label: 'Navn', type: 'text' },
  { key: 'description', label: 'Beskrivelse', type: 'textarea' },
  // Teksten i quizzens resultat. Den skal være neutral, så voksne ikke føler sig talt ned til.
  // Lader man den stå tom, laver quizzen selv en tekst ud fra banens fakta.
  // Der er tre udgaver: til "du", til en forælder og til en gruppe.
  // Punktummet i "quizTekst.mig" betyder: feltet "mig" inde i "quizTekst"
  { key: 'quizTekst.mig', label: 'Banevælger: tekst i resultatet', type: 'textarea' },
  { key: 'quizTekst.barn', label: 'Banevælger: tekst, når man svarer for sit barn (valgfri)', type: 'textarea' },
  { key: 'quizTekst.gruppe', label: 'Banevælger: tekst til grupper (valgfri)', type: 'textarea' },
  { key: 'requirements', label: 'Krav', type: 'text' },
  { key: 'addOn', label: 'Tilkøb (fx 30 kr.) – tom = intet tilkøb', type: 'text' },
  { key: 'trackHeight', label: 'Banehøjde', type: 'text' },
  { key: 'obstacles', label: 'Forhindringer', type: 'text' },
  { key: 'longestGlide', label: 'Længste svæv', type: 'text' },
  { key: 'glideAmount', label: 'Antal svæv', type: 'text' },
  { key: 'freeFall', label: 'Frit fald (fx 16 m) – tom = intet frit fald', type: 'text' },
  { key: 'trackLength', label: 'Banelængde', type: 'text' },
  { key: 'difficulty', label: 'Sværhedsgrad (fx 37.5%)', type: 'text' },
  { key: 'altImg', label: 'Alt-tekst til billede', type: 'text' },
  { key: 'class', label: 'Layout', type: 'select', options: ['img-right', 'img-left'] }
]

// Alle baner fra databasen
const baner = ref([])

// Formularernes indhold – én kopi pr. bane, så alle formularer kan vises på én gang.
// Ser sådan ud: { 'bane-1': { name: 'Grøn', description: '...', ... }, 'bane-2': {...} }
// Man retter i kopien, og intet ændres i Firebase, før man trykker "Gem bane"
const baneForms = ref({})

// Besked under hver bane, fx "Banen er gemt." – også gemt under banens id
const baneBeskeder = ref({})

// Id på banen, der gemmes lige nu ('' = ingen). Så kan knappen vise "Gemmer..."
const gemmerId = ref('')

// Vises, mens banerne hentes, eller hvis de ikke kunne hentes
const indlaeser = ref(true)
const fejlbesked = ref('')

// Henter alle baner fra Firebase. At LÆSE kræver ikke login – kun at gemme
async function hentBaner() {
  try {
    const res = await fetch(`${BANER_URL}.json`)

    // fetch siger ikke selv fra, hvis serveren svarer med en fejl (fx 404), så vi tjekker res.ok
    if (!res.ok) throw new Error(`Fejl ${res.status}`)

    const data = await res.json()

    // Firebase giver et objekt { 'bane-1': {...}, ... }. Vi laver det om til en liste,
    // hvor hver bane har sit id med: [{ id: 'bane-1', ... }, ...]
    baner.value = Object.entries(data ?? {}).map(([id, bane]) => ({ id, ...bane }))

    // Lav en udfyldt formular pr. bane: for hvert felt i BANE_FIELDS hentes banens værdi.
    // Mangler banen et felt, bliver det tomt ('').
    // Object.fromEntries laver en liste af par [nøgle, værdi] om til et objekt
    baneForms.value = Object.fromEntries(
      baner.value.map((bane) => [
        bane.id,
        {
          ...Object.fromEntries(BANE_FIELDS.map((f) => [f.key, hentFelt(bane, f.key)])),
          // Billedet (SVG-teksten) kommer også med i formularen, så et nyt billede først gemmes,
          // når man trykker "Gem bane" – ligesom de andre felter
          svg: bane.svg ?? ''
        }
      ])
    )
  } catch (e) {
    fejlbesked.value = 'Banerne kunne ikke hentes.'
    console.error(e)
  } finally {
    indlaeser.value = false
  }
}

// Henter værdien af ét felt fra banen.
// Almindelige felter (fx "name") læses bare direkte.
// "quizTekst.barn" betyder feltet "barn" inde i "quizTekst" – så split('.') deler det i to.
// Er quizTekst gemt som én almindelig tekst (gammel måde), hører den til "mig"
function hentFelt(bane, key) {
  if (!key.startsWith('quizTekst.')) return bane[key] ?? ''
  const del = key.split('.')[1]
  const qt = bane.quizTekst
  if (typeof qt === 'string') return del === 'mig' ? qt : ''
  return qt?.[del] ?? ''
}

// Laver formularen om til det, der skal gemmes i Firebase.
// De tre quizTekst-felter samles i ét objekt: quizTekst: { mig, barn, gruppe }.
// Tomme quiz-tekster tages ikke med. Er alle tre tomme, sættes quizTekst til null,
// og så sletter Firebase feltet
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
  // Har banen intet billede, sendes null i stedet for en tom tekst, så Firebase ikke får et tomt felt
  if (!data.svg) data.svg = null
  return data
}

// "Gem bane": sender rettelserne til Firebase. Kræver login.
// Beviset på login (token) sættes bag på adressen (?auth=...), så databasen ved,
// at det er en admin, der gemmer.
// encodeURIComponent laver tegn som mellemrum og & om, så de ikke ødelægger adressen
async function gemBane(bane) {
  baneBeskeder.value[bane.id] = ''
  gemmerId.value = bane.id

  try {
    const token = await hentToken()
    const data = tilGem(baneForms.value[bane.id])

    // PATCH = ret kun de felter, vi sender med. (PUT ville erstatte hele banen og slette resten).
    // JSON.stringify laver objektet om til tekst, som kan sendes over nettet
    const res = await fetch(
      `${BANER_URL}/${encodeURIComponent(bane.id)}.json?auth=${encodeURIComponent(token)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }
    )

    if (!res.ok) throw new Error(`Fejl ${res.status}`)

    // Kopiér de gemte værdier over i banen på siden, så fx overskriften viser det nye navn
    Object.assign(bane, data)

    baneBeskeder.value[bane.id] = 'Banen er gemt.'
  } catch (e) {
    baneBeskeder.value[bane.id] = 'Banen kunne ikke gemmes. Prøv igen.'
    console.error(e)
  } finally {
    gemmerId.value = ''
  }
}

// ---------- Banens billede (SVG) ---------- lavet med hjælp fra Claude (AI)
// Billede-beskeder under hver bane, fx "Nyt billede valgt..." (gemt under banens id)
const billedBeskeder = ref({})

// Laver SVG-teksten om til en adresse, som et <img> kan vise.
function billedeSrc(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

// DOWNLOAD: laver SVG-teksten om til en fil og får browseren til at downloade den.
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

// UPLOAD: kører, når man har valgt en fil i "Upload nyt billede".
// Billedet lægges kun i formularen. Det gemmes først i Firebase, når man trykker "Gem bane"
async function uploadBillede(bane, event) {
  const fil = event.target.files[0]
  if (!fil) return

  const tekst = await fil.text()

  if (!tekst.includes('<svg')) {
    billedBeskeder.value[bane.id] = 'Filen er ikke en SVG. Vælg en .svg-fil.'
  } else {
    baneForms.value[bane.id].svg = tekst
    billedBeskeder.value[bane.id] = 'Nyt billede valgt. Tryk "Gem bane" for at gemme det.'
  }

  // Tøm feltet, så man kan vælge den samme fil igen, hvis man vil
  event.target.value = ''
}

// Hent banerne, så snart fanen vises
onMounted(hentBaner)
</script>

<template>
  <h2>Rediger baner</h2>

  <!-- v-if / v-else-if / v-else: kun én af dem vises ad gangen -->
  <p v-if="indlaeser">Henter baner...</p>
  <p v-else-if="fejlbesked">{{ fejlbesked }}</p>
  <p v-else-if="baner.length === 0">Der er ingen baner endnu.</p>

  <div v-else class="admin-liste">
    <!-- Én formular pr. bane, åben fra starten.
         @submit.prevent = kør gemBane, når man trykker "Gem bane", uden at siden genindlæses -->
    <form
      v-for="(bane, indeks) in baner"
      :key="bane.id"
      class="admin-kort felter"
      @submit.prevent="gemBane(bane)"
    >
      <h3>{{ bane.name }}</h3>

      <!-- Ét felt pr. linje i BANE_FIELDS.
           v-model forbinder feltet med formularens kopi, så det man skriver, havner i baneForms -->
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

      <!-- Banens billede: se det, download det som .svg-fil, eller upload et nyt -->
      <div class="felt">
        <h4>Banens billede</h4>

        <!-- Forhåndsvisning. Viser altid formularens billede – også et nyt, der ikke er gemt endnu -->
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

        <!-- accept = filvælgeren viser kun SVG-filer. @change kører, når man har valgt en fil -->
        <label :for="'bane-' + indeks + '-upload'">Upload nyt billede (.svg)</label>
        <input
          :id="'bane-' + indeks + '-upload'"
          type="file"
          accept=".svg,image/svg+xml"
          @change="uploadBillede(bane, $event)"
        />
        <p v-if="billedBeskeder[bane.id]" role="status">{{ billedBeskeder[bane.id] }}</p>
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
