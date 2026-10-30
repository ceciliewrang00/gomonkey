<script setup>
// ---------- Imports ----------

// Vores egen knap-komponent. Bruges til ALLE knapper, så siden ser ens ud
import BaseButton from '@/components/BaseButton.vue'

// ref = en værdi Vue holder øje med
// onMounted = kører, når siden er vist
// onUnmounted = kører, når man forlader siden
// watch = kører, hver gang en bestemt værdi ændrer sig
import { ref, onMounted, onUnmounted, watch } from 'vue'

// RouterLink = link til en anden side i appen
import { RouterLink } from 'vue-router'

// Firebase-funktioner til login, logout og overvågning af loginstatus
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

// Firebase-loginforbindelsen fra vores egen fil
import { auth } from '../firebase'

// ---------- Indstillinger ----------

// Adressen til banerne. ".json" sætter vi på, når vi bruger den
const BANER_URL = 'https://gomonkey-baner-default-rtdb.europe-west1.firebasedatabase.app/baner'

// Adressen til quiz-databasen (spørgsmål og pointgrænser)
const QUIZ_URL = 'https://gomonkey-quiz-default-rtdb.europe-west1.firebasedatabase.app'

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

// Hvilken del af admin-siden der vises: 'baner' eller 'quiz'
const fane = ref('baner')

// ---------- Login ----------

const email = ref('')
const adgangskode = ref('')

// Den bruger, der er logget ind (null = ingen)
const bruger = ref(null)

// true, mens Firebase undersøger, om der allerede er et gemt login
const tjekkerLogin = ref(true)

const loginFejl = ref('')
const loggerInd = ref(false)

async function logInd() {
  loginFejl.value = ''
  loggerInd.value = true

  try {
    // Firebase kontrollerer e-mail og adgangskode
    const resultat = await signInWithEmailAndPassword(auth, email.value.trim(), adgangskode.value)
    bruger.value = resultat.user

    // Tømmer adgangskoden efter vellykket login
    adgangskode.value = ''
  } catch (fejl) {
    loginFejl.value = 'Login mislykkedes. Kontrollér e-mail og adgangskode.'
  } finally {
    loggerInd.value = false
  }
}

async function logUd() {
  loginFejl.value = ''

  try {
    // Loginlytteren herunder opdaterer bruger bagefter
    await signOut(auth)
    adgangskode.value = ''

    // Nulstiller det, man var i gang med
    valgtBaneId.value = ''
    redigerer.value = null
  } catch (fejl) {
    loginFejl.value = 'Du kunne ikke logges ud. Prøv igen.'
  }
}

// Lytter efter login og logout, også når siden genindlæses.
// Funktionen returnerer en stopfunktion, som vi bruger til oprydning
const stopLoginLytter = onAuthStateChanged(auth, (aktuelBruger) => {
  bruger.value = aktuelBruger
  tjekkerLogin.value = false
})

onUnmounted(() => {
  stopLoginLytter()
})

// Henter loginbeviset (token), som databasen bruger til at tjekke reglerne
async function hentToken() {
  return await auth.currentUser.getIdToken()
}

// ---------- Baner ----------

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

// ---------- Quiz: spørgsmål ----------

const spoergsmaal = ref([])
const indlaeser = ref(true)
const fejlbesked = ref('')

