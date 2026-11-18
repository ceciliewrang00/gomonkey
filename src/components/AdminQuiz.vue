<script setup>
// ADMIN: FANEN "QUIZ"
// Her retter man quizzens spørgsmål og svar (Firebase "spoergsmaal").
// Man kan: se alle spørgsmål, rette et spørgsmål, slette et og oprette et nyt.
// Filen vises i AdminView.vue under fanen "Quiz". Udseendet kommer fra AdminView.vue.
//
// Det vigtige ved hvert svar er "Giver højst" (i koden: maksNiveau).
// Det er den sværeste bane, svaret tillader: 1 = Let, 2 = Mellem, 3 = Svær.
// Fx kan svaret "Jeg har aldrig klatret" give højst Let.
// Til sidst bestemmer det LAVESTE af alle svarene anbefalingen (se services/quizLogik.js).
// Der bruges ingen point.

import BaseButton from '@/components/BaseButton.vue'
import { ref, onMounted } from 'vue'

// auth = login-forbindelsen. auth.currentUser er den, der er logget ind (eller null)
import { auth } from '../firebase'

// Adressen på spørgsmålene i Firebase + hentToken, der giver beviset på login
import { SPOERGSMAAL_URL, hentToken } from '@/services/api.js'

// Valgene i dropdown'en "Giver højst" ved hvert svar
const NIVEAU_VALG = [
  { vaerdi: 3, tekst: 'Svær (ingen begrænsning)' },
  { vaerdi: 2, tekst: 'Mellem' },
  { vaerdi: 1, tekst: 'Let' },
]

// Laver tallet om til et ord i oversigten: 1 → 'Let', 2 → 'Mellem', 3 → 'Svær'.
// Er der intet tal, vises en streg '–'
function niveauTekst(n) {
  return { 1: 'Let', 2: 'Mellem', 3: 'Svær' }[n] ?? '–'
}

// ---------- Spørgsmål ----------

// spoergsmaal = alle spørgsmål fra databasen
// indlaeser   = true, mens de hentes ("Henter spørgsmål...")
// fejlbesked  = hvis de ikke kunne hentes
const spoergsmaal = ref([])
const indlaeser = ref(true)
const fejlbesked = ref('')

