<script setup>
// Importerer værktøjer til data, beregninger og opstart.
import { ref, computed, onMounted } from 'vue'

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
const synligeSpoergsmaal = computed(() => {
  // filter beholder kun de spørgsmål, hvor betingelsen nedenfor er true.
  return spoergsmaal.value.filter((sp) => {
    // Spørgsmål uden en visHvis-betingelse vises altid.
    if (!sp.visHvis) {
      return true
    }

    // Finder brugerens svar på det spørgsmål, betingelsen handler om.
    const svar = valgteSvar.value[sp.visHvis.spoergsmaalId]

    // Viser kun spørgsmålet, hvis det valgte svar har det krævede id.
    return svar?.id === sp.visHvis.svarId
  })
})

// Finder det spørgsmål, der skal vises lige nu.
const aktivtSpoergsmaal = computed(() => {
  // Henter spørgsmålet på den aktuelle placering i den synlige liste.
  return synligeSpoergsmaal.value[aktivtIndeks.value]
})

// Beregner, hvor langt brugeren er nået gennem spørgsmålene.
const fremdrift = computed(() => {
  // Returnerer 0, hvis der endnu ikke er nogen synlige spørgsmål.
  if (synligeSpoergsmaal.value.length === 0) {
    return 0
  }

  // Resultatsiden betyder, at quizzen er afsluttet.
  if (visResultat.value) {
    return 100
  }

  // Beregner procentdelen ud fra det aktuelle spørgsmåls placering.
  // Math.round afrunder til et helt tal.
  return Math.round(
    ((aktivtIndeks.value + 1) / synligeSpoergsmaal.value.length) * 100
  )
})

// Er true, mens spørgsmålene bliver hentet.
const indlaeser = ref(true)

// Gemmer en fejlbesked. Starter uden en besked.
const fejlbesked = ref('')

// Beregner kun point fra synlige pointspørgsmål.
const samledePoint = computed(() => {
  // Beholder spørgsmål med typen point.
  // Højde, vægt og frit fald tæller derfor ikke med.
  const pointSpoergsmaal = synligeSpoergsmaal.value.filter(
    (sp) => sp.type === 'point'
  )

  // Gennemgår pointspørgsmålene og lægger deres svarpoint sammen.
  return pointSpoergsmaal.reduce((total, sp) => {
    // Finder brugerens svar til dette spørgsmål.
    const svar = valgteSvar.value[sp.id]

    // Bruger 0, hvis spørgsmålet endnu ikke er besvaret.
    return total + (svar?.point ?? 0)
  }, 0)
})

// Tæller kun besvarede spørgsmål, som aktuelt er synlige.
const antalBesvarede = computed(() => {
  // Finder de synlige spørgsmål, som har et gemt svar.
  const besvarede = synligeSpoergsmaal.value.filter(
    (sp) => valgteSvar.value[sp.id]
  )

  // Returnerer antallet af besvarede, synlige spørgsmål.
  return besvarede.length
})

// Kontrollerer, om alle synlige spørgsmål er besvaret.
const alleBesvaret = computed(() => {
  // Kræver mindst ét synligt spørgsmål og et svar på hvert.
  return (
    synligeSpoergsmaal.value.length > 0 &&
    antalBesvarede.value === synligeSpoergsmaal.value.length
  )
})