async function hentSpoergsmaal() {
  try {
    const response = await fetch(`${QUIZ_URL}/spoergsmaal.json`)

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

// ---------- Quiz: opret spørgsmål ----------

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
    const response = await fetch(`${QUIZ_URL}/spoergsmaal/${id}.json?auth=${encodeURIComponent(token)}`, {
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

// ---------- Quiz: rediger spørgsmål ----------

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
      `${QUIZ_URL}/spoergsmaal/${encodeURIComponent(data.id)}.json?auth=${encodeURIComponent(token)}`,
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

// ---------- Quiz: slet spørgsmål ----------

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
      `${QUIZ_URL}/spoergsmaal/${encodeURIComponent(sp.id)}.json?auth=${encodeURIComponent(token)}`,
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

// ---------- Quiz: pointgrænser ----------

// Blå bane fra 5 point og rød bane fra 9 point er startværdier
const baneGraenser = ref({
  blaaFra: 5,
  roedFra: 9
})

const gemmerGraenser = ref(false)
const graenseBesked = ref('')

async function hentBaneGraenser() {
  try {
    const response = await fetch(`${QUIZ_URL}/baneGraenser.json`)

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
    const response = await fetch(`${QUIZ_URL}/baneGraenser.json?auth=${encodeURIComponent(token)}`, {
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

// ---------- Start ----------

// Henter alt, når siden er klar
onMounted(() => {
  hentBaner()
  hentSpoergsmaal()
  hentBaneGraenser()
})
</script>

<template>
  <main class="admin">
    <!-- Øverste række: logo til venstre, knapper til højre -->
    <div class="head">
      <img src="@/assets/images/logo.svg" alt="GoMonkey logo">

      <div class="double-button">
        <RouterLink to="/" class="button-pink">← Tilbage til forsiden</RouterLink>
        <!-- Log ud vises kun, når man er logget ind -->
        <BaseButton v-if="bruger" type="button" variant="pink" @click="logUd">Log ud</BaseButton>
      </div>
    </div>

    <h1>Admin</h1>

    <!-- Vises, mens Firebase undersøger, om der er et gemt login -->
    <p v-if="tjekkerLogin">Kontrollerer login...</p>

    <!-- Loginformular. Vises, når man ikke er logget ind -->
    <form v-else-if="!bruger" class="admin-kort" @submit.prevent="logInd">
      <h2>Log ind</h2>

      <label for="admin-email">E-mail</label>
      <input id="admin-email" v-model="email" type="email" autocomplete="username" required />

      <label for="admin-password">Adgangskode</label>
      <input
        id="admin-password"
        v-model="adgangskode"
        type="password"
        autocomplete="current-password"
        required
      />

      <p v-if="loginFejl" role="alert">{{ loginFejl }}</p>

      <div class="knapper">
        <BaseButton type="submit" variant="pink" :disabled="loggerInd">
          {{ loggerInd ? 'Logger ind...' : 'Log ind' }}
        </BaseButton>
      </div>
    </form>

    <!-- Alt herunder vises, når man ER logget ind -->
    <template v-else>
      <p>Logget ind som: {{ bruger.email }}</p>
      <p v-if="loginFejl" role="alert">{{ loginFejl }}</p>

      <!-- Skifter mellem baner og quiz. Den valgte fane er fyldt ud -->
      <div class="knapper">
        <BaseButton
          type="button"
          :variant="fane === 'baner' ? 'primary' : 'pink'"
          @click="fane = 'baner'"
        >
          Baner
        </BaseButton>
        <BaseButton
          type="button"
          :variant="fane === 'quiz' ? 'primary' : 'pink'"
          @click="fane = 'quiz'"
        >
          Quiz
        </BaseButton>
      </div>

      <!-- ================= BANER ================= -->
      <section v-if="fane === 'baner'" class="admin-kort">
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

      <!-- ================= QUIZ ================= -->
      <template v-else>
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
    </template>
  </main>
</template>

<style lang="scss" scoped>
// Henter vores fælles farver, afstande og knapper
@use '@/assets/styles/buttons' as b;
@use '@/assets/styles/spacings' as s;
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/flex' as f;

// Hele admin-siden: elementerne ligger under hinanden
.admin {
  min-height: 100vh;
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: s.$spacing-xxl s.$spacing-m;
  background-color: c.$forest_green25;

  // Øverste række: logo til venstre, knapper til højre
  .head {
    padding: s.$spacing-xs s.$spacing-m;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  // Fælles udseende for ALLE felter på siden
  input,
  textarea,
  select {
    display: block;
    width: 100%;
    max-width: 36rem;
    font-family: "Inter", sans-serif;
    font-weight: 300;
    // clamp: skriften skalerer med skærmen, men aldrig under 1rem eller over 1.25rem
    font-size: clamp(1rem, 1.5vw, 1.25rem);
    padding: 0.75rem 1rem;
    border: 2px solid c.$forest_green100;
    border-radius: 1rem;
    background-color: white;
    color: c.$primary_black100;

    // Når man står i et felt, skifter kanten farve
    &:focus {
      outline: none;
      border-color: c.$forest_pink100;
    }
  }

  // Alle feltetiketter ligger over feltet
  label {
    display: block;
    margin-top: 1rem;
    margin-bottom: 0.4rem;
    font-weight: 600;
  }

  // Lys, afrundet boks om hvert afsnit
  .admin-kort {
    padding: 1.5rem;
    background-color: c.$primary_light25;
    border-radius: 1rem;

    li {
      margin-bottom: 0.5rem;
      line-height: 1.5;
    }
  }

  // Spørgsmålskortene ligger under hinanden
  .admin-liste {
    display: grid;
    gap: 1rem;
    max-width: 60rem;
  }

  // Redigeringsformularen sidder inde i spørgsmålskortet
  .redigering {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid c.$primary_black100;
  }

  // Bane-formularens felter: label og felt under hinanden
  .felter,
  .felt {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  // Rækker med knapper: ligger ved siden af hinanden og ombrydes på små skærme
  .knapper {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  // Gør ventetilstanden synlig på deaktiverede knapper
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>