<script setup>
// KORTFILTER
// Sidebaren til venstre for kortet, hvor man vælger, hvilke baner der skal fremhæves.
// Banerne hentes fra Firebase og vises i tre grupper: grøn, blå og svære.
// Alle baner er synlige med det samme, og kortet opdateres, så snart man sætter et flueben
// (de valgte bane-id'er sendes til KortView.vue med emit).
// På mobil er filteret skjult bag en "Filtre"-knap og glider ind fra venstre.

import { ref, computed, watch, onMounted } from 'vue'

// Databaseadresserne står samlet i api.js
import { KORTFILTER_URL } from '@/services/api.js'

// Beskeden, der sendes op til KortView.vue med det nye filter
const emit = defineEmits(['filter-changed'])

// Id'erne på de baner, der er sat flueben ved, fx ['gron-1', 'rod']
const valgteFiltre = ref([])

// Er filteret åbent på mobil?
const erAaben = ref(false)

// Alle baner/grupper fra Firebase
const banerListe = ref([])

// true, mens banerne hentes ("Henter baner...")
const indlaeser = ref(true)



//---------------------------------HENT DATA----------------------------------------------------------------------------

//Gemmer adressen til Firebase-databasen, så den kan genbruges i API-kaldet
const databaseUrl = `${KORTFILTER_URL}.json`


// API-kald med fetch(), som henter data fra ekstern database
async function hentBaner() {
  try {
    const response = await fetch(databaseUrl)

// Svaret fra API'et omdannes til JSON-format,
// Det gør så dataene kan bruges som JavaScript-objekter i komponenten
    const data = await response.json()

//-------------------------------------------------------------------------------------------------------------


//-------------------------------------DATA ER MODTAGET------------------------------------------------------------------------
 // Når data er hentet:
  // Tjekkes der først om der faktisk er modtaget data fra databasen
    if (data) {

  // Hvis data kommer som et array, fjernes eventuelle tomme værdier
      if (Array.isArray(data)) {
        banerListe.value = data.filter(item => item !== null && item !== undefined)

  // Hvis data kommer som et objekt, omdannes det til et array
      } else {
        banerListe.value = Object.values(data)
      }
    }

    // Hvis API-kaldet fejler vises der en fejlbesked i konsollen
  } catch (fejl) {
    console.error('Fejl ved hentning af banedata fra Firebase:', fejl)
//-------------------------------------------------------------------------------------------------------------

//-------------------------------------------------------------------------------------------------------------

  // Kører altid til sidst, uanset om API-kaldet lykkedes eller fejlede.
  // Stopper loading-tilstanden, så brugeren ikke længere ser "Henter baner..."
  } finally {
    indlaeser.value = false
  }
}
// onMounted kører automatisk, når komponenten bliver vist på siden.
// Her kaldes hentBaner(), så banedataene hentes med det samme,
onMounted(() => {
  hentBaner()
})
//-------------------------------------------------------------------------------------------------------------


//-----------------------------------GRUPPERNE--------------------------------------------------------------------------

// Listen fra Firebase indeholder både hovedgrupper (fx id 'gron') og
// underpunkter (fx 'gron-1', markeret med underpunkt: true).
// Her beskrives, hvilke baner der hører til hvilken gruppe.
// Bounce ligger under grøn, og sort (frit fald) ligger under svære baner
const GRUPPER = [
  { id: 'gron', hoererTil: b => b.id === 'bounce' || (b.underpunkt === true && b.id.startsWith('gron')) },
  { id: 'bla', hoererTil: b => b.underpunkt === true && b.id.startsWith('bla') },
  { id: 'svaer', hoererTil: b => b.underpunkt === true && (b.id === 'rod' || b.id === 'sort') },
]

