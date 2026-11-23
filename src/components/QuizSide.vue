<script setup>
// Banevælgeren på /banequiz. Gæsten svarer på spørgsmål ét ad gangen og får en anbefalet bane.
// Denne fil viser kun spørgsmål og resultat – reglerne står i services/quizLogik.js

import { ref, computed, onMounted } from 'vue'

// Giver adgang til adressen (?hvem=barn), når man kommer fra forsiden med et svar valgt
import { useRoute } from 'vue-router'

import { SPOERGSMAAL_URL } from '@/services/api.js'

// Reglerne for anbefalingen – hver funktion laver én del af quizzen
import {
  lavResultat,
  skalVises,
  visTekst,
  visHjaelp,
  visSvarTekst,
  beregnBane,
  lavBegrundelse,
  lavVidere,
  lavGruppeBesked,
  lavFritfaldBesked,
  lavGodtAtVide,
  lavFoerstegangsInfo,
  lavVoksenInfo,
} from '@/services/quizLogik.js'

import { hentBaner } from '@/services/baner.js'


// Brugerens svar, gemt under hvert spørgsmåls id, fx { hoejde: {...}, erfaring: {...} }
const valgteSvar = ref({})

// Spørgsmålene fra Firebase
const spoergsmaal = ref([])

// Nummeret på det spørgsmål, brugeren er nået til (0 = det første)
const aktivtIndeks = ref(0)

// true = vis resultatet i stedet for spørgsmålene
const visResultat = ref(false)

// De spørgsmål, der skal vises lige nu. Nogle vises kun ved bestemte svar (se skalVises)
const synligeSpoergsmaal = computed(() => {
  return spoergsmaal.value.filter((sp) => skalVises(sp, valgteSvar.value))
})

// Det spørgsmål, der vises lige nu
const aktivtSpoergsmaal = computed(() => {
  return synligeSpoergsmaal.value[aktivtIndeks.value]
})

// Spørgsmålets tekst, tilpasset "du", "dit barn" eller en gruppe
const aktivTekst = computed(() => {
  if (!aktivtSpoergsmaal.value) {
    return ''
  }
  return visTekst(aktivtSpoergsmaal.value, valgteSvar.value)
})

// Lille hjælpetekst under spørgsmålet
const aktivHjaelp = computed(() => {
  if (!aktivtSpoergsmaal.value) {
    return ''
  }
  return visHjaelp(aktivtSpoergsmaal.value, valgteSvar.value)
})

// Hvor langt man er nået i procent, til bjælken øverst. På resultatet er det 100 %
const fremdrift = computed(() => {
  if (synligeSpoergsmaal.value.length === 0) {
    return 0
  }
  if (visResultat.value) {
    return 100
  }
  return Math.round(
    ((aktivtIndeks.value + 1) / synligeSpoergsmaal.value.length) * 100
  )
})

// true, mens spørgsmålene hentes
const indlaeser = ref(true)

// Fejlbesked, hvis noget går galt
const fejlbesked = ref('')

// true, når alle synlige spørgsmål har et svar
const alleBesvaret = computed(() => {
  return (
    synligeSpoergsmaal.value.length > 0 &&
    synligeSpoergsmaal.value.every((sp) => valgteSvar.value[sp.id])
  )
})

const baner = ref([])

// ---------- Resultatet ----------
// Regnes først ud, når alle spørgsmål er besvaret

// Den anbefalede bane (null, indtil alle spørgsmål er besvaret)
const anbefaletBane = computed(() => {
  if (!alleBesvaret.value) {
    return null
  }
  return beregnBane(valgteSvar.value, baner.value)
})

// Overskrift og tekst til resultatet, fx "Vi anbefaler: Start på Grøn"
const resultat = computed(() => lavResultat(anbefaletBane.value, valgteSvar.value))

// Listen "Derfor anbefaler vi den"
const begrundelse = computed(() => {
  if (!anbefaletBane.value) {
    return []
  }
  return lavBegrundelse(anbefaletBane.value, valgteSvar.value)
})

// Sætningen om, hvilken bane man kan tage bagefter
const videre = computed(() => lavVidere(anbefaletBane.value, valgteSvar.value, baner.value))

// Ekstra beskeder til grupper
const gruppeBesked = computed(() =>
  lavGruppeBesked(anbefaletBane.value, valgteSvar.value, baner.value)
)

