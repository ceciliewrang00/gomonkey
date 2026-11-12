<script setup>
// QUIZSIDE (BANEVÆLGEREN)
// Gæsten svarer på spørgsmål ét ad gangen og får til sidst en anbefalet startbane.
//
// Overblik:
// 1. onMounted (nederst i scriptet) henter spørgsmål og pointgrænser fra Firebase.
// 2. Brugerens svar gemmes i valgteSvar som { spørgsmåls-id: valgt svar }.
// 3. Nogle spørgsmål vises kun ved bestemte svar (visHvis), fx frit fald.
//    synligeSpoergsmaal er listen over de spørgsmål, der skal vises lige nu.
// 4. Selve reglerne for anbefalingen ligger i services/quizLogik.js.
//    Pointgrænserne (blaaFra og roedFra) kan ændres af admin i AdminQuiz.vue.
// 5. Templaten viser enten indlæsning, fejl, ét spørgsmål eller resultatet.

// Importerer værktøjer til data, beregninger og opstart.
import { ref, computed, onMounted } from 'vue'

// Databaseadresserne står samlet i api.js
import { SPOERGSMAAL_URL, GRAENSER_URL } from '@/services/api.js'

// Reglerne for anbefalingen står samlet i quizLogik.js
import {
  RESULTATER,
  skalVises,
  visTekst,
  visHjaelp,
  beregnBane,
  lavBegrundelse,
  lavVidere,
  lavGruppeBesked,
  lavFritfaldBesked,
  lavGodtAtVide,
} from '@/services/quizLogik.js'

// Link til booking. RET til jeres egen bookingside.
const BOOK_URL = 'https://gomonkey.dk'

// Gemmer svarene under hvert spørgsmåls id.
const valgteSvar = ref({})

// Gemmer spørgsmålene, som hentes fra Firebase.
const spoergsmaal = ref([])

// Gemmer pointgrænserne fra Firebase.
// null betyder, at de endnu ikke er hentet.
const baneGraenser = ref(null)

// Gemmer placeringen for det spørgsmål, brugeren er nået til.
// 0 betyder det første spørgsmål, fordi lister tæller fra 0.
const aktivtIndeks = ref(0)

// Holder styr på, om resultatsiden skal vises.
const visResultat = ref(false)

// Beregner, hvilke spørgsmål der skal vises ud fra brugerens svar.
// skalVises tjekker visHvis (se quizLogik.js).
const synligeSpoergsmaal = computed(() => {
  return spoergsmaal.value.filter((sp) => skalVises(sp, valgteSvar.value))
})

// Finder det spørgsmål, der skal vises lige nu.
const aktivtSpoergsmaal = computed(() => {
  return synligeSpoergsmaal.value[aktivtIndeks.value]
})

// Spørgsmålsteksten tilpasset "mig", "mit barn" eller "gruppe".
const aktivTekst = computed(() => {
  if (!aktivtSpoergsmaal.value) {
    return ''
  }
  return visTekst(aktivtSpoergsmaal.value, valgteSvar.value)
})

// Lille hjælpetekst under spørgsmålet, fx "Svar for den, der er mest nervøs."
const aktivHjaelp = computed(() => {
  if (!aktivtSpoergsmaal.value) {
    return ''
  }
  return visHjaelp(aktivtSpoergsmaal.value, valgteSvar.value)
})

// Beregner, hvor langt brugeren er nået gennem spørgsmålene.
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

// Er true, mens spørgsmålene bliver hentet.
const indlaeser = ref(true)

// Gemmer en fejlbesked. Starter uden en besked.
const fejlbesked = ref('')

// Beregner kun point fra synlige pointspørgsmål.
// Hvem, højde, vægt og frit fald tæller derfor ikke med.
const samledePoint = computed(() => {
  const pointSpoergsmaal = synligeSpoergsmaal.value.filter(
    (sp) => sp.type === 'point'
  )
  return pointSpoergsmaal.reduce((total, sp) => {
    const svar = valgteSvar.value[sp.id]
    return total + (svar?.point ?? 0)
  }, 0)
})

// Kontrollerer, om alle synlige spørgsmål er besvaret.
const alleBesvaret = computed(() => {
  return (
    synligeSpoergsmaal.value.length > 0 &&
    synligeSpoergsmaal.value.every((sp) => valgteSvar.value[sp.id])
  )
})