// computed regner grupperne ud igen af sig selv, når banerListe ændrer sig.
// Hver gruppe får sin overskrift (hoved) og sine baner. Grupper uden data springes over
const grupper = computed(() =>
  GRUPPER
    .map(g => ({
      id: g.id,
      hoved: banerListe.value.find(b => b.id === g.id),
      baner: banerListe.value.filter(g.hoererTil),
    }))
    .filter(g => g.hoved && g.baner.length > 0)
)

// Antal baner i alt (bruges i knappen på mobil)
const antalBaner = computed(() => grupper.value.reduce((sum, g) => sum + g.baner.length, 0))
//-------------------------------------------------------------------------------------------------------------


//-----------------------------------FILTER FUNKTIONERNE--------------------------------------------------------------------------

// Kortet opdateres med det samme, når valget ændrer sig – der er ingen "Anvend"-knap.
// Er intet valgt, sendes 'alle', så alle baner vises
watch(valgteFiltre, (valgte) => {
  emit('filter-changed', valgte.length === 0 ? 'alle' : [...valgte])
})

// Sætter eller fjerner flueben ved én bane
function vaelgBane(id, checked) {
  if (checked) {
    if (!valgteFiltre.value.includes(id)) {
      valgteFiltre.value = [...valgteFiltre.value, id]
    }
  } else {
    valgteFiltre.value = valgteFiltre.value.filter(f => f !== id)
  }
}

// "Vis alle" og "Ryd filtre" tømmer listen, så alle baner vises igen
function nulstilFilter() {
  valgteFiltre.value = []
}

//Funktion der skifter status for mobilmenuen mellem åben og lukket, alt efter hvad den er i forvejen
function togglerFilter() {
  erAaben.value = !erAaben.value
}
</script>








<template>
  <div class="filter-wrapper">
    <!-- Knappen "Filtre" (kun på mobil). Tallet viser, hvor mange baner der er valgt -->
    <button type="button" class="mobil-filter-knap" :aria-expanded="erAaben" @click="togglerFilter">
      <span>Filtre</span>
      <span v-if="valgteFiltre.length > 0" class="filter-badge">{{ valgteFiltre.length }}</span>
    </button>

    <!-- Mørk baggrund bag det åbne filter på mobil. Klik på den lukker filteret -->
    <div v-if="erAaben" class="mobil-overlay" @click="erAaben = false"></div>

    <!-- Selve filteret. Klassen er-aaben får det til at glide ind på mobil -->
    <aside class="filter-sidebar" :class="{ 'er-aaben': erAaben }" aria-label="Filtrér baner på kortet">
      <div class="filter-header">
        <h3>Filtre</h3>

        <!-- "Ryd filtre" vises kun, når der er valgt noget -->
        <button
          v-if="valgteFiltre.length > 0"
          type="button"
          class="button-primary nulstil-link"
          @click="nulstilFilter">
          Ryd filtre
        </button>

        <!-- Luk-kryds (kun på mobil) -->
        <button type="button" class="luk-knap" aria-label="Luk filtre" @click="erAaben = false">×</button>
      </div>

      <!-- Kort forklaring, så man ved, hvad filteret gør -->
      <p class="hjaelpe-tekst">Vælg de baner, du vil se på kortet. Kortet opdateres med det samme.</p>

      <div class="filter-sektion">

        <!-- Vises, mens banerne hentes. Bagefter vises listen (v-else) -->
        <div v-if="indlaeser" class="indlaeser-tekst">
          Henter baner...
        </div>

        <div v-else class="filter-liste">
          <!-- Vis alle: er afkrydset, når intet er valgt. Klik tømmer listen med valgte baner -->
          <label class="filter-item vis-alle-item" :class="{ aktiv: valgteFiltre.length === 0 }">
            <input
              type="checkbox"
              :checked="valgteFiltre.length === 0"
              @change="nulstilFilter"
            />
            <div class="filter-tekst">
              <span class="titel">Vis alle baner</span>
            </div>
          </label>

          <!-- Én boks pr. gruppe (grøn, blå, svære). fieldset + legend samler gruppen for skærmlæsere -->
          <fieldset v-for="gruppe in grupper" :key="gruppe.id" class="gruppe">
            <!-- Gruppens navn (fx "Højder for alle") vises ikke, men skærmlæsere læser det stadig op -->
            <legend class="sr-only">{{ gruppe.hoved.titel }}</legend>

            <!-- Én række pr. bane. Hele rækken er en <label>, så man kan klikke hvor som helst på den -->
            <label
              v-for="bane in gruppe.baner"
              :key="bane.id"
              class="filter-item underpunkt"
              :class="{ aktiv: valgteFiltre.includes(bane.id) }"
            >
              <input
                type="checkbox"
                :checked="valgteFiltre.includes(bane.id)"
                @change="vaelgBane(bane.id, $event.target.checked)"
              />
              <div class="filter-tekst">
                <div class="titel-linie">
                  <span class="titel">{{ bane.titel }}</span>
                </div>
                <!-- Undertekst til venstre og sværhed til højre på samme linje.
                     Begge vises kun, hvis banen har dem -->
                <div v-if="bane.undertekst || bane.svaerhed" class="under-linie">
                  <span v-if="bane.undertekst" class="undertekst">{{ bane.undertekst }}</span>
                  <!-- Sværheds-mærke. Bruger .badge fra _badges.scss -->
                  <span v-if="bane.svaerhed" class="badge ekstra-info">Niveau: {{ bane.svaerhed }}</span>
                </div>
              </div>
            </label>
          </fieldset>

        </div>
      </div>

      <!-- Kun på mobil: lukker filteret og viser kortet. Teksten siger, hvad man får at se -->
      <div class="filter-footer">
        <button type="button" class="vis-kort-knap" @click="erAaben = false">
          <template v-if="valgteFiltre.length === 0">Vis alle baner på kortet</template>
          <template v-else-if="valgteFiltre.length === 1">Vis 1 bane på kortet</template>
          <template v-else>Vis {{ valgteFiltre.length }} af {{ antalBaner }} baner på kortet</template>
        </button>
      </div>
    </aside>
  </div>
