<script setup>
// Fanen "Quiz" i admin, hvor man opretter, retter og sletter quizzens spørgsmål.
// "Giver højst" (maksNiveau) ved hvert svar er den sværeste bane, svaret tillader

import BaseButton from '@/components/BaseButton.vue'

import { ref, onMounted, onUnmounted } from 'vue'

// Login-forbindelsen. auth.currentUser er den, der er logget ind
import { auth } from '../firebase'

// Adressen på spørgsmålene og hentToken, som beviser, at man er logget ind
import { SPOERGSMAAL_URL, hentToken } from '@/services/api.js'

// Valgene i dropdown'en "Giver højst"
const NIVEAU_VALG = [
  { vaerdi: 3, tekst: 'Svær (ingen begrænsning)' },
  { vaerdi: 2, tekst: 'Mellem' },
  { vaerdi: 1, tekst: 'Let' },
]

// Hjælpeteksten i (i)'et ved "Giver højst"
const GIVER_HOEJST_HJAELP =
  'Den sværeste bane, man kan få anbefalet, hvis man vælger dette svar. ' +
  'Fx kan "Jeg har aldrig klatret" give højst Let. Quizzen bruger det laveste af alle svarene, ' +
  'så ét svar med Let giver altid en Let bane. Vælg "Svær (ingen begrænsning)", ' +
  'hvis svaret ikke skal holde anbefalingen nede.'

// ---------- Info-boblen ved "Giver højst" ----------
// Nøglen på den boble, der er åben (null = ingen)
const aabenInfo = ref(null)

// Klik på (i) åbner boblen – klik igen lukker den
function skiftInfo(noegle) {
  aabenInfo.value = aabenInfo.value === noegle ? null : noegle
}

// Lukker boblen, når man går videre fra (i)-knappen med Tab
function lukVedFokusUd(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    aabenInfo.value = null
  }
}

// Lukker boblen, når man klikker et andet sted på siden (nødvendig i Safari)
function lukVedKlikUdenfor(event) {
  if (aabenInfo.value && !event.target.closest('.info')) {
    aabenInfo.value = null
  }
}

// Laver tallet om til et ord: 1 → 'Let', 2 → 'Mellem', 3 → 'Svær'
function niveauTekst(n) {
  return { 1: 'Let', 2: 'Mellem', 3: 'Svær' }[n] ?? '–'
}

// ---------- Spørgsmål ----------

// Alle spørgsmål fra databasen
const spoergsmaal = ref([])
// true, mens de hentes
const indlaeser = ref(true)
// Fejlbesked, hvis de ikke kunne hentes
const fejlbesked = ref('')