// Beregner anbefalingen ud fra højde, forudsætninger og point.
// Pointgrænserne og begrænsningerne er vores foreløbige quizmodel.
const anbefaletBane = computed(() => {

// Venter, indtil alle spørgsmål er besvaret og pointgrænserne er hentet.
if (!alleBesvaret.value || !baneGraenser.value) {
  return ''
}

  // Henter højden fra brugerens valgte højdeinterval.
  const hoejde = valgteSvar.value.hoejde?.minimumHoejde

  // Henter pointene fra svaret om højdetryghed.
  const tryghed = valgteSvar.value.tryghed?.point

  // Henter pointene fra svaret om erfaring.
  const erfaring = valgteSvar.value.erfaring?.point

  // Kontrollerer, om de nye spørgsmål er tilgængelige og besvaret.
  // ?. ovenfor giver undefined, hvis et svar mangler.
  if (
    hoejde === undefined ||
    tryghed === undefined ||
    erfaring === undefined
  ) {
    // Vises midlertidigt, mens databasen stadig har de gamle spørgsmål.
    return 'Afventer de nye quizspørgsmål'
  }

  // Giver ingen baneanbefaling under minimumshøjden i jeres udkast.
  if (hoejde < 110) {
    return 'Ingen baneanbefaling – undersøg mulighederne med Go Monkey'
  }

  // Begrænser anbefalingen til grøn ved højde under 140 cm.
  if (hoejde < 140) {
    return 'Grøn bane'
  }

  // Anbefaler grøn som startbane til gæster, der er utrygge ved højder.
  if (tryghed <= 1) {
    return 'Grøn bane'
  }

// Anbefaler grøn, hvis pointene er under administratorens grænse for blå.
if (samledePoint.value < baneGraenser.value.blaaFra) {
  return 'Grøn bane'
}

// Rød kræver mindst 160 cm, tryghed, erfaring og administratorens pointgrænse.
// && betyder, at alle betingelser skal være opfyldt.
  if (
    hoejde >= 160 &&
    tryghed >= 2 &&
    erfaring >= 2 &&
    samledePoint.value >= baneGraenser.value.roedFra
  ) {
    return 'Rød bane'
  }

  // De øvrige besvarelser, som når hertil, anbefales blå.
  return 'Blå bane'
})

// Vælger en forklaring, som passer til den beregnede startbane.
const resultatBeskrivelse = computed(() => {
  // Forklarer, hvorfor grøn er et passende sted at begynde.
  if (anbefaletBane.value === 'Grøn bane') {
    return 'Vi anbefaler, at du starter på grøn. Dine svar eller dit højdeinterval peger på dette som et passende udgangspunkt. Her kan du begynde roligt og lære udstyret at kende.'
  }

  // Forklarer, hvorfor blå er blevet valgt.
  if (anbefaletBane.value === 'Blå bane') {
    return 'Vi anbefaler, at du starter på blå. Dine svar viser, at du er tryg ved højder, og quizmodellen peger på blå som et passende startniveau frem for rød.'
  }

  // Forklarer anbefalingen og opfordrer til at mærke efter.
  if (anbefaletBane.value === 'Rød bane') {
    return 'Dine svar viser erfaring, tryghed ved højder og ønske om udfordring. Quizzen peger derfor på rød. Er det dit første besøg, anbefaler vi, at du først mærker efter på en lettere bane.'
  }

  // Viser ingen ekstra forklaring, hvis der ikke anbefales en bane.
  return ''
})

// Beregner en særskilt besked om frit fald.
const fritfaldBesked = computed(() => {
  // Venter, til alle synlige spørgsmål er besvaret.
  if (!alleBesvaret.value) {
    return ''
  }

  // Viser kun en ekstra besked, hvis gæsten har valgt adrenalinsus.
  if (valgteSvar.value.oplevelse?.id !== 'o4') {
    return ''
  }

  // Finder gæstens svar om frit fald.
  const fritfaldSvar = valgteSvar.value.fritfald?.id

  // Giver ingen ekstra besked, hvis gæsten har svaret nej.
  if (fritfaldSvar === 'ff1') {
    return ''
  }

  // Henviser til en instruktør, hvis gæsten vil vide mere.
  if (fritfaldSvar === 'ff2') {
    return 'Du vil gerne vide mere om frit fald. Spørg en instruktør om aktiviteten og dens krav.'
  }

  // Finder højden fra det valgte højdeinterval.
  const hoejde = valgteSvar.value.hoejde?.minimumHoejde

  // Kontrollerer, om gæsten har bekræftet minimumsvægten.
  const opfylderVaegt =
    valgteSvar.value.vaegt?.opfylderMinimum === true

  // Undlader at foreslå aktiviteten, hvis højdekravet i udkastet ikke er opfyldt.
  if (hoejde === undefined || hoejde < 160) {
    return 'Du har vist interesse for frit fald, men opfylder ikke højdekravet i quizzen.'
  }

  // Undlader at foreslå aktiviteten, hvis minimumsvægten ikke er bekræftet.
  if (!opfylderVaegt) {
    return 'Quizzen kan ikke foreslå frit fald, fordi minimumsvægten ikke er bekræftet. Spørg en instruktør.'
  }

  // Finder pointene for højdetryghed.
  const tryghed = valgteSvar.value.tryghed?.point

  // Vores foreløbige quizregel kræver, at gæsten er tryg ved højder.
  if (tryghed === undefined || tryghed < 2) {
    return 'Du har vist interesse for frit fald, men er utryg ved højder. Tal med en instruktør, før du overvejer aktiviteten.'
  }

  // Beskriver en mulig ekstra aktivitet uden at erstatte startbanen.
  return 'Du har også vist interesse for sort/frit fald og opfylder de højde- og minimumsvægtkrav, quizzen kontrollerer. Tal med en instruktør om de øvrige krav, før du beslutter dig.'
})