</template>

<style lang="scss" scoped>
// Farverne kommer fra _colors.scss, så filteret passer til resten af siderne
@use '@/assets/styles/colors' as c;

// Skygge under knapper, der ligger oven på kortet
$skygge: 0 4px 16px rgba(c.$primary_black100, 0.2);

/* Ramme om hele filteret. position: relative gør, at Filtre-knappen placeres i forhold til den */
.filter-wrapper {
  position: relative;
}

/* Skjuler tekst visuelt, men skærmlæsere kan stadig læse den */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* "Filtre"-knappen på mobil, øverst til venstre oven på kortet (z-index: 10).
   Sort med lys tekst, ligesom button-primary */
.mobil-filter-knap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: absolute;
  top: 15px;
  left: 15px;
  z-index: 10;
  background: c.$primary_black100;
  color: c.$primary_light25;
  // Samme kant som Tilbage-knappen, så de to knapper er lige høje
  border: solid 2px c.$primary_black100;
  padding: 0.5rem 1.5rem;
  border-radius: 1rem;
  font-weight: 900;
  font-size: clamp(1rem, 1.5vw, 1.25rem);
  box-shadow: $skygge;
  cursor: pointer;
}

/* Den lille runde boble med antal valgte baner */
.filter-badge {
  background: c.$forest_pink100;
  color: c.$primary_black100;
  font-size: 0.75rem;
  padding: 2px 7px;
  border-radius: 1rem;
}

/* Halvgennemsigtig sort baggrund bag filteret på mobil. position: fixed = dækker hele skærmen */
.mobil-overlay {
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(c.$primary_black100, 0.4);
  z-index: 99;
}

/* MOBIL (standard): filteret ligger uden for skærmen (left: -100%) og fylder hele skærmen.
   transition gør, at det glider ind. På desktop ændres det i @media længere nede.
   env(safe-area-inset-bottom) giver plads til iPhones hjem-streg */