// Beregner den anbefalede bane, fx 'blaa1'. Reglerne står i quizLogik.js.
const anbefaletBane = computed(() => {
  if (!alleBesvaret.value || !baneGraenser.value) {
    return null
  }
  return beregnBane(valgteSvar.value, samledePoint.value, baneGraenser.value)
})

// Henter titel og tekst til den anbefalede bane.
const resultat = computed(() => {
  return RESULTATER[anbefaletBane.value] ?? null
})

// Kort liste med grundene til anbefalingen.
const begrundelse = computed(() => {
  if (!anbefaletBane.value) {
    return []
  }
  return lavBegrundelse(
    anbefaletBane.value,
    valgteSvar.value,
    samledePoint.value,
    baneGraenser.value
  )
})

// Næste skridt efter startbanen.
const videre = computed(() => lavVidere(anbefaletBane.value, valgteSvar.value))

// Ekstra beskeder til grupper (en liste, som kan være tom).
const gruppeBesked = computed(() =>
  lavGruppeBesked(anbefaletBane.value, valgteSvar.value)
)

// Ekstra besked om Sort bane / frit fald.
const fritfaldBesked = computed(() => {
  if (!alleBesvaret.value) {
    return ''
  }
  return lavFritfaldBesked(anbefaletBane.value, valgteSvar.value)
})

// Regler, som er gode at kende før besøget (fx voksne med børn og max. vægt).
const godtAtVide = computed(() => lavGodtAtVide(valgteSvar.value))

// Henter pointgrænserne, som administratoren har gemt.
async function hentBaneGraenser() {
  try {
    const response = await fetch(`${GRAENSER_URL}.json`)

    if (!response.ok) {
      throw new Error('Hentning fejlede med status ' + response.status)
    }

    const data = await response.json()

    // Kontrollerer, at grænserne er hele tal og står i rigtig rækkefølge.
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
    fejlbesked.value =
      'Quizindstillingerne kunne ikke hentes. Prøv at genindlæse siden.'
    console.error('Fejl ved hentning af pointgrænser:', fejl)
  }
}

// Henter spørgsmålene til quizzen.
async function hentSpoergsmaal() {
  try {
    // 1. HENT: Ber Firebase hente spørgsmålene med fetch.
    const response = await fetch(`${SPOERGSMAAL_URL}.json`)

    // 2. TJEK: Lykkedes kaldet? Hvis ikke, send til catch.
    if (!response.ok) {
      throw new Error('Firebase svarede med status ' + response.status)
    }

    // 3. LÆS: Læs indholdet som JavaScript-data.
    const data = await response.json()

    // 4. LISTE: Lav spørgsmålene om til en liste (tom liste, hvis databasen er tom).
    const liste = Object.values(data ?? {})

    // 5. SORTÉR: Brug spørgsmålenes rækkefølge fra databasen.
    liste.sort((a, b) => (a.raekkefoelge ?? 0) - (b.raekkefoelge ?? 0))

    // 6. GEM: Læg listen i den variabel, Vue viser spørgsmålene fra.
    spoergsmaal.value = liste
  } catch (fejl) {
    fejlbesked.value =
      'Spørgsmålene kunne ikke hentes. Prøv at genindlæse siden.'
    console.error('Fejl ved hentning af spørgsmål:', fejl)
  }
}

// Modtager spørgsmålets id og hele den valgte svarmulighed.
function vaelgSvar(spoergsmaalId, svar) {
  // Gemmer en kopi af det valgte svar.
  valgteSvar.value[spoergsmaalId] = { ...svar }

  // Fjerner svar på spørgsmål, som ikke længere skal vises.
  // Fx hvis brugeren går tilbage og ændrer "Mest muligt adrenalin" til "En rolig tur".
  for (const sp of spoergsmaal.value) {
    if (!skalVises(sp, valgteSvar.value)) {
      delete valgteSvar.value[sp.id]
    }
  }
}

// Går videre, når det aktuelle spørgsmål er besvaret.
function naesteSpoergsmaal() {
  const sp = aktivtSpoergsmaal.value

  if (!sp || !valgteSvar.value[sp.id]) {
    return
  }

  if (aktivtIndeks.value < synligeSpoergsmaal.value.length - 1) {
    aktivtIndeks.value += 1
  } else if (alleBesvaret.value) {
    visResultat.value = true
  }
}

// Går tilbage til det forrige spørgsmål.
function forrigeSpoergsmaal() {
  if (aktivtIndeks.value > 0) {
    aktivtIndeks.value -= 1
  }
}