// Henter pointgrænserne, som administratoren har gemt.
async function hentBaneGraenser() {
  try {
    // Sender et GET-kald til pointgrænserne i Firebase.
    const response = await fetch(
      'https://gomonkey-quiz-default-rtdb.europe-west1.firebasedatabase.app/baneGraenser.json'
    )

    // Stopper, hvis Firebase ikke svarer med succes.
    if (!response.ok) {
      throw new Error('Hentning fejlede med status ' + response.status)
    }

    // Omdanner JSON-svaret til JavaScript-data.
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

    // Gemmer de kontrollerede pointgrænser.
    baneGraenser.value = data
  } catch (fejl) {
    // Viser en fejlbesked i stedet for at bruge ukendte grænser.
    fejlbesked.value =
      'Quizindstillingerne kunne ikke hentes. Prøv at genindlæse siden.'

    // Viser den tekniske fejl i konsollen.
    console.error('Fejl ved hentning af pointgrænser:', fejl)
  }
}






// Henter spørgsmålene til quizzen.
async function hentSpoergsmaal() {
  try {
    // 1. HENT: Ber Firebase hente spørgsmålene med fetch - gir adresse.
    const response = await fetch(
      'https://gomonkey-quiz-default-rtdb.europe-west1.firebasedatabase.app/spoergsmaal.json'
    )

    // 2. TJEK: Lykkedes kaldet? Hvis ikke, send til catch - fanger fejlen.
    if (!response.ok) { 
      throw new Error('Firebase svarede med status ' + response.status)
    }

    // 3. LÆS: Læs indholdet som JavaScript-data.
    // FB semder spg i formatet JSON - .json læser og omdanner til JS-data
    // Gør spørgsmålene fra Firebase klar til brug i JavaScript.
    const data = await response.json()

    // 4. LISTE: Saml spørgsmålene og lav det om til en liste.
    // Hvis databasen er tom (data ?? {}), bruger den en tomt objekt - tom liste.
    // -> Så den ikke giver fejl
    const liste = Object.values(data ?? {})

    // 5. SORTÉR: Brug spørgsmålenes rækkefølge fra databasen.
    liste.sort((a, b) => (a.raekkefoelge ?? 0) - (b.raekkefoelge ?? 0))

    // 6. GEM: Læg listen i den variabel, Vue viser spørgsmålene fra.
    spoergsmaal.value = liste
  } catch (fejl) {
    // 7. FEJL: Fortæl brugeren, at spørgsmålene ikke kunne hentes.
    fejlbesked.value =
      'Spørgsmålene kunne ikke hentes. Prøv at genindlæse siden.'

    // Vis den tekniske fejl i konsollen til fejlfinding.
    console.error('Fejl ved hentning af spørgsmål:', fejl)
  }
}