// Ekstra besked om Sort bane og frit fald
const fritfaldBesked = computed(() => {
  if (!alleBesvaret.value) {
    return ''
  }
  return lavFritfaldBesked(anbefaletBane.value, valgteSvar.value, baner.value)
})

// Forklaring af reglen om, at førstegangsklatrere starter på en let bane
const foerstegangsInfo = computed(() =>
  lavFoerstegangsInfo(anbefaletBane.value, valgteSvar.value, baner.value)
)

// Den voksnes rolle – vises kun, når svaret er "Mit barn"
const voksenInfo = computed(() => lavVoksenInfo(valgteSvar.value))

// Regler, der er gode at kende før besøget
const godtAtVide = computed(() => lavGodtAtVide(valgteSvar.value))

// ---------- Hent data og knapper ----------

// Henter spørgsmålene og sorterer dem i quiz-rækkefølge
async function hentSpoergsmaal() {
  try {
    const response = await fetch(`${SPOERGSMAAL_URL}.json`)

    // Stopper med en fejl, hvis Firebase svarer med en fejl
    if (!response.ok) {
      throw new Error('Firebase svarede med status ' + response.status)
    }

    const data = await response.json()

    const liste = Object.values(data ?? {})

    liste.sort((a, b) => (a.raekkefoelge ?? 0) - (b.raekkefoelge ?? 0))

    spoergsmaal.value = liste

  } catch (fejl) {
    fejlbesked.value =
      'Spørgsmålene kunne ikke hentes. Prøv at genindlæse siden.'
    console.error('Fejl ved hentning af spørgsmål:', fejl)
  }
}

// Gemmer det svar, man klikker på
function vaelgSvar(spoergsmaalId, svar) {
  valgteSvar.value[spoergsmaalId] = { ...svar }

  // Sletter svar på spørgsmål, der ikke skal vises mere – ellers ville de tælle med.
  // Fx hvis man går tilbage og skifter fra "ja" til "nej" til frit fald
  for (const sp of spoergsmaal.value) {
    if (!skalVises(sp, valgteSvar.value)) {
      delete valgteSvar.value[sp.id]
    }
  }
}

// "Næste": går til næste spørgsmål – eller til resultatet, hvis det var det sidste
function naesteSpoergsmaal() {
  const sp = aktivtSpoergsmaal.value

  // Har man ikke svaret, sker der ingenting
  if (!sp || !valgteSvar.value[sp.id]) {
    return
  }

  if (aktivtIndeks.value < synligeSpoergsmaal.value.length - 1) {
    aktivtIndeks.value += 1
  } else if (alleBesvaret.value) {
    visResultat.value = true
  }
}

// "Tilbage": går ét spørgsmål tilbage
function forrigeSpoergsmaal() {
  if (aktivtIndeks.value > 0) {
    aktivtIndeks.value -= 1
  }
}

// "Start forfra": sletter alle svar og går til første spørgsmål
function startForfra() {
  valgteSvar.value = {}
  aktivtIndeks.value = 0
  visResultat.value = false
}

// Henter banerne. Går det galt, vises en fejlbesked
async function hentQuizBaner() {
  try {
    baner.value = await hentBaner()
  } catch (fejl) {
    fejlbesked.value = 'Banerne kunne ikke hentes. Prøv at genindlæse siden.'
    console.error('Fejl ved hentning af baner:', fejl)
  }
}

// Kommer man fra "Find din bane" på forsiden med et svar i adressen (fx /banequiz?hvem=barn),
// vælges svaret på "Hvem skal klatre?" med det samme, og quizzen går videre til næste spørgsmål
const route = useRoute()

function vaelgSvarFraAdressen() {
  const hvem = route.query.hvem
  if (!hvem) return

  const sp = spoergsmaal.value.find((s) => s.id === 'hvem')
  const svar = sp?.svar?.find((sv) => sv.hvem === hvem)
  if (!svar) return

  vaelgSvar(sp.id, svar)
  if (aktivtSpoergsmaal.value?.id === sp.id) naesteSpoergsmaal()
}

// Henter spørgsmål og baner på samme tid, når siden vises
onMounted(async () => {
  indlaeser.value = true
  await Promise.all([hentSpoergsmaal(), hentQuizBaner()])
  indlaeser.value = false
  vaelgSvarFraAdressen()
})
</script>