// Starter en ny quiz med de spørgsmål, der allerede er hentet.
function startForfra() {
  valgteSvar.value = {}
  aktivtIndeks.value = 0
  visResultat.value = false
}

// Starter hentningen, når quizsiden er klar.
onMounted(async () => {
  indlaeser.value = true
  await Promise.all([hentSpoergsmaal(), hentBaneGraenser()])
  indlaeser.value = false
})
</script>

<template>
  <!-- Samler sidens indhold. En div og ikke <main>, for QuizView har allerede <main> -->
  <div class="quiz-side">

    <!-- Kryds øverst til højre: lukker quizzen og går til forsiden -->
    <RouterLink to="/" class="button-close quiz-luk" aria-label="Luk quizzen og gå til forsiden">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </RouterLink>

    <!-- Smal kolonne, så intro og quizkort flugter og ikke fylder hele skærmen -->
    <div class="quiz-kolonne">

    <section class="quiz-intro">
        <!-- Introducerer banevælgeren. -->
        <span class="badge badge--dark">Banevælger</span>
        <h1>Find den rette bane for dig</h1>
        <p>
        Svar på fem korte spørgsmål, så finder vi den bane, I skal starte på.
        Det tager under et minut.
        </p>
    </section>

    <!-- Vises, mens spørgsmål og pointgrænser hentes. -->
    <p v-if="indlaeser" class="quiz-status">Henter spørgsmål...</p>

    <!-- Vises, hvis et API-kald mislykkes. -->
    <p v-else-if="fejlbesked" class="quiz-status">{{ fejlbesked }}</p>

    <!-- Vises, hvis databasen er tom. -->
    <p v-else-if="spoergsmaal.length === 0" class="quiz-status">
      Der er endnu ingen spørgsmål i quizzen.
    </p>

    <!-- Viser resultatet i en lys boks. -->
    <!-- Opbygning: top (titel + tekst) → næste skridt → beskeder → to lister → knapper -->
    <section v-else-if="visResultat" class="quiz-kort quiz-resultat">

      <!-- Hvis databasen mangler de nye spørgsmål, kan vi ikke beregne en bane. -->
      <div v-if="!resultat" class="resultat-top">
        <span class="badge">Dit resultat</span>
        <h2>Vi kunne ikke finde en bane</h2>
        <p>Quizzen er ved at blive opdateret. Prøv igen senere, eller kontakt os.</p>
      </div>

      <template v-else>
        <!-- 1. Den anbefalede startbane og en kort beskrivelse af den. -->
        <div class="resultat-top">
          <span class="badge">Dit resultat</span>
          <h2>{{ resultat.titel }}</h2>
          <p class="resultat-tekst">{{ resultat.tekst }}</p>
        </div>

        <!-- 2. Næste skridt efter startbanen, fremhævet med en pil. -->
        <p v-if="videre" class="resultat-videre">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          <span>{{ videre }}</span>
        </p>

        <!-- 3. Ekstra beskeder til grupper og om frit fald, samlet i lyserøde bokse. -->
        <div v-if="gruppeBesked.length || fritfaldBesked" class="resultat-beskeder">
          <p v-for="linje in gruppeBesked" :key="linje" class="resultat-besked">{{ linje }}</p>
          <p v-if="fritfaldBesked" class="resultat-besked">{{ fritfaldBesked }}</p>
        </div>

        <!-- 4. To korte lister: hvorfor denne bane, og praktiske regler.
                Ved siden af hinanden på store skærme, under hinanden på mobil. -->
        <div class="resultat-info">
          <div v-if="begrundelse.length">
            <h3 class="resultat-overskrift">Derfor anbefaler vi den</h3>
            <ul class="resultat-liste resultat-liste--tjek">
              <li v-for="grund in begrundelse" :key="grund">{{ grund }}</li>
            </ul>
          </div>

          <!-- Praktiske regler fra gomonkey.dk/praktisk-info. -->
          <div>
            <h3 class="resultat-overskrift">Godt at vide</h3>
            <ul class="resultat-liste">
              <li v-for="linje in godtAtVide" :key="linje">{{ linje }}</li>
            </ul>
          </div>
        </div>
      </template>

      <!-- 5. Hovedhandlingerne: book eller se banerne. -->
      <div class="resultat-handlinger">
        <a :href="BOOK_URL" class="button-primary">Book</a>
        <RouterLink to="/" class="button-secondary">Se banerne</RouterLink>
      </div>

      <!-- Mindre vigtige handlinger nederst: ret svarene eller start forfra. -->
      <div class="resultat-bund">
        <button
          type="button"
          class="button-arrow button-arrow--tilbage quiz-tilbage"
          @click="visResultat = false"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
          Ret mine svar
        </button>
        <button type="button" class="button-arrow quiz-tilbage" @click="startForfra">
          Start forfra
        </button>
      </div>
    </section>

    <!-- Viser kun det aktuelle spørgsmål. -->
    <section v-else-if="aktivtSpoergsmaal" class="quiz-kort">
      <!-- Spørgsmålsnummer og procent på én linje over fremdriftsbjælken. -->
      <div class="quiz-fremdrift">
        <div class="quiz-fremdrift__tekst">
          <!-- Viser spørgsmålets nummer og antal synlige spørgsmål. -->
          <span class="quiz-meta">
            Spørgsmål {{ aktivtIndeks + 1 }} af {{ synligeSpoergsmaal.length }}
          </span>
          <!-- Viser fremdriften som procent. -->
          <span class="quiz-meta">{{ fremdrift }}%</span>
        </div>

        <!-- Viser fremdriften med 100 som maksimum. -->
        <progress
          :value="fremdrift"
          max="100"
          aria-label="Fremdrift gennem quizzen"
        ></progress>
      </div>

      <!-- Viser teksten til det aktive spørgsmål, tilpasset hvem der skal klatre. -->
      <h3>{{ aktivTekst }}</h3>

      <!-- Kort forklaring under spørgsmålet, hvis der er en. -->
      <p v-if="aktivHjaelp" class="quiz-hjaelp">{{ aktivHjaelp }}</p>

      <!-- Placerer svarmulighederne i en lodret liste. -->
      <div class="quiz-svar">
        <!-- Opretter en knap pr. svar og markerer det valgte svar. -->
        <!-- Klik gemmer svaret til det aktive spørgsmål. -->
        <button
          v-for="svarItem in aktivtSpoergsmaal.svar"
          :key="svarItem.id"
          type="button"
          class="quiz-svarknap text"
          :aria-pressed="valgteSvar[aktivtSpoergsmaal.id]?.id === svarItem.id"
          @click="vaelgSvar(aktivtSpoergsmaal.id, svarItem)"
        >
          <!-- Viser svarteksten. -->
          {{ svarItem.tekst }}
        </button>
      </div>

      <!-- Bekræfter brugerens valgte svar. -->
      <p v-if="valgteSvar[aktivtSpoergsmaal.id]">
        Du har valgt: {{ valgteSvar[aktivtSpoergsmaal.id].tekst }}
      </p>

      <!-- Samler navigationsknapperne med afstand mellem dem. -->
      <div class="quiz-navigation">
        <!-- Viser Tilbage efter første spørgsmål. -->
        <!-- .button-arrow fra _buttons.scss med pilen mod venstre -->
        <button
          v-if="aktivtIndeks > 0"
          type="button"
          class="button-arrow button-arrow--tilbage quiz-tilbage"
          @click="forrigeSpoergsmaal"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
          Tilbage
        </button>

        <!-- Kræver et svar, før brugeren kan gå videre. -->
        <button
          type="button"
          class="button-primary quiz-naeste"
          :disabled="!valgteSvar[aktivtSpoergsmaal.id]"
          @click="naesteSpoergsmaal"
        >
          <!-- Skifter knapteksten på sidste spørgsmål. -->
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
/* .. går én mappe op fra views til src, hvor assets ligger. */
@use '../assets/styles/colors' as c;
@use '@/assets/styles/flex' as f;
@use '@/assets/styles/spacings' as s;