// Henter alle spørgsmål og sorterer dem i quiz-rækkefølge.
// Den kaldes også efter opret, ret og slet, så listen altid passer med databasen
async function hentSpoergsmaal() {
  try {
    const response = await fetch(`${SPOERGSMAAL_URL}.json`)

    if (!response.ok) {
      throw new Error('Firebase svarede med status ' + response.status)
    }

    const data = await response.json()

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

// Fjerner mellemrum i svarets tekster. Er barn- eller gruppe-teksten tom,
// slettes feltet, så quizzen bruger den almindelige tekst
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

// Formularen "Opret spørgsmål"
const nytSpoergsmaal = ref({
  tekst: '',
  // Starter med to tomme svar. 3 = "Svær (ingen begrænsning)" er standard
  svar: [
    { id: 's1', tekst: '', maksNiveau: 3 },
    { id: 's2', tekst: '', maksNiveau: 3 }
  ]
})

// true, mens der gemmes
const gemmer = ref(false)
// Beskeden bagefter, fx "Spørgsmålet er gemt."
const gemBesked = ref('')

// "Tilføj svarmulighed": lægger et nyt, tomt svar med et tilfældigt id i listen
function tilfoejSvarmulighed() {
  nytSpoergsmaal.value.svar.push({
    id: crypto.randomUUID(),
    tekst: '',
    maksNiveau: 3
  })
}

// "Fjern svarmulighed": fjerner svaret med dette id – men der skal være mindst to svar
function fjernSvarmulighed(svarId) {
  if (nytSpoergsmaal.value.svar.length <= 2) {
    return
  }

  nytSpoergsmaal.value.svar = nytSpoergsmaal.value.svar.filter((svar) => svar.id !== svarId)
}

// "Gem spørgsmål": tjekker, at man er logget ind, og at alt er udfyldt,
// og gemmer så det nye spørgsmål i Firebase
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

    // Et tilfældigt id, som også er spørgsmålets adresse i Firebase
    const id = crypto.randomUUID()

    // Det nye spørgsmål får nummeret efter det højeste, så det kommer sidst
    const sidstePlacering = Math.max(0, ...spoergsmaal.value.map((sp) => Number(sp.raekkefoelge) || 0))

    // type 'niveau' = spørgsmålet er med til at bestemme anbefalingen
    const data = {
      id,
      tekst: nytSpoergsmaal.value.tekst.trim(),
      type: 'niveau',
      raekkefoelge: sidstePlacering + 1,
      svar: nytSpoergsmaal.value.svar.map(rydSvar)
    }

    // PUT gemmer spørgsmålet på spoergsmaal/<id> med beviset på login
    const response = await fetch(`${SPOERGSMAAL_URL}/${id}.json?auth=${encodeURIComponent(token)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error('Gemning fejlede med status ' + response.status)
    }

    // Henter listen igen, så det nye spørgsmål vises
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

// En kopi af det spørgsmål, man retter (null = intet er åbent)
const redigerer = ref(null)
// true, mens ændringerne gemmes
const gemmerRedigering = ref(false)
// Beskeden bagefter, fx "Ændringerne er gemt."
const redigerBesked = ref('')

// "Rediger spørgsmål": åbner formularen med en helt ny kopi af spørgsmålet og dets svar,
// så listen ikke ændrer sig, før man trykker "Gem"
function startRedigering(sp) {
  redigerer.value = JSON.parse(JSON.stringify(sp))
  redigerBesked.value = ''
}

// "Annuller": lukker formularen – intet bliver gemt
function annullerRedigering() {
  redigerer.value = null
  redigerBesked.value = ''
}

// "Gem ændringer": samme tjek som ved opret, og så erstattes spørgsmålet i Firebase
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

  // Rydder op i teksterne. Alle andre felter bliver, som de er
  data.tekst = data.tekst.trim()
  data.svar = data.svar.map(rydSvar)

  gemmerRedigering.value = true

  try {
    const token = await hentToken()

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

    // Henter listen igen og lukker formularen
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

// Id på det spørgsmål, der slettes lige nu, så knappen kan vise "Sletter..."
const sletterId = ref('')
// Beskeden bagefter
const sletBesked = ref('')

// "Slet spørgsmål". Faste spørgsmål og spørgsmål, som et andet spørgsmål afhænger af,
// må ikke slettes. Til sidst spørger vi, om man er sikker
async function sletSpoergsmaal(sp) {
  sletBesked.value = ''

  // De faste spørgsmål, som quizLogik.js bruger ved navn
  const fasteId = ['hoejde', 'erfaring', 'tryghed', 'fysik', 'oplevelse', 'fritfald', 'vaegt']

  if (fasteId.includes(sp.id)) {
    sletBesked.value = 'Dette spørgsmål bruges af quizlogikken og kan ikke slettes her.'
    return
  }

  // Vises et andet spørgsmål kun ved et svar på dette spørgsmål, må det ikke slettes
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

// Henter spørgsmålene, når fanen vises, og lytter efter klik, så boblen kan lukke
onMounted(() => {
  hentSpoergsmaal()
  document.addEventListener('click', lukVedKlikUdenfor)
})
// Stopper med at lytte efter klik, når fanen lukkes
onUnmounted(() => document.removeEventListener('click', lukVedKlikUdenfor))
</script>

<template>
  <h2>Rediger quiz</h2>
  <!-- Beskeder om redigering og sletning vises her, også når formularen er lukket -->
  <p v-if="redigerBesked" role="status">{{ redigerBesked }}</p>
  <p v-if="sletBesked" role="status">{{ sletBesked }}</p>

  <!-- Liste med spørgsmål -->
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

          <!-- Valgfri tekster til barn og gruppe -->
          <label :for="'rediger-svar-barn-' + sp.id + '-' + svar.id">Tekst, når man svarer for sit barn (valgfri)</label>
          <input :id="'rediger-svar-barn-' + sp.id + '-' + svar.id" v-model="svar.tekstBarn" type="text" />

          <label :for="'rediger-svar-gruppe-' + sp.id + '-' + svar.id">Tekst, når man svarer for en gruppe (valgfri)</label>
          <input :id="'rediger-svar-gruppe-' + sp.id + '-' + svar.id" v-model="svar.tekstGruppe" type="text" />

          <!-- "Giver højst" kan kun rettes på spørgsmål af typen 'niveau'.
               v-model.number gemmer valget som et tal -->
          <div v-if="redigerer.type === 'niveau'">
            <div class="label-med-info">
              <label :for="'rediger-niveau-' + sp.id + '-' + svar.id">Giver højst</label>
              <!-- (i)-knappen åbner en boble med forklaringen -->
              <span class="info" @focusout="lukVedFokusUd" @keydown.esc="aabenInfo = null">
                <button
                  type="button"
                  class="info__knap"
                  aria-label="Hvad betyder Giver højst?"
                  :aria-expanded="aabenInfo === 'rediger-' + svar.id"
                  :aria-controls="'info-' + 'rediger-' + svar.id"
                  @click="skiftInfo('rediger-' + svar.id)"
                >
                  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                    <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6" />
                    <circle cx="10" cy="6.2" r="1.15" fill="currentColor" />
                    <rect x="9.1" y="8.6" width="1.8" height="6" rx="0.9" fill="currentColor" />
                  </svg>
                </button>
                <span v-if="aabenInfo === 'rediger-' + svar.id" :id="'info-' + 'rediger-' + svar.id" class="info__boble">
                  {{ GIVER_HOEJST_HJAELP }}
                </span>
              </span>
            </div>
            <select
              :id="'rediger-niveau-' + sp.id + '-' + svar.id"
              v-model.number="svar.maksNiveau"
            >
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

  <!-- Opret spørgsmål -->
  <section class="admin-kort">
    <h2>Opret spørgsmål</h2>

    <label for="nyt-spoergsmaal">Spørgsmålstekst</label>
    <input id="nyt-spoergsmaal" v-model="nytSpoergsmaal.tekst" type="text" required />

    <!-- Felter pr. svarmulighed -->
    <div v-for="(svar, indeks) in nytSpoergsmaal.svar" :key="svar.id">
      <label :for="'nyt-svar-' + svar.id">Svarmulighed {{ indeks + 1 }}</label>
      <input :id="'nyt-svar-' + svar.id" v-model="svar.tekst" type="text" required />

      <!-- Valgfri tekster til barn og gruppe -->
      <label :for="'nyt-svar-barn-' + svar.id">Tekst, når man svarer for sit barn (valgfri)</label>
      <input :id="'nyt-svar-barn-' + svar.id" v-model="svar.tekstBarn" type="text" />

      <label :for="'nyt-svar-gruppe-' + svar.id">Tekst, når man svarer for en gruppe (valgfri)</label>
      <input :id="'nyt-svar-gruppe-' + svar.id" v-model="svar.tekstGruppe" type="text" />

      <div class="label-med-info">
        <label :for="'nyt-niveau-' + svar.id">Giver højst</label>
        <!-- (i)-knappen åbner en boble med forklaringen -->
        <span class="info" @focusout="lukVedFokusUd" @keydown.esc="aabenInfo = null">
          <button
            type="button"
            class="info__knap"
            aria-label="Hvad betyder Giver højst?"
            :aria-expanded="aabenInfo === 'nyt-' + svar.id"
            :aria-controls="'info-' + 'nyt-' + svar.id"
            @click="skiftInfo('nyt-' + svar.id)"
          >
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6" />
              <circle cx="10" cy="6.2" r="1.15" fill="currentColor" />
              <rect x="9.1" y="8.6" width="1.8" height="6" rx="0.9" fill="currentColor" />
            </svg>
          </button>
          <span v-if="aabenInfo === 'nyt-' + svar.id" :id="'info-' + 'nyt-' + svar.id" class="info__boble">
            {{ GIVER_HOEJST_HJAELP }}
          </span>
        </span>
      </div>
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