<template>
  <!-- En div og ikke <main>, for QuizView har allerede <main> -->
  <div class="quiz-side">

    <!-- Krydset lukker quizzen og går til forsiden -->
    <RouterLink to="/" class="button-close quiz-luk" aria-label="Luk quizzen og gå til forsiden">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </RouterLink>

    <!-- Desktop: introen til venstre og quizzen til højre -->
    <!-- Når resultatet vises, skjules introen -->
    <div class="quiz-kolonne" :class="{ 'quiz-kolonne--resultat': visResultat }">

    <section v-if="!visResultat" class="quiz-intro">
        <span class="badge badge--dark">Banevælger</span>
        <h1>Find den rette bane for dig</h1>
        <p>
        Svar på et par korte spørgsmål, så finder vi den bane, I skal starte på.
        Det tager under et minut.
        </p>

        <!-- Tre korte punkter om, hvordan anbefalingen virker -->
        <ul class="quiz-punkter">
          <li>Vi anbefaler hellere en bane for let end for svær.</li>
          <li>Alle starter med instruktion og en prøvebane.</li>
          <li>I kan altid tage en sværere bane bagefter.</li>
        </ul>
    </section>

    <p v-if="indlaeser" class="quiz-status">Henter spørgsmål...</p>

    <p v-else-if="fejlbesked" class="quiz-status">{{ fejlbesked }}</p>

    <p v-else-if="spoergsmaal.length === 0" class="quiz-status">
      Der er endnu ingen spørgsmål i quizzen.
    </p>

    <!-- Resultatet -->
    <!-- Resultatkortet får den anbefalede banes farve i toppen -->
    <section
      v-else-if="visResultat"
      class="quiz-kort quiz-resultat"
      :class="anbefaletBane ? `bane--${anbefaletBane.bane.id}` : ''"
    >
      <!-- Desktop: to kolonner – anbefalingen til venstre, beskeder og lister til højre.
           Mobil: alt under hinanden med knapperne nederst -->
      <div class="resultat-hoved">

      <!-- Mangler databasen de nye spørgsmål, kan vi ikke finde en bane -->
      <div v-if="!resultat" class="resultat-top">
        <span class="badge">Dit resultat</span>
        <h2 class="h3">Vi kunne ikke finde en bane</h2>
        <p>Quizzen er ved at blive opdateret. Prøv igen senere, eller kontakt os.</p>
      </div>

      <template v-else>
        <!-- 1. Den anbefalede bane og en kort beskrivelse -->
        <div class="resultat-top">
          <span class="badge">Dit resultat</span>
          <h2 class="h3">
            <span class="resultat-prik" aria-hidden="true"></span>
            {{ resultat.titel }}
          </h2>
          <p class="resultat-tekst">{{ resultat.tekst }}</p>
          <!-- Link til banens kort på forsiden -->
          <RouterLink
            :to="anbefaletBane ? { path: '/', hash: `#${anbefaletBane.bane.id}` } : '/'"
            class="button-arrow resultat-se-bane"
          >
            {{ anbefaletBane ? `Se ${anbefaletBane.bane.name}` : 'Se banerne' }}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </RouterLink>
        </div>

        <!-- 2. Reglen for førstegangsklatrere og næste skridt -->
        <div class="resultat-naeste">
        <div v-if="foerstegangsInfo" class="resultat-regel">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M12 11v6M12 7.5v.01" /></svg>
          <div>
            <h3 class="resultat-regel__titel h4">{{ foerstegangsInfo.titel }}</h3>
            <p class="resultat-regel__tekst">{{ foerstegangsInfo.tekst }}</p>
          </div>
        </div>

        <!-- Den voksnes rolle, når svaret er "Mit barn". Linker til sektionen på forsiden -->
        <div v-if="voksenInfo" class="resultat-regel">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="7" r="3" /><path d="M3 20c0-3.5 2.5-6 6-6s6 2.5 6 6" /><circle cx="17" cy="9" r="2.2" /><path d="M15.5 14.2c3 .2 5.5 2.4 5.5 5.8" /></svg>
          <div>
            <h3 class="resultat-regel__titel h4">{{ voksenInfo.titel }}</h3>
            <p class="resultat-regel__tekst">
              {{ voksenInfo.tekst }}
              <RouterLink :to="{ path: '/', hash: '#foelg-barnet' }" class="resultat-regel__link">Læs mere</RouterLink>
            </p>
          </div>
        </div>

        <p v-if="videre" class="resultat-videre">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          <span>{{ videre }}</span>
        </p>
        </div>
      </template>

      <!-- 5. Ret svarene eller start forfra -->
      <div class="resultat-fod">
      <div class="resultat-bund">
        <button
          type="button"
          class="button-arrow button-arrow--tilbage quiz-tilbage"
          @click="visResultat = false"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
          Ret mine svar
        </button>
        <button type="button" class="button-primary" @click="startForfra">
          Start forfra
        </button>
      </div>
      </div>
      </div>

      <div v-if="resultat" class="resultat-detaljer">
        <!-- 3. Ekstra beskeder til grupper og om frit fald -->
        <div v-if="gruppeBesked.length || fritfaldBesked" class="resultat-beskeder">
          <p v-for="linje in gruppeBesked" :key="linje" class="resultat-besked">{{ linje }}</p>
          <p v-if="fritfaldBesked" class="resultat-besked">{{ fritfaldBesked }}</p>
        </div>

        <!-- 4. To lister: hvorfor denne bane, og praktiske regler -->
        <div class="resultat-info">
          <div v-if="begrundelse.length">
            <h3 class="resultat-overskrift etiket">Derfor anbefaler vi den</h3>
            <ul class="resultat-liste resultat-liste--tjek">
              <li v-for="grund in begrundelse" :key="grund">{{ grund }}</li>
            </ul>
          </div>

          <!-- Praktiske regler fra gomonkey.dk/praktisk-info -->
          <div>
            <h3 class="resultat-overskrift etiket">Godt at vide</h3>
            <ul class="resultat-liste">
              <li v-for="linje in godtAtVide" :key="linje">{{ linje }}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Det aktuelle spørgsmål -->
    <section v-else-if="aktivtSpoergsmaal" class="quiz-kort">
      <!-- Spørgsmålsnummer og procent over fremdriftsbjælken -->
      <div class="quiz-fremdrift">
        <div class="quiz-fremdrift__tekst">
          <span class="quiz-meta etiket">
            Spørgsmål {{ aktivtIndeks + 1 }} af {{ synligeSpoergsmaal.length }}
          </span>
          <span class="quiz-meta etiket">{{ fremdrift }}%</span>
        </div>

        <progress
          :value="fremdrift"
          max="100"
          aria-label="Fremdrift gennem quizzen"
        ></progress>
      </div>

      <h4>{{ aktivTekst }}</h4>

      <p v-if="aktivHjaelp" class="quiz-hjaelp">{{ aktivHjaelp }}</p>

      <div class="quiz-svar">
        <!-- Én knap pr. svar. aria-pressed markerer det valgte svar -->
        <button
          v-for="svarItem in aktivtSpoergsmaal.svar"
          :key="svarItem.id"
          type="button"
          class="quiz-svarknap text"
          :aria-pressed="valgteSvar[aktivtSpoergsmaal.id]?.id === svarItem.id"
          @click="vaelgSvar(aktivtSpoergsmaal.id, svarItem)"
        >
          {{ visSvarTekst(svarItem, valgteSvar) }}
        </button>
      </div>

      <p v-if="valgteSvar[aktivtSpoergsmaal.id]" class="quiz-valgt lille-tekst">
        Du har valgt: {{ visSvarTekst(valgteSvar[aktivtSpoergsmaal.id], valgteSvar) }}
      </p>

      <div class="quiz-navigation">
        <!-- Tilbage vises efter første spørgsmål -->
        <button
          v-if="aktivtIndeks > 0"
          type="button"
          class="button-arrow button-arrow--tilbage quiz-tilbage"
          @click="forrigeSpoergsmaal"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
          Tilbage
        </button>

        <!-- "Næste" er grå, indtil man har valgt et svar -->
        <button
          type="button"
          class="button-primary quiz-naeste"
          :disabled="!valgteSvar[aktivtSpoergsmaal.id]"
          @click="naesteSpoergsmaal"
        >
          {{
            aktivtIndeks === synligeSpoergsmaal.length - 1
              ? 'Se min anbefaling'
              : 'Næste'
          }}
        </button>
      </div>
    </section>

    </div>
  </div>