/* Giver quizsiden baggrundsfarve */
.quiz-side {
  position: relative; // Så krydset placeres i forhold til quizsiden
  background-color: c.$forest_green25;
  min-height: 100vh;
  padding-bottom: 2rem;
}

/* Lukkekryds øverst til højre. Udseendet kommer fra .button-close i _buttons.scss */
.quiz-luk {
  position: absolute;
  top: s.$spacing-s;
  right: s.$spacing-m;
  z-index: 2;
}

/* Smal, centreret kolonne, så intro og quizkort har samme bredde og flugter. */
.quiz-kolonne {
  padding: s.$spacing-xxl 0 0;
  // Samme sidepadding som .forside > section i main.scss,
  // så quizzen flugter med forsidens indhold
  padding-inline: max(s.$spacing-m, calc((100% - #{s.$indhold-bredde}) / 2));
}

/* Intro og quizboks har samme smalle bredde og står i midten af siden.
   margin-inline: auto fordeler den ledige plads ligeligt på begge sider */
.quiz-intro,
.quiz-kort,
.quiz-status {
  max-width: 48rem;
  margin-inline: auto;
}

/* Intro over quizkortet: badge, overskrift og tekst under hinanden, centreret. */
.quiz-intro {
  @include f.flex-column;
  align-items: center;
  text-align: center;
  padding: 0; // Nulstiller section-padding fra main.scss
  margin-inline: auto;
  margin-bottom: s.$spacing-s;

  p {
    margin: 0; // Fjerner browserens standard-margin
  }

  // .badge har align-self: flex-start i _badges.scss – her skal den stå i midten
  .badge {
    align-self: center;
  }
}

/* Statusbeskeder (indlæser, fejl, tom quiz) i samme boks som quizkortet. */
.quiz-status {
  padding: s.$spacing-m;
  background-color: c.$primary_light25;
  border-radius: 1rem;
}

/* Lille, dæmpet hjælpetekst, fx "Spørgsmål 1 af 5" og "Dit resultat". */
.quiz-meta {
  display: block;
  font-size: 0.875rem;
  color: c.$primary_black75;
}

/* Viser spørgsmålet i en lys boks. Bredden og centreringen står længere oppe */
.quiz-kort {
  margin-block: 0;
  padding: s.$spacing-l s.$spacing-xl;
  background-color: c.$primary_light25;
  border-radius: 1rem;
}


/* Svarene under hinanden på mobil, i 2 kolonner på større skærme. */
.quiz-svar {
  display: grid;
  grid-template-columns: 1fr;
  gap: s.$spacing-xs;

  @media (min-width: 700px) {
    grid-template-columns: 1fr 1fr;
  }
}

/* Spørgsmålet (h3 fra _typography.scss): 25px luft ned til svarene */
.quiz-kort h3 {
  padding-bottom: 25px;
}

/* Giver svarknapperne afrundede kanter og venstrestillet tekst. */
.quiz-svarknap {
  width: 100%;
  padding: 0.85rem 1rem;
  // Samme farve som det valgte svar (sort)
  border: 1px solid c.$primary_black100;
  border-radius: 1rem;
  background-color: transparent;
  color: c.$primary_black100;
  text-align: left;
  // Teksten til venstre og den runde tjek-boks (::after) ude til højre
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  /* Rund tjek-boks: tom cirkel, når svaret ikke er valgt.
     Samme størrelse og flueben som tjekboksene i KortFilter.vue */
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
    // Systemets skrift – samme som tjekboksen i filteret (et <input> arver ikke sidens skrift),
    // så fluebenet ser ens ud begge steder. Inter tegner ✓ anderledes
    font-family: system-ui, -apple-system, sans-serif;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }

  transition: border-color 0.2s ease, color 0.2s ease;

  /* Hover (kun med mus, og kun på svar, der ikke er valgt):
     kant, tekst og cirkel bliver blå/lilla – samme hover som i filteret og på knapperne */
  @media (hover: hover) {
    &:not([aria-pressed='true']):hover {
      border-color: c.$secondary_purple100;
      color: c.$secondary_purple100;

      &::after {
        border-color: c.$secondary_purple100;
      }
    }
  }

  /* Fremhæver det svar, brugeren har valgt. */
  &[aria-pressed='true'] {
    background-color: c.$primary_black100;
    color: c.$primary_light25;
    font-weight: 700; // Det valgte svar står med fed tekst

    // Tjek-boksen bliver blå/lilla med et lyst flueben – som i filteret
    &::after {
      content: '✓';
      background-color: c.$secondary_purple100;
      border-color: c.$secondary_purple100;
      color: c.$primary_light25;
    }
  }

  /* Viser tydeligt fokus ved brug af tastaturet. */
  &:focus-visible {
    outline: 3px solid c.$forest_pink100;
    outline-offset: 3px;
  }
}

/* Placerer teksten over fremdriftsbjælken. */
.quiz-fremdrift {
  display: flex;
  flex-direction: column;
  gap: s.$spacing-xs;
  margin-bottom: s.$spacing-m;
}

/* Spørgsmålsnummer til venstre og procent til højre på samme linje. */
.quiz-fremdrift__tekst {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Bestemmer fremdriftsbjælkens størrelse og grundfarve. */
.quiz-fremdrift progress {
  width: 100%;
  height: 0.75rem;
  border: 0;
  border-radius: 1rem;
  overflow: hidden;
  appearance: none;
  background-color: c.$forest_pink100;

  /* Farver baggrunden i Chrome og Safari. */
  &::-webkit-progress-bar {
    background-color: c.$forest_pink100;
  }

  /* Farver den udfyldte del i Chrome og Safari. */
  &::-webkit-progress-value {
    background-color: c.$primary_black100;
    border-radius: 1rem;
  }

  /* Farver den udfyldte del i Firefox. */
  &::-moz-progress-bar {
    background-color: c.$primary_black100;
    border-radius: 1rem;
  }
}

/* Viser, når en knap er deaktiveret. */
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Giver afstand over navigationen og mellem knapperne. */
.quiz-navigation {
  @include f.flex-buttons;
  margin-top: s.$spacing-m;
}

/* Næste står altid ude til højre – også på første spørgsmål, hvor Tilbage ikke vises.
   margin-left: auto skubber den så langt til højre, som der er plads */
.quiz-naeste {
  margin-left: auto;
}

/* Tilbage-knappen (.button-arrow) er sort her, da lyserød er svær at læse på den lyse quizboks */
.quiz-tilbage {
  color: c.$primary_black100;
}

/* ---------- RESULTATKORTET ---------- */

/* Delene står under hinanden med samme luft imellem */
.quiz-resultat {
  display: flex;
  flex-direction: column;
  gap: s.$spacing-m;

  p {
    margin: 0;
  }
}

/* 1. Toppen: badge, titel og tekst tæt sammen */
.resultat-top {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: s.$spacing-xs;

  h2 {
    margin: 0;
    padding: 0;
    font-size: clamp(1.75rem, 3.5vw, 2.5rem);
    font-weight: 900;
    line-height: 1.1;
  }
}

.resultat-tekst {
  font-size: 1.05rem;
  line-height: 1.6;
}

/* 2. Næste skridt: mørk boks med pil, så den skiller sig ud */
.resultat-videre {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: s.$spacing-s s.$spacing-m;
  border-radius: 0.75rem;
  background-color: c.$primary_black100;
  color: c.$primary_light25;
  font-weight: 700;
  line-height: 1.5;

  svg {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.5em; // Samme højde som første tekstlinje, så pilen flugter med den
    fill: none;
    stroke: c.$forest_pink100;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

/* 3. Beskeder til grupper og om frit fald: lyserøde bokse */
.resultat-beskeder {
  display: flex;
  flex-direction: column;
  gap: s.$spacing-xs;
}

.resultat-besked {
  padding: s.$spacing-s s.$spacing-m;
  border-left: 4px solid c.$forest_pink100;
  border-radius: 0.5rem;
  background-color: c.$forest_pink25;
  font-size: 0.95rem;
  line-height: 1.5;
}

/* 4. De to lister – ved siden af hinanden på store skærme, adskilt af en tynd streg foroven */
.resultat-info {
  display: grid;
  grid-template-columns: 1fr;
  gap: s.$spacing-m;
  padding-top: s.$spacing-m;
  border-top: 1px solid rgba(c.$primary_black100, 0.12);

  @media (min-width: 700px) {
    grid-template-columns: 1fr 1fr;
  }
}

/* Små overskrifter over listerne */
.resultat-overskrift {
  margin: 0 0 s.$spacing-xs;
  padding: 0;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: c.$primary_black75;
}

/* Listerne: egen punkt-tegning i stedet for browserens prikker.
   Nulstiller den globale ul/li-styling fra _typography.scss */
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
    font-size: 0.95rem;
    font-weight: 400;
    line-height: 1.5;

    // Lille prik foran hvert punkt
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

/* "Derfor"-listen får et lyserødt flueben i stedet for en prik */
.resultat-liste--tjek li::before {
  content: '✓';
  width: auto;
  height: auto;
  margin-top: 0;
  background: none;
  color: c.$forest_pink100;
  font-weight: 900;
}

/* 5. Knapperne: book og se banerne ved siden af hinanden */
.resultat-handlinger {
  @include f.flex-buttons;
  gap: s.$spacing-s;
}

/* Nederst: ret svar til venstre, start forfra til højre, adskilt af en tynd streg */
.resultat-bund {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: s.$spacing-s;
  padding-top: s.$spacing-s;
  border-top: 1px solid rgba(c.$primary_black100, 0.12);
}

/* Hjælpeteksten under spørgsmålet. Negativ margin trækker den tæt op under overskriften. */
.quiz-hjaelp {
  margin: -0.5rem 0 1rem;
  color: c.$primary_black75;
}

</style>