.filter-sidebar {
  position: fixed;
  top: 0;
  left: -100%;
  width: 100vw;
  height: 100dvh;
  min-height: 100dvh;
  background-color: c.$primary_light25;
  border: none;
  border-radius: 0;
  padding: 1.5rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  z-index: 100;
  transition: left 0.3s ease-in-out;
  overflow-y: auto;
  font-family: "Inter", sans-serif;
  color: c.$primary_black100;
}

/* Listen fylder den ledige plads (flex: 1) og kan scrolles, hvis den er for lang */
.filter-sektion {
  flex: 1;
  overflow-y: auto;
}

/* Når filteret er åbent, glider det ind på skærmen */
.filter-sidebar.er-aaben {
  left: 0;
}

/* Krydset, der lukker filteret på mobil */
.luk-knap {
  display: block;
  background: none;
  border: none;
  font-size: 1.8rem;
  color: c.$primary_black100;
  cursor: pointer;
  line-height: 1;
}

/* Overskriften "Filtre" og knapperne ved siden af */
.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 2px solid c.$primary_black100;
  padding-bottom: 0.75rem;
}

/* Fed overskrift ligesom h1 på resten af sitet, bare mindre */
.filter-header h3 {
  margin: 0;
  padding: 0;
  font-weight: 900;
  color: c.$primary_black100;
}

/* Forklaringen under overskriften */
.hjaelpe-tekst {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
  color: c.$primary_black100;
}

/* "Ryd filtre"-knappen: udseendet kommer fra .button-primary i _buttons.scss.
   margin-left: auto skubber den ud til højre i overskriftslinjen */
.nulstil-link {
  margin-left: auto;
  cursor: pointer;
}

.indlaeser-tekst {
  font-size: 0.9rem;
  font-weight: 300;
  color: c.$primary_black100;
  padding: 0.5rem 0;
}

/* Alle rækker i én sammenhængende liste – ingen ekstra luft mellem grupperne */
.filter-liste {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* En gruppe (fx grøn) er bare en del af listen – ingen boks omkring.
   fieldset har sin egen standard-styling (ramme og luft), som nulstilles her */
.gruppe {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  min-width: 0;
  border: none;
}

/* Én række i filteret (fx en bane) */
.filter-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 25px;
  cursor: pointer;
  color: c.$primary_black100;
  transition: background-color 0.2s ease;
}

/* "Vis alle"-rækken: en almindelig række med fed tekst */
.vis-alle-item .titel {
  font-weight: 900;
}

/* Valgt række: ingen baggrundsfarve – teksten bliver blå/lilla i stedet */
.filter-item.aktiv .titel,
.filter-item.aktiv .undertekst {
  color: c.$secondary_purple100;
}

/* Egen tjekboks: appearance: none fjerner browserens standard-tjekboks.
   Firkantet med runde hjørner, så den tydeligt ligner noget, man kan sætte flueben i */
.filter-item input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin: 0;
  border: 2px solid c.$primary_black100;
  border-radius: 6px;
  background: c.$primary_light25;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

/* Afkrydset: blå/lilla boks med lyst flueben, så den passer til den farvede tekst */
.filter-item input[type="checkbox"]:checked {
  background: c.$secondary_purple100;
  border-color: c.$secondary_purple100;
}

/* ::after indsætter et ✓ i tjekboksen, når den er afkrydset */
.filter-item input[type="checkbox"]:checked::after {
  content: "✓";
  color: c.$primary_light25;
  font-size: 13px;
  font-weight: bold;
  line-height: 1;
}

/* Tydelig ramme, når man bruger tastaturet (Tab) */
.filter-item input[type="checkbox"]:focus-visible {
  outline: 3px solid c.$secondary_purple100;
  outline-offset: 2px;
}

/* Titel og undertekst under hinanden */
.filter-tekst {
  display: flex;
  flex-direction: column;
  gap: 2px;
  // Fylder resten af rækken, så sværheden kan stå helt ude til højre
  flex: 1;
  min-width: 0;
}