// Modtager spørgsmålets id og hele den valgte svarmulighed.
function vaelgSvar(spoergsmaalId, svar) {
  // Gemmer en kopi af det valgte svar.
  valgteSvar.value[spoergsmaalId] = { ...svar }

  // Gennemgår spørgsmålene i deres sorterede rækkefølge.
  for (const sp of spoergsmaal.value) {
    // Kontrollerer kun spørgsmål med en visHvis-betingelse.
    if (sp.visHvis) {
      // Finder svaret på det spørgsmål, som styrer synligheden.
      const styrendeSvar = valgteSvar.value[sp.visHvis.spoergsmaalId]

      // Kontrollerer, om det nødvendige svar stadig er valgt.
      const skalVises = styrendeSvar?.id === sp.visHvis.svarId

      // Hvis spørgsmålet skal skjules, fjernes et eventuelt gemt svar.
      if (!skalVises) {
        // delete fjerner spørgsmålets svar fra objektet.
        delete valgteSvar.value[sp.id]
      }
    }
  }
}

// Går videre, når det aktuelle spørgsmål er besvaret.
function naesteSpoergsmaal() {
  // Finder spørgsmålet, som brugeren ser lige nu.
  const sp = aktivtSpoergsmaal.value

  // Stopper, hvis spørgsmålet mangler eller ikke er besvaret.
  if (!sp || !valgteSvar.value[sp.id]) {
    return
  }

  // Kontrollerer, om der er flere synlige spørgsmål efter dette.
  if (aktivtIndeks.value < synligeSpoergsmaal.value.length - 1) {
    // Flytter én plads frem i listen.
    aktivtIndeks.value += 1
  } else if (alleBesvaret.value) {
    // Viser resultatet efter sidste spørgsmål, når alle er besvaret.
    visResultat.value = true
  }
}

// Går tilbage til det forrige spørgsmål.
function forrigeSpoergsmaal() {
  // Sikrer, at vi ikke går længere tilbage end første spørgsmål.
  if (aktivtIndeks.value > 0) {
    // Flytter én plads tilbage i listen.
    aktivtIndeks.value -= 1
  }
}

// Starter en ny quiz med de spørgsmål, der allerede er hentet.
function startForfra() {
  // Fjerner alle brugerens tidligere svar.
  valgteSvar.value = {}

  // Går tilbage til første spørgsmål.
  aktivtIndeks.value = 0

  // Skjuler resultatet og viser quizzen igen.
  visResultat.value = false
}

// Starter hentningen, når quizsiden er klar.
onMounted(async () => {
  // Viser indlæsningsbeskeden.
  indlaeser.value = true

  // Starter begge API-kald og venter, til begge er afsluttet.
  // Funktionerne håndterer selv eventuelle fejl.
  await Promise.all([
    hentSpoergsmaal(),
    hentBaneGraenser(),
  ])

  // Skjuler først indlæsningsbeskeden, når begge kald er færdige.
  indlaeser.value = false
})

</script>

