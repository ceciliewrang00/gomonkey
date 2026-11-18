<script setup>
// QUIZSIDE (BANEVÆLGEREN)
// Gæsten svarer på spørgsmål ét ad gangen og får til sidst en anbefalet første bane.
// Vises på /banequiz (via QuizView.vue).
//
// Sådan hænger det sammen:
// 1. Når siden åbnes (onMounted nederst), hentes spørgsmål og baner fra Firebase.
// 2. Brugerens svar gemmes i valgteSvar: { 'hoejde': {...valgt svar}, 'erfaring': {...}, ... }
// 3. Nogle spørgsmål vises kun ved bestemte svar (visHvis), fx vægt kun ved ja til frit fald.
//    synligeSpoergsmaal = de spørgsmål, der skal vises lige nu.
// 4. Denne fil REGNER ikke selv. Alle reglerne står i services/quizLogik.js,
//    og her kalder vi bare funktionerne derfra.
// 5. Templaten viser én af fire ting: "henter...", en fejl, ét spørgsmål eller resultatet.
//
// computed = en værdi, der regnes ud fra andre værdier og automatisk regnes ud igen,
// når de ændrer sig. Fx skifter aktivtSpoergsmaal af sig selv, når aktivtIndeks ændres.

// ref = en værdi Vue holder øje med. computed = se ovenfor. onMounted = kør, når siden er vist
import { ref, computed, onMounted } from 'vue'

// Databaseadresserne står samlet i api.js
import { SPOERGSMAAL_URL } from '@/services/api.js'

// Reglerne for anbefalingen står samlet i quizLogik.js
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
} from '@/services/quizLogik.js'

// Banerne hentes fra de fælles banedata, så anbefalingen bruger de rigtige navne og tekster
import { hentBaner } from '@/services/baner.js'


// Brugerens svar, gemt under hvert spørgsmåls id. Starter tom: {}
const valgteSvar = ref({})

// Gemmer spørgsmålene, som hentes fra Firebase.
const spoergsmaal = ref([])

// Nummeret på det spørgsmål, brugeren er nået til.
// 0 = det første spørgsmål, fordi lister i JavaScript tæller fra 0.
const aktivtIndeks = ref(0)

// true = vis resultatet i stedet for spørgsmålene
const visResultat = ref(false)

// De spørgsmål, der skal vises lige nu. filter beholder kun dem, hvor skalVises siger ja
// (skalVises tjekker visHvis og højden – se quizLogik.js).
// Ændrer man et svar, regnes listen automatisk ud igen
const synligeSpoergsmaal = computed(() => {
  return spoergsmaal.value.filter((sp) => skalVises(sp, valgteSvar.value))
})

// Det ene spørgsmål, der vises lige nu: plads nr. aktivtIndeks i listen over synlige spørgsmål
const aktivtSpoergsmaal = computed(() => {
  return synligeSpoergsmaal.value[aktivtIndeks.value]
})

// Spørgsmålets tekst, tilpasset "du", "dit barn" eller "gruppe" (se visTekst i quizLogik.js)
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

// Hvor langt man er nået, i procent (til bjælken øverst).
// Fx spørgsmål 2 af 5 = (1 + 1) / 5 * 100 = 40 %. På resultatet er det altid 100 %
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

// true, hvis ALLE synlige spørgsmål har et svar (every = "gælder det for hver eneste?")
const alleBesvaret = computed(() => {
  return (
    synligeSpoergsmaal.value.length > 0 &&
    synligeSpoergsmaal.value.every((sp) => valgteSvar.value[sp.id])
  )
})

// Banerne fra Firebase, sorteret fra let til svær
const baner = ref([])

// ---------- Resultatet ----------
// Alt herunder er computed og kalder en funktion i quizLogik.js.
// De regnes først ud, når alle spørgsmål er besvaret

// Den anbefalede bane: { bane, niveau, begraensninger } (se beregnBane i quizLogik.js)
const anbefaletBane = computed(() => {
  if (!alleBesvaret.value) {
    return null
  }
  return beregnBane(valgteSvar.value, baner.value)
})

// Overskrift og tekst til resultatet, fx "Start på Grøn" (se lavResultat i quizLogik.js)
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