/* Linjen med banens navn */
.titel-linie {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-tekst .titel {
  font-size: 0.95rem;
  font-weight: 700;
  color: c.$primary_black100;
}

.filter-tekst .undertekst {
  font-size: 0.8rem;
  color: c.$primary_black100;
  font-weight: 400;
}

/* Bunden med "Vis ... på kortet" (kun mobil). margin-top: auto skubber den helt ned */
.filter-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 2px solid c.$primary_black100;
}

/* "Vis på kortet" ser ud som button-primary, bare i fuld bredde */
.vis-kort-knap {
  width: 100%;
  background-color: c.$primary_black100;
  color: c.$primary_light25;
  border: none;
  padding: 0.75rem;
  border-radius: 1rem;
  font-weight: 900;
  font-size: clamp(1rem, 1.5vw, 1.25rem);
  cursor: pointer;
}

/* Undertekst og sværheds-mærke på samme linje.
   gap giver en lille luft, så mærket står lige efter teksten */
.under-linie {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

/* Sværheds-mærket: bruger .badge fra _badges.scss – her sættes farverne og en mindre størrelse.
   Står lige efter underteksten og brydes aldrig over to linjer */
.ekstra-info {
  --badge-bg: #{c.$primary_darkgreen};
  --badge-color: #{c.$primary_light50};
  align-self: center;
  flex-shrink: 0;
  padding: 0.25rem 0.6rem;
  white-space: nowrap;
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  transition: background-color 0.2s ease;
}

/* Valgt bane: mærket får samme blå/lilla farve som teksten */
.filter-item.aktiv .ekstra-info {
  --badge-bg: #{c.$secondary_purple100};
}

/* DESKTOP (over 800px): filteret svæver oven på kortet med luft rundt om,
   så kortet fylder hele skærmen bag det. Mobil-knapperne og bunden skjules,
   da kortet opdateres live.
   Afstanden (24px) og bredden (360px) bruges også i KortView.vue – ret begge steder */
@media (min-width: 801px) {
  .mobil-filter-knap,
  .luk-knap,
  .mobil-overlay,
  .filter-footer {
    display: none;
  }

  /* Rammen ligger oven på kortet og går fra top til bund med 24px luft.
     pointer-events: none lader klik og træk gå igennem til kortet under filteret */
  .filter-wrapper {
    position: absolute;
    top: 24px;
    left: 24px;
    bottom: 24px;
    z-index: 5;
    display: flex;
    align-items: flex-start;
    pointer-events: none;
  }

  /* Selve filteret: et lyst kort med runde hjørner og skygge.
     Det er kun så højt som indholdet, men aldrig højere end skærmen (max-height) */
  .filter-sidebar {
    position: static;
    left: auto;
    width: 360px;
    height: auto;
    min-height: 0;
    max-height: 100%;
    background-color: c.$primary_light25;
    border-radius: 1rem;
    box-shadow: $skygge;
    padding: 1.25rem;
    z-index: 1;
    pointer-events: auto;
  }
}

/* Hover-effekter kun på enheder med mus. På touch ville de "hænge fast" efter et tryk */
@media (hover: hover) {
  /* Hover: ingen baggrundsfarve – teksten og tjekboksens kant bliver blå/lilla */
  .filter-item:hover .titel,
  .filter-item:hover .undertekst {
    color: c.$secondary_purple100;
  }

  /* Hover: mærket får samme blå/lilla farve som teksten */
  .filter-item:hover .ekstra-info {
    --badge-bg: #{c.$secondary_purple100};
  }

  .filter-item:hover input[type="checkbox"] {
    border-color: c.$secondary_purple100;
  }


  .vis-kort-knap:hover,
  .mobil-filter-knap:hover {
    background-color: c.$secondary_purple100;
    border-color: c.$secondary_purple100;
  }
}
</style>