<template>
  <!-- Samler sidens primære indhold. -->
  <main class="quiz-side">

    <section>
        <!-- Introducerer banevælgeren. -->
        <h1>Find den rette bane for dig</h1>
        <p>
        Svar på fem korte spørgsmål, så hjælper vi dig med at finde en startbane.
        Der kan komme ekstra spørgsmål om frit fald.
        </p>
    </section>

    <!-- Vises, mens spørgsmål og pointgrænser hentes. -->
    <p v-if="indlaeser">Henter spørgsmål...</p>

    <!-- Vises, hvis et API-kald mislykkes. -->
    <p v-else-if="fejlbesked">{{ fejlbesked }}</p>

    <!-- Vises, hvis databasen er tom. -->
    <p v-else-if="spoergsmaal.length === 0">
      Der er endnu ingen spørgsmål i quizzen.
    </p>

    <!-- Viser resultatet i en lys boks. -->
    <section v-else-if="visResultat" class="quiz-kort quiz-resultat">
      <!-- Viser den anbefalede startbane. -->
      <h2>Dit resultat</h2>
      <p>{{ anbefaletBane }}</p>

      <!-- Viser begrundelsen for anbefalingen. -->
      <p v-if="resultatBeskrivelse">{{ resultatBeskrivelse }}</p>

      <!-- Viser en ekstra besked om frit fald, hvis den findes. -->
      <p v-if="fritfaldBesked">{{ fritfaldBesked }}</p>

      <!-- Viser den samlede pointsum. -->
      <p>Samlede point: {{ samledePoint }}</p>

      <!-- Samler resultatets knapper med afstand mellem dem. -->
      <div class="quiz-navigation">
        <!-- Åbner det sidste spørgsmål uden at slette svarene. -->
        <button
          type="button"
          class="button-secondary"
          @click="visResultat = false"
        >
          Tilbage til mine svar
        </button>

        <!-- Nulstiller svarene og åbner første spørgsmål. -->
        <button
          type="button"
          class="button-primary"
          @click="startForfra"
        >
          Start forfra
        </button>
      </div>
    </section>

    <!-- Viser kun det aktuelle spørgsmål. -->
    <section v-else-if="aktivtSpoergsmaal" class="quiz-kort">
      <!-- Samler fremdriftsbjælken og procenttallet. -->
      <div class="quiz-fremdrift">
        <!-- Viser fremdriften med 100 som maksimum. -->
        <progress
          :value="fremdrift"
          max="100"
          aria-label="Fremdrift gennem quizzen"
        ></progress>

        <!-- Viser fremdriften som procent. -->
        <span class="text">{{ fremdrift }}%</span>
      </div>

      <!-- Viser spørgsmålets nummer og antal synlige spørgsmål. -->
      <p>
        Spørgsmål {{ aktivtIndeks + 1 }} af {{ synligeSpoergsmaal.length }}
      </p>

      <!-- Viser teksten til det aktive spørgsmål. -->
      <h2>{{ aktivtSpoergsmaal.tekst }}</h2>

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
        <button
          v-if="aktivtIndeks > 0"
          type="button"
          class="button-secondary"
          @click="forrigeSpoergsmaal"
        >
          Tilbage
        </button>

        <!-- Kræver et svar, før brugeren kan gå videre. -->
        <button
          type="button"
          class="button-primary"
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
  </main>
</template>

<style scoped lang="scss">
/* .. går én mappe op fra views til src, hvor assets ligger. */
@use '../assets/styles/colors' as c;
@use '@/assets/styles/flex' as f;
@use '@/assets/styles/spacings' as s;

/* Giver quizsiden baggrundsfarve */
.quiz-side {
  background-color: c.$forest_green25;
  min-height: 100vh;
  padding-bottom: 2rem;
}

/* Viser spørgsmålet i en centreret, lys boks. */
.quiz-kort {
  max-width: 42rem;
  margin: 0rem auto;
  padding: s.$spacing-xxl s.$spacing-m;
  background-color: c.$primary_light25;
  border-radius: 1rem;
}

/* Giver afstand mellem spørgsmålet og svarmulighederne. */
h2 {
  margin-bottom: 1rem;
}

/* Placerer svarene under hinanden med mellemrum. */
.quiz-svar {
    @include f.flex-column;
}

/* Giver svarknapperne afrundede kanter og venstrestillet tekst. */
.quiz-svarknap {
  width: 100%;
  padding: 0.85rem 1rem;
  border: 1px solid c.$forest_green75;
  border-radius: 1rem;
  background-color: transparent;
  color: c.$primary_black100;
  text-align: left;

  /* Fremhæver knappen, når musen er over den. */
  &:hover {
    background-color: c.$forest_pink25;
  }

  /* Fremhæver det svar, brugeren har valgt. */
  &[aria-pressed='true'] {
    background-color: c.$primary_black100;
    color: c.$primary_light25;
  }

  /* Viser tydeligt fokus ved brug af tastaturet. */
  &:focus-visible {
    outline: 3px solid c.$forest_pink100;
    outline-offset: 3px;
  }
}

/* Placerer fremdriftsbjælken og procenttallet ved siden af hinanden. */
.quiz-fremdrift {
    display: flex;
    flex-direction: row;
    gap: s.$spacing-xs;
    align-items: center;
}

/* Bestemmer fremdriftsbjælkens størrelse og grundfarve. */
.quiz-fremdrift progress {
  flex: 1;
  min-width: 0;
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
  margin-top: 2rem;
}

/* Fremhæver resultatets overskrift. */
.quiz-resultat h2 {
  font-weight: 900;
}
</style>