// Ekstra beskeder til grupper (en liste, som kan være tom).
const gruppeBesked = computed(() =>
  lavGruppeBesked(anbefaletBane.value, valgteSvar.value, baner.value)
)

// Ekstra besked om Sort bane / frit fald.
const fritfaldBesked = computed(() => {
  if (!alleBesvaret.value) {
    return ''
  }
  return lavFritfaldBesked(anbefaletBane.value, valgteSvar.value, baner.value)
})

// Forklaring af reglen om, at førstegangsklatrere starter på en let bane (null = ikke relevant)
const foerstegangsInfo = computed(() =>
  lavFoerstegangsInfo(anbefaletBane.value, valgteSvar.value, baner.value)
)

// Regler, som er gode at kende før besøget (fx voksne med børn og max. vægt).
const godtAtVide = computed(() => lavGodtAtVide(valgteSvar.value))

// ---------- Hent data og knapper ----------

// Henter spørgsmålene til quizzen fra Firebase
async function hentSpoergsmaal() {
  try {
    // 1. HENT: Beder Firebase om spørgsmålene med fetch.
    const response = await fetch(`${SPOERGSMAAL_URL}.json`)

    // 2. TJEK: Gik det godt? Hvis ikke, "kaster" vi en fejl (throw), og så hopper koden til catch.
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

// Kører, når man klikker på et svar. Får spørgsmålets id og hele det valgte svar.
function vaelgSvar(spoergsmaalId, svar) {
  // Gem en kopi af svaret ({ ...svar } kopierer alle felterne)
  valgteSvar.value[spoergsmaalId] = { ...svar }

  // Ryd op: har det nye svar gjort, at et andet spørgsmål ikke skal vises mere,
  // så slettes svaret på det spørgsmål også – ellers ville det tælle med i resultatet.
  // Fx hvis man går tilbage og skifter fra "ja" til "nej" til frit fald.
  for (const sp of spoergsmaal.value) {
    if (!skalVises(sp, valgteSvar.value)) {
      delete valgteSvar.value[sp.id]
    }
  }
}

// "Næste": gå videre til næste spørgsmål – eller til resultatet, hvis det var det sidste.
// Har man ikke svaret endnu, sker der ingenting (return)
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

// "Tilbage": gå ét spørgsmål tilbage (men ikke længere end til det første)
function forrigeSpoergsmaal() {
  if (aktivtIndeks.value > 0) {
    aktivtIndeks.value -= 1
  }
}

// "Start forfra": slet alle svar og gå til første spørgsmål.
// Spørgsmålene er allerede hentet, så de skal ikke hentes igen
function startForfra() {
  valgteSvar.value = {}
  aktivtIndeks.value = 0
  visResultat.value = false
}

// Henter banerne (navne, beskrivelser og rækkefølge) fra de fælles banedata.
async function hentQuizBaner() {
  try {
    baner.value = await hentBaner()
  } catch (fejl) {
    fejlbesked.value = 'Banerne kunne ikke hentes. Prøv at genindlæse siden.'
    console.error('Fejl ved hentning af baner:', fejl)
  }
}

// Når quizsiden vises: hent spørgsmål og baner på samme tid (Promise.all),
// og vent, til begge er færdige, før "Henter spørgsmål..." forsvinder
onMounted(async () => {
  indlaeser.value = true
  await Promise.all([hentSpoergsmaal(), hentQuizBaner()])
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

    <!-- Desktop: introen til venstre og quizzen til højre. Mobil: under hinanden -->
    <!-- Når resultatet vises, skjules introen, og resultatkortet får hele bredden -->
    <div class="quiz-kolonne" :class="{ 'quiz-kolonne--resultat': visResultat }">

    <section v-if="!visResultat" class="quiz-intro">
        <!-- Introducerer banevælgeren. -->
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

    <!-- Vises, mens spørgsmål og baner hentes. -->
    <p v-if="indlaeser" class="quiz-status">Henter spørgsmål...</p>

    <!-- Vises, hvis data ikke kunne hentes. -->
    <p v-else-if="fejlbesked" class="quiz-status">{{ fejlbesked }}</p>

    <!-- Vises, hvis databasen er tom. -->
    <p v-else-if="spoergsmaal.length === 0" class="quiz-status">
      Der er endnu ingen spørgsmål i quizzen.
    </p>

    <!-- Viser resultatet i en lys boks. -->
    <!-- Opbygning: top (titel + tekst) → næste skridt → beskeder → to lister → knapper -->
    <!-- Resultatkortet får den anbefalede banes farve (--bane-farve) i toppen -->
    <section
      v-else-if="visResultat"
      class="quiz-kort quiz-resultat"
      :class="anbefaletBane ? `bane--${anbefaletBane.bane.id}` : ''"
    >
      <!-- Desktop: to kolonner, så kortet kan være på skærmen uden at scrolle.
           Venstre (resultat-hoved): anbefalingen, næste skridt og knapperne.
           Højre (resultat-detaljer): beskeder og de to lister.
           Mobil: alt under hinanden, med knapperne nederst -->
      <div class="resultat-hoved">

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
          <h2>
            <!-- Prik i banens farve foran navnet -->
            <span class="resultat-prik" aria-hidden="true"></span>
            {{ resultat.titel }}
          </h2>
          <p class="resultat-tekst">{{ resultat.tekst }}</p>
          <!-- Link til den anbefalede banes kort på forsiden, lige under beskrivelsen af banen -->
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
        <!-- Førstegangsklatrere: forklarer GoMonkeys regel om at starte på en let bane -->
        <div v-if="foerstegangsInfo" class="resultat-regel">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M12 11v6M12 7.5v.01" /></svg>
          <div>
            <h3 class="resultat-regel__titel">{{ foerstegangsInfo.titel }}</h3>
            <p class="resultat-regel__tekst">{{ foerstegangsInfo.tekst }}</p>
          </div>
        </div>

        <p v-if="videre" class="resultat-videre">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          <span>{{ videre }}</span>
        </p>
        </div>
      </template>

      <!-- 5. Bundlinjen: ret svarene eller start forfra (står nederst – se order i CSS) -->
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
      <h4>{{ aktivTekst }}</h4>

      <!-- Kort forklaring under spørgsmålet, hvis der er en. -->
      <p v-if="aktivHjaelp" class="quiz-hjaelp">{{ aktivHjaelp }}</p>

      <!-- Placerer svarmulighederne i en lodret liste. -->
      <div class="quiz-svar">
        <!-- Én knap pr. svar. Klik gemmer svaret (vaelgSvar).
             aria-pressed = true på det valgte svar. CSS'en bruger det til at farve knappen,
             og skærmlæsere siger "valgt" -->
        <button
          v-for="svarItem in aktivtSpoergsmaal.svar"
          :key="svarItem.id"
          type="button"
          class="quiz-svarknap text"
          :aria-pressed="valgteSvar[aktivtSpoergsmaal.id]?.id === svarItem.id"
          @click="vaelgSvar(aktivtSpoergsmaal.id, svarItem)"
        >
          <!-- Viser svarteksten – i barn- eller gruppeform, hvis den findes (se visSvarTekst). -->
          {{ visSvarTekst(svarItem, valgteSvar) }}
        </button>
      </div>

      <!-- Bekræfter brugerens valgte svar. -->
      <p v-if="valgteSvar[aktivtSpoergsmaal.id]" class="quiz-valgt">
        Du har valgt: {{ visSvarTekst(valgteSvar[aktivtSpoergsmaal.id], valgteSvar) }}
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

        <!-- "Næste" er grå (disabled), indtil man har valgt et svar. -->
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
/* Henter farver, flex-hjælpere og afstande fra de fælles style-filer.
   .. går én mappe op (fra components til src), hvor assets ligger. */
@use '../assets/styles/colors' as c;
@use '@/assets/styles/flex' as f;
@use '@/assets/styles/spacings' as s;

/* Giver quizsiden baggrundsfarve */
// Fylder skærmen under headeren (ca. 5rem), og indholdet står lodret i midten,
// så der er lige meget luft over og under quizzen, når siden åbnes
.quiz-side {
  position: relative; // Så krydset placeres i forhold til quizsiden
  display: flex;
  align-items: center;
  min-height: calc(100dvh - 5rem);
  background-color: c.$forest_green25;

  .quiz-kolonne {
    flex: 1;
  }

  // Desktop: kolonnerne fylder hele højden, og hver kolonne centreres for sig
  // (se .quiz-kolonne). Så rykker introen ikke, når kortet til højre skifter højde
  @media (min-width: 1000px) {
    align-items: stretch;
  }
}

/* Lukkekryds øverst til højre. Udseendet kommer fra .button-close i _buttons.scss */
.quiz-luk {
  position: absolute;
  top: s.$spacing-s;
  right: s.$spacing-m;
  z-index: 2;
}

/* Siden: samme sidepadding og bredde som forsidens sektioner (.forside > section i main.scss).
   Mobil: intro og quiz under hinanden. Desktop: intro til venstre, quiz til højre */
.quiz-kolonne {
  display: grid;
  grid-template-columns: 1fr;
  gap: s.$spacing-l;
  padding: s.$sektion-luft 0;
  padding-inline: max(s.$spacing-m, calc((100% - #{s.$indhold-bredde}) / 2));

  @media (min-width: 1000px) {
    grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
    // Mindre luft over og under end på forsiden, så resultatkortet kan være på skærmen
    padding-block: s.$spacing-l;
    // Rækken er lige så høj som skærmen, så introen står det samme sted,
    // uanset hvor højt kortet er
    align-items: center;
    column-gap: s.$spacing-xxl;
  }
}

/* Intro: badge, overskrift, tekst og tre punkter.
   Desktop: står fast i venstre side, mens man svarer (sticky) */
.quiz-intro {
  @include f.flex-column;
  align-items: flex-start;
  padding: 0; // Nulstiller section-padding fra main.scss
  margin: 0;

  h1 {
    font-size: clamp(2.25rem, 4.5vw, 3.5rem);
    line-height: 1.05;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0; // Fjerner browserens standard-margin
    font-size: 16px;
  }

  @media (min-width: 1000px) {
    position: sticky;
    top: 6rem;
  }
}

/* De tre punkter under introen: lille mørkegrøn prik med flueben */
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
    font-size: 0.95rem;
    font-weight: 500;
    line-height: 1.4;

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

/* Statusbeskeder (indlæser, fejl, tom quiz) bruger samme boks som quizkortet (se .quiz-kort) */

/* Lille, dæmpet hjælpetekst, fx "Spørgsmål 1 af 5" og "Dit resultat". */
.quiz-meta {
  display: block;
  font-size: 0.875rem;
  color: c.$primary_black75;
}

/* Quizkortet: lys boks med blød skygge, så det står frem fra den grønne baggrund */
.quiz-kort,
.quiz-status {
  margin: 0;
  padding: s.$spacing-l ;
  background-color: c.$primary_light25;
  border-radius: 1rem;
  box-shadow: 0 1rem 2.5rem rgba(c.$primary_darkgreen, 0.12);
}


/* Svarene under hinanden på mobil, i 2 kolonner på større skærme. */
.quiz-svar {
  display: grid;
  grid-template-columns: 1fr;
  gap: s.$spacing-xs;

  // Alle rækker er lige høje (lige så høje som det længste svar),
  // så boksene er ens, uanset hvor lang teksten er
  grid-auto-rows: 1fr;

  @media (min-width: 700px) {
    grid-template-columns: 1fr 1fr;

    // Ved et ulige antal svar (fx Ja / Måske / Nej) fylder det sidste hele bredden,
    // så der ikke står et tomt hul ved siden af det
    .quiz-svarknap:last-child:nth-child(odd) {
      grid-column: 1 / -1;
    }
  }
}


.quiz-kort h4 {
  padding-bottom: 25px;
font-weight: 900;
}

/* Giver svarknapperne afrundede kanter og venstrestillet tekst. */
.quiz-svarknap {
  width: 100%;
  // Samme mindstehøjde for alle bokse – også dem med korte svar som "Ja"
  min-height: 3.5rem;
   padding:0.5rem 1.5rem;
   line-height: 1.4;
    font-size: 16px;
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

  transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;

  // Hover (kun med mus, og kun på svar, der ikke er valgt):
  // boksen får en svag lyserød baggrund, og cirklen bliver lyserød –
  // et lille forvarsel om, hvordan det ser ud, når svaret er valgt
  @media (hover: hover) {
    &:not([aria-pressed='true']):hover {
      background-color: c.$forest_pink25;

      &::after {
        border-color: c.$forest_pink100;
        background-color: c.$primary_light25;
      }
    }
  }

  /* Fremhæver det svar, brugeren har valgt. */
  &[aria-pressed='true'] {
    background-color: c.$primary_black100;
    color: c.$primary_light25;
    font-weight: 700; // Det valgte svar står med fed tekst

    // Tjek-boksen bliver lyserød med et mørkt flueben
    &::after {
      content: '✓';
      background-color: c.$forest_pink100;
      border-color: c.$forest_pink100;
      color: c.$primary_black100;
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
/* "Du har valgt: …" – lille og kursiv, så den ikke tager fokus fra svarene */
.quiz-valgt {
  font-size: 14px;
  font-style: italic;
}

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

/* Delene står under hinanden med samme luft imellem.
   En stribe i den anbefalede banes farve øverst (--bane-farve sættes af bane--<id> nedenfor) */
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

/* Kolonnerne i resultatkortet.
   Mobil: display: contents gør, at indpakningerne "forsvinder", så delene står direkte
   under hinanden i kortet. order: 1 flytter bundlinjen med knapperne helt ned.
   Desktop: to kolonner side om side, adskilt af en tynd lodret streg */
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

    // Mangler resultatet (fejl i data), er der kun én kolonne
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

  // Bundlinjen står nederst i venstre kolonne
  .resultat-fod {
    margin-top: auto;
  }

  .resultat-detaljer {
    padding-left: s.$spacing-xl;
    border-left: 1px solid rgba(c.$primary_black100, 0.12);
  }
}

// Resultatet fylder hele bredden, så der skal være plads over kortet til lukkekrydset
.quiz-kolonne--resultat {
  padding-top: 4.5rem;
}

// Banefarverne fra $kort-bane-farver i _colors.scss – samme farver som på kortet og forsiden
@each $id, $farve in c.$kort-bane-farver {
  .bane--#{$id} {
    --bane-farve: #{$farve};
  }
}

// Prik i banens farve foran "Start på …"
.resultat-prik {
  display: inline-block;
  width: 0.8em;
  height: 0.8em;
  margin-right: 0.15em;
  border-radius: 50%;
  background-color: var(--bane-farve, #{c.$primary_darkgreen});
  vertical-align: 0.02em;
}

/* Reglen for førstegangsklatrere og næste skridt, tæt under hinanden */
.resultat-naeste {
  display: flex;
  flex-direction: column;
  gap: s.$spacing-xs;
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
  font-size: 1rem;
  line-height: 1.55;
}

/* 2. Næste skridt: mørk boks med pil, så den skiller sig ud */
.resultat-videre {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem s.$spacing-s;
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

/* Reglen for førstegangsklatrere: lys boks med info-ikon og tynd mørk kant */
.resultat-regel {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 2px solid c.$primary_black100;
  border-radius: 0.75rem;

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

.resultat-regel__titel {
  margin: 0;
  padding: 0;
  font-size: 1rem;
  font-weight: 800;
}

.resultat-regel__tekst {
  margin: 0.25rem 0 0;
  font-size: 0.95rem;
  line-height: 1.5;
}

/* 3. Beskeder til grupper og om frit fald: lyserøde bokse */
.resultat-beskeder {
  display: flex;
  flex-direction: column;
  gap: s.$spacing-xs;
}

.resultat-besked {
  padding: 0.75rem 1rem;
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
  padding-top: s.$spacing-s;
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

/* "Se Grøn →" under banens beskrivelse – sort og fed, så den ses på den lyse boks */
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

/* Ret svar til venstre, start forfra til højre */
.resultat-bund {
  display: flex;
  flex-wrap: wrap;
  align-items: center; // Linket og knappen flugter, selvom knappen er højere
  justify-content: space-between;
  gap: s.$spacing-m;
}

/* Hjælpeteksten under spørgsmålet. Negativ margin trækker den tæt op under overskriften. */
.quiz-hjaelp {
  margin: -1.2rem 0 2rem;
  color: c.$primary_black75;
  font-size: 16px;
}

</style>