</template>

<style scoped lang="scss">
/* Farver, flex-hjælpere og afstande fra de fælles style-filer */
@use '../assets/styles/colors' as c;
@use '@/assets/styles/flex' as f;
@use '@/assets/styles/spacings' as s;

// Fylder skærmen under headeren, og indholdet står lodret i midten
.quiz-side {
  position: relative;  // så krydset placeres i forhold til quizsiden
  display: flex;
  align-items: center;
  min-height: calc(100dvh - 5rem);
  background-color: c.$forest_green25;

  .quiz-kolonne {
    flex: 1;
  }

  // Desktop: hver kolonne centreres for sig, så introen ikke rykker, når kortet skifter højde
  @media (min-width: 1000px) {
    align-items: stretch;
  }
}

.quiz-luk {
  position: absolute;
  top: s.$spacing-s;
  right: s.$spacing-m;
  z-index: 2;
}

/* Samme sidepadding og bredde som forsidens sektioner */
.quiz-kolonne {
  display: grid;
  grid-template-columns: 1fr;
  gap: s.$spacing-l;
  padding: s.$sektion-luft 0;
  padding-inline: max(s.$spacing-m, calc((100% - #{s.$indhold-bredde}) / 2));

  @media (min-width: 1000px) {
    grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
    // Mindre luft end på forsiden, så resultatkortet kan være på skærmen
    padding-block: s.$spacing-l;
    // Rækken er lige så høj som skærmen, så introen står samme sted
    align-items: center;
    column-gap: s.$spacing-xxl;
  }
}

/* Introen står fast i venstre side på desktop, mens man svarer */
.quiz-intro {
  @include f.flex-column;
  align-items: flex-start;
  padding: 0;
  margin: 0;

  // Overskriften er 48px på alle skærme, så den ikke fylder for meget ved siden af quizkortet.
  // Teksten følger p i _typography.scss
  h1 {
    font-size: 48px;
  }

  p {
    margin: 0;
  }

  @media (min-width: 1000px) {
    position: sticky;
    top: 6rem;
  }
}

/* De tre punkter: lille mørkegrøn prik med flueben */
.quiz-punkter {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin: s.$spacing-xs 0 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    // Teksten følger brødtekst-reglerne for li i _typography.scss

    &::before {
      content: '✓';
      flex-shrink: 0;
      display: grid;
      place-items: center;
      width: 1.35rem;
      height: 1.35rem;
      border-radius: 50%;
      background-color: c.$primary_darkgreen;
      color: c.$primary_light25;
      font-size: 0.75rem;
      font-weight: 700;
      font-family: system-ui, -apple-system, sans-serif;
    }
  }
}

/* Statusbeskederne bruger samme boks som quizkortet */

/* Lille, dæmpet hjælpetekst, fx "Spørgsmål 1 af 5" */
// Teksten følger .etiket i _typography.scss
.quiz-meta {
  display: block;
}

/* Quizkortet: lys boks med blød skygge */
.quiz-kort,
.quiz-status {
  margin: 0;
  padding: s.$spacing-l ;
  background-color: c.$primary_light25;
  border-radius: 1rem;
  box-shadow: 0 1rem 2.5rem rgba(c.$primary_darkgreen, 0.12);
}


/* Svarene under hinanden på mobil, i 2 kolonner på større skærme */
.quiz-svar {
  display: grid;
  grid-template-columns: 1fr;
  gap: s.$spacing-xs;

  // Alle rækker er lige høje, så boksene er ens
  grid-auto-rows: 1fr;

  @media (min-width: 700px) {
    grid-template-columns: 1fr 1fr;

    // Ved et ulige antal svar fylder det sidste hele bredden
    .quiz-svarknap:last-child:nth-child(odd) {
      grid-column: 1 / -1;
    }
  }
}


// Spørgsmålet følger h4 i _typography.scss
.quiz-kort h4 {
  padding-bottom: 25px;
}

.quiz-svarknap {
  width: 100%;
  // Samme mindstehøjde for alle svar
  min-height: 3.5rem;
   padding:0.5rem 1.5rem;
   line-height: 1.4;
   // Teksten følger .text i _typography.scss (brødtekst)
  border: 1px solid c.$primary_black100;
  border-radius: 1rem;
  background-color: transparent;
  color: c.$primary_black100;
  text-align: left;
  // Teksten til venstre og tjek-boksen til højre
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  /* Rund tjek-boks – samme som i KortFilter.vue */
  &::after {
    content: '';
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border: 2px solid c.$primary_black100;
    border-radius: 50%;
    font-size: 13px;
    font-weight: bold;
    line-height: 1;
    // Systemets skrift, så fluebenet ser ens ud som i filteret
    font-family: system-ui, -apple-system, sans-serif;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }

  transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;

  // Hover (kun med mus): svag lyserød baggrund og lyserød cirkel
  @media (hover: hover) {
    &:not([aria-pressed='true']):hover {
      background-color: c.$forest_pink25;

      &::after {
        border-color: c.$forest_pink100;
        background-color: c.$primary_light25;
      }
    }
  }

  /* Det valgte svar */
  &[aria-pressed='true'] {
    background-color: c.$primary_black100;
    color: c.$primary_light25;
    font-weight: 700;

    // Tjek-boksen bliver lyserød med et mørkt flueben
    &::after {
      content: '✓';
      background-color: c.$forest_pink100;
      border-color: c.$forest_pink100;
      color: c.$primary_black100;
    }
  }

  /* Tydelig fokus ved brug af tastaturet */
  &:focus-visible {
    outline: 3px solid c.$forest_pink100;
    outline-offset: 3px;
  }
}

.quiz-fremdrift {
  display: flex;
  flex-direction: column;
  gap: s.$spacing-xs;
  margin-bottom: s.$spacing-m;
}

.quiz-fremdrift__tekst {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Fremdriftsbjælken */
.quiz-fremdrift progress {
  width: 100%;
  height: 0.75rem;
  border: 0;
  border-radius: 1rem;
  overflow: hidden;
  appearance: none;
  background-color: c.$forest_pink100;

  /* Baggrunden i Chrome og Safari */
  &::-webkit-progress-bar {
    background-color: c.$forest_pink100;
  }

  /* Den udfyldte del i Chrome og Safari */
  &::-webkit-progress-value {
    background-color: c.$primary_black100;
    border-radius: 1rem;
  }

  /* Den udfyldte del i Firefox */
  &::-moz-progress-bar {
    background-color: c.$primary_black100;
    border-radius: 1rem;
  }
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* "Du har valgt: …" – .lille-tekst fra _typography.scss, i kursiv */
.quiz-valgt {
  font-style: italic;
}

.quiz-navigation {
  @include f.flex-buttons;
  margin-top: s.$spacing-m;
}

/* "Næste" står altid ude til højre */
.quiz-naeste {
  margin-left: auto;
}

/* Tilbage-knappen er sort, da lyserød er svær at læse på den lyse boks */
.quiz-tilbage {
  color: c.$primary_black100;
}

/* ---------- Resultatkortet ---------- */

/* En stribe i den anbefalede banes farve øverst */
.quiz-resultat {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: s.$spacing-s;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 0.5rem;
    background-color: var(--bane-farve, #{c.$primary_darkgreen});
  }

  p {
    margin: 0;
  }
}

/* Mobil: indpakningerne "forsvinder", så delene står under hinanden med knapperne nederst.
   Desktop: to kolonner adskilt af en tynd streg */
.resultat-hoved,
.resultat-detaljer {
  display: contents;
}

.resultat-fod {
  order: 1;
}

@media (min-width: 1000px) {
  // Introen er skjult, så resultatkortet fylder hele bredden
  .quiz-kolonne--resultat {
    grid-template-columns: 1fr;
  }

  .quiz-resultat {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: s.$spacing-xl;

    // Mangler resultatet, er der kun én kolonne
    &:not(:has(.resultat-detaljer)) {
      grid-template-columns: 1fr;
    }
  }

  .resultat-hoved,
  .resultat-detaljer {
    display: flex;
    flex-direction: column;
    gap: s.$spacing-s;
  }

  .resultat-fod {
    margin-top: auto;
  }

  .resultat-detaljer {
    padding-left: s.$spacing-xl;
    border-left: 1px solid rgba(c.$primary_black100, 0.12);
  }
}

// Plads over kortet til lukkekrydset
.quiz-kolonne--resultat {
  padding-top: 4.5rem;
}

// Banefarverne fra $kort-bane-farver
@each $id, $farve in c.$kort-bane-farver {
  .bane--#{$id} {
    --bane-farve: #{$farve};
  }
}

.resultat-prik {
  display: inline-block;
  width: 0.8em;
  height: 0.8em;
  margin-right: 0.15em;
  border-radius: 50%;
  background-color: var(--bane-farve, #{c.$primary_darkgreen});
  vertical-align: 0.02em;
}

.resultat-naeste {
  display: flex;
  flex-direction: column;
  gap: s.$spacing-xs;
}

.resultat-top {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: s.$spacing-xs;

  // Resultatets overskrift er en h2 for skærmlæsere, men ser ud som .h3 i _typography.scss (24/32px)
  h2 {
    margin: 0;
    padding: 0;
    line-height: 1.1;
  }
}

// Teksten følger p i _typography.scss
.resultat-tekst {
  line-height: 1.55;
}

/* 2. Næste skridt: mørk boks med pil */
.resultat-videre {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem s.$spacing-s;
  border-radius: 1rem;
  background-color: c.$primary_black100;
  color: c.$primary_light25;
  font-weight: 700;
  line-height: 1.5;

  svg {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.5em;  // pilen flugter med første tekstlinje
    fill: none;
    stroke: c.$forest_pink100;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

/* Reglen for førstegangsklatrere: lys boks med info-ikon */
.resultat-regel {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 2px solid c.$primary_black100;
  border-radius: 1rem;

  svg {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    fill: none;
    stroke: c.$primary_black100;
    stroke-width: 2;
    stroke-linecap: round;
  }
}

// Titlen ser ud som .h4 og teksten følger p i _typography.scss
.resultat-regel__titel {
  margin: 0;
  padding: 0;
}

.resultat-regel__tekst {
  margin: 0.25rem 0 0;
  line-height: 1.5;
}

// "Læs mere"-linket i boksen om den voksnes rolle
.resultat-regel__link {
  color: inherit;
  font-weight: 700;
}

/* 3. Lyserøde bokse med beskeder */
.resultat-beskeder {
  display: flex;
  flex-direction: column;
  gap: s.$spacing-xs;
}

.resultat-besked {
  padding: 0.75rem 1rem;
  border-left: 4px solid c.$forest_pink100;
  border-radius: 1rem;
  background-color: c.$forest_pink25;
  // Teksten følger p i _typography.scss
  line-height: 1.5;
}

/* 4. De to lister – ved siden af hinanden på store skærme */
.resultat-info {
  display: grid;
  grid-template-columns: 1fr;
  gap: s.$spacing-m;
  padding-top: s.$spacing-s;
  border-top: 1px solid rgba(c.$primary_black100, 0.12);

  @media (min-width: 700px) {
    grid-template-columns: 1fr 1fr;
  }
}

// Teksten følger .etiket i _typography.scss
.resultat-overskrift {
  margin: 0 0 s.$spacing-xs;
  padding: 0;
}

/* Vores egne punkter i stedet for browserens prikker */
.resultat-liste {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    gap: 0.6rem;
    // Teksten følger brødtekst-reglerne for li i _typography.scss
    line-height: 1.5;

    &::before {
      content: '';
      flex-shrink: 0;
      width: 0.4rem;
      height: 0.4rem;
      margin-top: 0.55em;
      border-radius: 50%;
      background-color: c.$primary_black50;
    }
  }
}

/* "Derfor"-listen får et lyserødt flueben */
.resultat-liste--tjek li::before {
  content: '✓';
  width: auto;
  height: auto;
  margin-top: 0;
  background: none;
  color: c.$forest_pink100;
  font-weight: 900;
}

/* "Se Grøn →" – sort og fed, så den ses på den lyse boks */
.resultat-se-bane {
  margin-top: 0.25rem;
  color: c.$primary_black100;
  font-weight: 700;
}

/* 5. Bundlinjen under en tynd streg */
.resultat-fod {
  padding-top: s.$spacing-s;
  border-top: 1px solid rgba(c.$primary_black100, 0.12);
}

.resultat-bund {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: s.$spacing-m;
}

/* Hjælpeteksten trækkes tæt op under overskriften */
.quiz-hjaelp {
  margin: -1.2rem 0 2rem;
  color: c.$primary_black75;
  // Teksten følger p i _typography.scss
}

</style>