// Henter alle spørgsmål fra Firebase. At læse kræver ikke login.
// Den kaldes også efter man har oprettet, rettet eller slettet,
// så listen på siden altid viser det samme som databasen
async function hentSpoergsmaal() {
  try {
    const response = await fetch(`${SPOERGSMAAL_URL}.json`)

    if (!response.ok) {
      throw new Error('Firebase svarede med status ' + response.status)
    }

    const data = await response.json()

    // Firebase giver et objekt. Object.values laver det om til en liste,
    // og sort sorterer efter feltet "raekkefoelge" (1, 2, 3 ...), så spørgsmålene står i quiz-rækkefølge
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

// Rydder op i ét svar, før det gemmes:
// - fjerner mellemrum før og efter teksterne (.trim())
// - er barn- eller gruppe-teksten tom, slettes feltet helt (delete),
//   så quizzen i stedet bruger den almindelige tekst
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

// Formularen "Opret spørgsmål" – det, man skriver, havner her (via v-model)
const nytSpoergsmaal = ref({
  tekst: '',
  // Starter med to tomme svar. Flere kan tilføjes med "Tilføj svarmulighed".
  // maksNiveau: 3 = "Svær (ingen begrænsning)" er standard
  svar: [
    { id: 's1', tekst: '', maksNiveau: 3 },
    { id: 's2', tekst: '', maksNiveau: 3 }
  ]
})

// gemmer    = true, mens der gemmes (så knapperne bliver grå)
// gemBesked = beskeden bagefter, fx "Spørgsmålet er gemt."
const gemmer = ref(false)
const gemBesked = ref('')

// "Tilføj svarmulighed": lægger et nyt, tomt svar i listen.
// crypto.randomUUID() laver et tilfældigt id, som aldrig er det samme to gange.
// Vue bruger id'et (:key) til at holde styr på, hvilket felt der er hvilket
function tilfoejSvarmulighed() {
  nytSpoergsmaal.value.svar.push({
    id: crypto.randomUUID(),
    tekst: '',
    maksNiveau: 3
  })
}

// "Fjern svarmulighed": fjerner et svar.
// filter laver en ny liste med alle de svar, der IKKE har dette id – så er det væk
function fjernSvarmulighed(svarId) {
  // Et spørgsmål skal have mindst to svar, så vi stopper her, hvis der kun er to
  if (nytSpoergsmaal.value.svar.length <= 2) {
    return
  }

  nytSpoergsmaal.value.svar = nytSpoergsmaal.value.svar.filter((svar) => svar.id !== svarId)
}

// "Gem spørgsmål": gemmer det nye spørgsmål i Firebase.
// Først tjekkes, at man er logget ind, og at alt er udfyldt.
// Er noget galt, vises en besked, og return stopper funktionen, før der gemmes
async function opretSpoergsmaal() {
  gemBesked.value = ''

  if (!auth.currentUser) {
    gemBesked.value = 'Du skal være logget ind.'
    return
  }

  // Spørgsmålet og alle svar skal have tekst.
  // .some(...) = "er der mindst ét svar, hvor teksten er tom?"
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

    // Et tilfældigt id. Det bruges både som spørgsmålets id og som dets adresse i Firebase
    const id = crypto.randomUUID()

    // Find det højeste rækkefølge-nummer. Det nye spørgsmål får nummeret efter, så det kommer sidst
    const sidstePlacering = Math.max(0, ...spoergsmaal.value.map((sp) => Number(sp.raekkefoelge) || 0))

    // Det, der gemmes. type 'niveau' = spørgsmålet er med til at bestemme anbefalingen
    const data = {
      id,
      tekst: nytSpoergsmaal.value.tekst.trim(),
      type: 'niveau',
      raekkefoelge: sidstePlacering + 1,
      svar: nytSpoergsmaal.value.svar.map(rydSvar)
    }

    // PUT gemmer spørgsmålet på adressen spoergsmaal/<id>.
    // ?auth=... er beviset på login, som databasen kræver for at gemme
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

// redigerer        = en KOPI af det spørgsmål, man retter (null = intet er åbent)
// gemmerRedigering = true, mens ændringerne gemmes
// redigerBesked    = fx "Ændringerne er gemt."
const redigerer = ref(null)
const gemmerRedigering = ref(false)
const redigerBesked = ref('')

// "Rediger spørgsmål": åbner formularen med en kopi af spørgsmålet.
// Hvorfor en kopi? Så listen ikke ændrer sig, mens man skriver – kun når man trykker "Gem".
// JSON.parse(JSON.stringify(...)) er et trick til at lave en HELT ny kopi,
// også af listen med svar indeni (en almindelig kopi ville dele svar-listen med originalen)
function startRedigering(sp) {
  redigerer.value = JSON.parse(JSON.stringify(sp))
  redigerBesked.value = ''
}

// "Annuller": luk formularen og smid kopien væk – intet bliver gemt
function annullerRedigering() {
  redigerer.value = null
  redigerBesked.value = ''
}

// "Gem ændringer": samme tjek som ved opret, og så erstattes spørgsmålet i Firebase (PUT)
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

  // Ryd op i teksterne. Alle andre felter (fx visHvis og tekstBarn) bliver, som de er
  data.tekst = data.tekst.trim()
  data.svar = data.svar.map(rydSvar)

  gemmerRedigering.value = true

  try {
    const token = await hentToken()

    // PUT erstatter hele spørgsmålet i Firebase med den rettede kopi
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

// sletterId  = id på det spørgsmål, der slettes lige nu ('' = intet) – så knappen kan vise "Sletter..."
// sletBesked = beskeden bagefter
const sletterId = ref('')
const sletBesked = ref('')

// "Slet spørgsmål". Før der slettes, tjekkes tre ting:
// 1. Er det et af de faste spørgsmål, som quizlogikken har brug for? Så må det ikke slettes
// 2. Afhænger et andet spørgsmål af det (visHvis)? Så må det heller ikke slettes
// 3. Er man sikker? (window.confirm viser en boks med OK/Annuller)
async function sletSpoergsmaal(sp) {
  sletBesked.value = ''

  // De faste spørgsmål. quizLogik.js bruger dem direkte ved navn, så quizzen går i stykker uden dem
  const fasteId = ['hoejde', 'erfaring', 'tryghed', 'fysik', 'oplevelse', 'fritfald', 'vaegt']

  if (fasteId.includes(sp.id)) {
    sletBesked.value = 'Dette spørgsmål bruges af quizlogikken og kan ikke slettes her.'
    return
  }

  // Er der et andet spørgsmål, som kun vises ved et bestemt svar på DETTE spørgsmål (visHvis)?
  // Så ville det andet spørgsmål aldrig blive vist, hvis vi slettede dette
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

// Hent spørgsmålene, så snart fanen vises
onMounted(() => {
  hentSpoergsmaal()
})
</script>

<template>
  <h2>Rediger quiz</h2>
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

          <!-- "Giver højst" kan kun rettes på spørgsmål, der styrer anbefalingen (type 'niveau').
               v-model.number = gem valget som et tal (3) og ikke som tekst ("3") -->
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

  <!-- Opret spørgsmål (under listen med alle spørgsmål) -->
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
</template>