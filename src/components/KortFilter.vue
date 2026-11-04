<script setup>
// KORTFILTER
// Sidebaren til venstre for kortet, hvor man vælger, hvilke baner der skal fremhæves.
// Banerne hentes fra Firebase og vises i tre fold-ud-grupper: grøn, blå og svære.
// Når man trykker "Anvend filtre", sendes de valgte bane-id'er til KortView.vue med emit.
// På mobil er filteret skjult bag en "Filtre"-knap og glider ind fra venstre.

import { ref, computed, onMounted } from 'vue'

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

// Holder styr på status for dropdown-grupperne.
const aabneGrupper = ref({
  gron: false,
  bla: false,
  svaer: false
})



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


//-----------------------------------FILTER FUNKTIONERNE--------------------------------------------------------------------------

//Filter-funktionerne

// Tjekker om der er valgt nogle baner. 
// Hvis der ikke er valgt nogle, skal alle baner vises.
function anvendFiltre() {
  const filterAtSende =
    valgteFiltre.value.length === 0
      ? 'alle'

// Ellers gemmes de valgte baner i variablen filterAtSende.
      : [...valgteFiltre.value]

// Her bruger jeg emit til at sende varibalen videre til kort-komponenten
// så den kan opdatere hvilke baner der skal vises.
  emit('filter-changed', filterAtSende)
  erAaben.value = false
}

// Når nulstil-knappen bruges, nulstilles alle valgte baner 
// og der sendes besked (emit) til kort-komponenten, så alle baner vises igen.
function nulstilFilter() {
  valgteFiltre.value = []
  emit('filter-changed', 'alle')
}




//Funktion der skifter status for mobilmenuen mellem åben og lukket, alt efter hvad den er i forvejenn
function togglerFilter() {
  erAaben.value = !erAaben.value
}

// Åbner eller lukker den valgte dropdown-gruppe i filteret
function togglerGruppe(gruppeNøgle) {
  aabneGrupper.value[gruppeNøgle] = !aabneGrupper.value[gruppeNøgle]
}




// Holder øje med, hvornår der vælges en bane eller fjernes en bane
function haandterFilterValg(id, checked) {
  if (checked) {

// Hvis brugeren har valgt en bane, gemmmer den banens id i listen (varibalen = valgteFiltre)
    if (!valgteFiltre.value.includes(id)) {
      valgteFiltre.value.push(id)
    }
// Hvis brugeren fjerner sit valg, sletter den banens id fra listen (varibalen = valgteFiltre)
  } else {
    valgteFiltre.value = valgteFiltre.value.filter(f => f !== id)
  }
}





//-------------------------------------------------------------------------------------------------------------
// Filtrér baner ud fra din JSON-struktur
// Listen fra Firebase indeholder både hovedgrupper (fx id 'gron') og
// underpunkter (fx 'gron-1', markeret med underpunkt: true).
// computed regner grupperne ud igen af sig selv, når banerListe ændrer sig.
// find giver det første match, filter giver alle matches.
// Bounce ligger under grøn, og sort (frit fald) ligger under svære baner
const gronneHovedgruppe = computed(() => banerListe.value.find(b => b.id === 'gron'))
const gronneUnderliggende = computed(() => 
  banerListe.value.filter(b => b.id === 'bounce' || (b.underpunkt === true && b.id.startsWith('gron')))
)

const blaaHovedgruppe = computed(() => banerListe.value.find(b => b.id === 'bla'))
const blaaUnderliggende = computed(() => banerListe.value.filter(b => b.underpunkt === true && b.id.startsWith('bla')))

const svaerHovedgruppe = computed(() => banerListe.value.find(b => b.id === 'svaer'))
const svaerUnderliggende = computed(() => banerListe.value.filter(b => b.underpunkt === true && (b.id === 'rod' || b.id === 'sort')))
</script>








<template>
  <div class="filter-wrapper">
    <!-- Knappen "Filtre" (kun på mobil). Tallet viser, hvor mange baner der er valgt -->
    <button type="button" class="mobil-filter-knap" @click="togglerFilter">
      <span>Filtre</span>
      <span v-if="valgteFiltre.length > 0" class="filter-badge">{{ valgteFiltre.length }}</span>
    </button>

    <!-- Mørk baggrund bag det åbne filter på mobil. Klik på den lukker filteret -->
    <div v-if="erAaben" class="mobil-overlay" @click="erAaben = false"></div>

    <!-- Selve filteret. Klassen er-aaben får det til at glide ind på mobil -->
    <aside class="filter-sidebar" :class="{ 'er-aaben': erAaben }">
      <div class="filter-header">
        <h2>Filtre</h2>

        <!-- "Ryd filtre" vises kun, når der er valgt noget -->
        <button
          v-if="valgteFiltre.length > 0"
          type="button" 
          class="nulstil-link" 
          @click="nulstilFilter">
          Ryd filtre
        </button>

        <!-- Luk-kryds (kun på mobil) -->
        <button type="button" class="luk-knap" @click="erAaben = false">×</button>
      </div>

      <div class="filter-sektion">

        <!-- Vises, mens banerne hentes. Bagefter vises listen (v-else) -->
        <div v-if="indlaeser" class="indlaeser-tekst">
          Henter baner...
        </div>

        <div v-else class="filter-liste">
          <!-- Vis alle (med runde kanter) -->
          <!-- Er afkrydset, når intet er valgt. Klik tømmer listen med valgte baner -->
          <label class="filter-item vis-alle-item" :class="{ aktiv: valgteFiltre.length === 0 }">
            <input 
              type="checkbox" 
              :checked="valgteFiltre.length === 0" 
              @change="valgteFiltre = []" 
            />
            <div class="filter-tekst">
              <span class="titel">Vis alle</span>
            </div>
          </label>
          
          <!-- GRØN HOVEDGRUPPE -->
          <!-- Vises kun, hvis gruppen findes i data (v-if).
               De tre grupper (grøn, blå, svære) er bygget helt ens -->
          <div v-if="gronneHovedgruppe" class="gruppe-dropdown-container" :class="{ 'er-aaben': aabneGrupper.gron }">
            <!-- Overskriften. Klik folder gruppen ud eller ind -->
            <div class="gruppe-hoved-linie" @click="togglerGruppe('gron')">
              <div class="filter-item hovedgruppe-overskrift">
                <div class="filter-tekst">
                  <span class="titel">{{ gronneHovedgruppe.titel }}</span>
                  <span v-if="gronneHovedgruppe.undertekst" class="undertekst">{{ gronneHovedgruppe.undertekst }}</span>
                </div>
              </div>
              <!-- Pil, der drejer 180 grader, når gruppen er åben -->
              <button type="button" class="fold-knap">
                <svg class="pil-ikon" :class="{ roteret: aabneGrupper.gron }" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>

            <!-- Underpunkter for Grøn (med glat animation) -->
            <div class="underpunkter-liste" :class="{ 'aaben': aabneGrupper.gron }">
              <div class="underpunkter-wrapper">
                <!-- Én række pr. bane (v-for). :key hjælper Vue med at holde styr på rækkerne.
                     Hele rækken er en <label>, så man kan klikke hvor som helst på den -->
                <label
                  v-for="bane in gronneUnderliggende"
                  :key="bane.id" 
                  class="filter-item underpunkt" 
                  :class="{ aktiv: valgteFiltre.includes(bane.id) }"
                >
                  <!-- Flueben. $event.target.checked er true, når der sættes flueben -->
                  <input
                    type="checkbox"
                    :checked="valgteFiltre.includes(bane.id)"
                    @change="haandterFilterValg(bane.id, $event.target.checked)"
                  />
                  <div class="filter-tekst">
                    <div class="titel-linie">
                      <span class="titel">{{ bane.titel }}</span>
                      <!-- Blad-ikon. bane.farve bliver en klasse (fx "gron"), som giver
                           ikonet farven. Uden farve bruges klassen 'standard' -->
                      <svg class="bane-ikon" :class="bane.farve || 'standard'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 31.27 55.1">
                        <path fill="currentColor" d="M5.36,53.92c-.02.34.54,1,.84,1.13.35.15,1.3-.07,1.5-.42l2.6-4.41c7.33-.3,11.97-5.79,14.72-12.25,2.17-5.08,3.18-10.33,3.48-15.91C28.91,14.55,29.81,7.32,31.27,0c-6.44,1.92-11.99,4.79-16.96,8.81C8.64,13.49,4.31,19.24,1.74,26.11c-2.98,8.59-2.44,15.63,4.04,22.07,0,0-.42,5.74-.42,5.74Z"/>
                      </svg>
                    </div>
                    <!-- Undertekst og små mærker vises kun, hvis banen har dem -->
                    <span v-if="bane.undertekst" class="undertekst">{{ bane.undertekst }}</span>
                    <div v-if="bane.svaerhed || bane.hojdekrav" class="ekstra-info">
                      <span v-if="bane.svaerhed" class="badge">Sværhed: {{ bane.svaerhed }}</span>
                      <span v-if="bane.hojdekrav" class="badge">{{ bane.hojdekrav }}</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- BLÅ HOVEDGRUPPE -->
          <!-- Bygget som den grønne gruppe ovenfor, bare med blå data -->
          <div v-if="blaaHovedgruppe" class="gruppe-dropdown-container" :class="{ 'er-aaben': aabneGrupper.bla }">
            <div class="gruppe-hoved-linie" @click="togglerGruppe('bla')">
              <div class="filter-item hovedgruppe-overskrift">
                <div class="filter-tekst">
                  <span class="titel">{{ blaaHovedgruppe.titel }}</span>
                  <span v-if="blaaHovedgruppe.undertekst" class="undertekst">{{ blaaHovedgruppe.undertekst }}</span>
                </div>
              </div>
              <button type="button" class="fold-knap">
                <svg class="pil-ikon" :class="{ roteret: aabneGrupper.bla }" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>

            <!-- Underpunkter for Blå (med glat animation) -->
            <div class="underpunkter-liste" :class="{ 'aaben': aabneGrupper.bla }">
              <div class="underpunkter-wrapper">
                <label 
                  v-for="bane in blaaUnderliggende"
                  :key="bane.id" 
                  class="filter-item underpunkt" 
                  :class="{ aktiv: valgteFiltre.includes(bane.id) }"
                >
                  <input
                    type="checkbox"
                    :checked="valgteFiltre.includes(bane.id)"
                    @change="haandterFilterValg(bane.id, $event.target.checked)"
                  />
                  <div class="filter-tekst">
                    <div class="titel-linie">
                      <span class="titel">{{ bane.titel }}</span>
                      <svg class="bane-ikon" :class="bane.farve || 'standard'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 31.27 55.1">
                        <path fill="currentColor" d="M5.36,53.92c-.02.34.54,1,.84,1.13.35.15,1.3-.07,1.5-.42l2.6-4.41c7.33-.3,11.97-5.79,14.72-12.25,2.17-5.08,3.18-10.33,3.48-15.91C28.91,14.55,29.81,7.32,31.27,0c-6.44,1.92-11.99,4.79-16.96,8.81C8.64,13.49,4.31,19.24,1.74,26.11c-2.98,8.59-2.44,15.63,4.04,22.07,0,0-.42,5.74-.42,5.74Z"/>
                      </svg>
                    </div>
                    <span v-if="bane.undertekst" class="undertekst">{{ bane.undertekst }}</span>
                    <div v-if="bane.svaerhed || bane.hojdekrav" class="ekstra-info">
                      <span v-if="bane.svaerhed" class="badge">Sværhed: {{ bane.svaerhed }}</span>
                      <span v-if="bane.hojdekrav" class="badge">{{ bane.hojdekrav }}</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- SVÆRE BANER HOVEDGRUPPE -->
          <!-- Bygget som den grønne gruppe ovenfor, med rød og sort -->
          <div v-if="svaerHovedgruppe" class="gruppe-dropdown-container" :class="{ 'er-aaben': aabneGrupper.svaer }">
            <div class="gruppe-hoved-linie" @click="togglerGruppe('svaer')">
              <div class="filter-item hovedgruppe-overskrift">
                <div class="filter-tekst">
                  <span class="titel">{{ svaerHovedgruppe.titel }}</span>
                  <span v-if="svaerHovedgruppe.undertekst" class="undertekst">{{ svaerHovedgruppe.undertekst }}</span>
                </div>
              </div>
              <button type="button" class="fold-knap">
                <svg class="pil-ikon" :class="{ roteret: aabneGrupper.svaer }" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>

            <!-- Underpunkter for Svære baner (med glat animation) -->
            <div class="underpunkter-liste" :class="{ 'aaben': aabneGrupper.svaer }">
              <div class="underpunkter-wrapper">
                <label 
                  v-for="bane in svaerUnderliggende"
                  :key="bane.id" 
                  class="filter-item underpunkt" 
                  :class="{ aktiv: valgteFiltre.includes(bane.id) }"
                >
                  <input
                    type="checkbox"
                    :checked="valgteFiltre.includes(bane.id)"
                    @change="haandterFilterValg(bane.id, $event.target.checked)"
                  />
                  <div class="filter-tekst">
                    <div class="titel-linie">
                      <span class="titel">{{ bane.titel }}</span>
                      <svg class="bane-ikon" :class="bane.farve || 'standard'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 31.27 55.1">
                        <path fill="currentColor" d="M5.36,53.92c-.02.34.54,1,.84,1.13.35.15,1.3-.07,1.5-.42l2.6-4.41c7.33-.3,11.97-5.79,14.72-12.25,2.17-5.08,3.18-10.33,3.48-15.91C28.91,14.55,29.81,7.32,31.27,0c-6.44,1.92-11.99,4.79-16.96,8.81C8.64,13.49,4.31,19.24,1.74,26.11c-2.98,8.59-2.44,15.63,4.04,22.07,0,0-.42,5.74-.42,5.74Z"/>
                      </svg>
                    </div>
                    <span v-if="bane.undertekst" class="undertekst">{{ bane.undertekst }}</span>
                    <div v-if="bane.svaerhed || bane.hojdekrav" class="ekstra-info">
                      <span v-if="bane.svaerhed" class="badge">Sværhed: {{ bane.svaerhed }}</span>
                      <span v-if="bane.hojdekrav" class="badge">{{ bane.hojdekrav }}</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Først når man trykker her, sendes filteret til kortet -->
      <div class="filter-footer">
        <button type="button" class="anvend-knap" @click="anvendFiltre">
          Anvend filtre
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
.filter-header h2 {
  margin: 0;
  padding: 0;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 900;
  color: c.$primary_black100;
}

/* "Ryd filtre"-knappen: en lille button-secondary */
.nulstil-link {
  margin-left: auto;
  background: transparent;
  border: solid 2px c.$primary_black100;
  color: c.$primary_black100;
  font-size: 0.85rem;
  font-weight: 900;
  cursor: pointer;
  padding: 0.35rem 1rem;
  border-radius: 1rem;
}

.indlaeser-tekst {
  font-size: 0.9rem;
  font-weight: 300;
  color: c.$primary_black100;
  padding: 0.5rem 0;
}

/* Grupperne under hinanden med mellemrum */
.filter-liste {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Boksen om en hel gruppe (fx grøn). overflow: hidden klipper hjørnerne runde */
.gruppe-dropdown-container {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: transparent;
  border: 2px solid c.$primary_black100;
  border-radius: 1rem;
  padding: 0;
  overflow: hidden;
  transition: border-color 0.3s ease, background 0.3s ease;
}

/* Åben gruppe får en lys baggrund */
.gruppe-dropdown-container.er-aaben {
  background: c.$forest_green25;
}

/* Linjen med gruppens navn og pilen */
.gruppe-hoved-linie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
}

/* pointer-events: none: klikket går videre til hele linjen, som folder gruppen ud */
.hovedgruppe-overskrift {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
  flex: 1;
  pointer-events: none;
}

/* Knappen med pilen */
.fold-knap {
  background: none;
  border: none;
  color: c.$primary_black100;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Pilen drejer blødt (transition), når klassen roteret sættes på */
.pil-ikon {
  width: 16px;
  height: 16px;
  transition: transform 0.25s ease;
}

.pil-ikon.roteret {
  transform: rotate(180deg);
}

/* Lukket gruppe: højde 0 og usynlig. Animationen sker ved at ændre max-height */
.underpunkter-liste {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease-in-out;
}

/* Åben gruppe. max-height skal bare være større end listen kan blive */
.underpunkter-liste.aaben {
  max-height: 500px;
  opacity: 1;
  border-top: 1px solid c.$primary_black25;
}

.underpunkter-wrapper {
  display: flex;
  flex-direction: column;
}

/* Én række i filteret (fx en bane) */
.filter-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 16px 16px;
  cursor: pointer;
  color: c.$primary_black100;
  transition: background-color 0.2s ease;
}

/* "Vis alle"-rækken: ser ud som button-secondary, når den ikke er valgt */
.vis-alle-item {
  border-radius: 1rem;
  border: 2px solid c.$primary_black100;
}

.filter-item.underpunkt {
  padding-left: 0.75rem;
}

/* Valgt række: sort baggrund og lys tekst. !important vinder over andre regler */
.filter-item.aktiv {
  background: c.$primary_black100 !important;
  font-weight: 700;
}

.filter-item.aktiv .titel,
.filter-item.aktiv .undertekst {
  color: c.$primary_light25 !important;
}

/* Egen tjekboks: appearance: none fjerner browserens standard-tjekboks */
.filter-item input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 0;
  border: 2px solid c.$primary_black100;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.filter-item input[type="checkbox"]:checked {
  background: c.$primary_light25;
  border-color: c.$primary_light25;
}

/* ::after indsætter et ✓ i tjekboksen, når den er afkrydset */
.filter-item input[type="checkbox"]:checked::after {
  content: "✓";
  color: c.$primary_black100;
  font-size: 10px;
  font-weight: bold;
  line-height: 1;
}

/* Titel og undertekst under hinanden */
.filter-tekst {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Titel og blad-ikon på samme linje */
.titel-linie {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Blad-ikonet. flex-shrink: 0 forhindrer, at det bliver klemt */
.bane-ikon {
  width: 12px;
  height: 16px;
  flex-shrink: 0;
}

/* Ikonets farve pr. bane. Ikonet bruger currentColor, altså color herunder.
   Farverne er de samme som banernes streger på kortet, så man kan genkende dem */
.bane-ikon.gron { color: #14c053; }
.bane-ikon.bla { color: #46a9e2; }
.bane-ikon.rod { color: #db3434; }
.bane-ikon.sort { color: c.$primary_black75; }
.bane-ikon.bounce,
.bane-ikon.standard { color: c.$secondary_peach100; }

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

/* Bunden med "Anvend filtre". margin-top: auto skubber den helt ned */
.filter-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 2px solid c.$primary_black100;
}

/* "Anvend filtre" ser ud som button-primary, bare i fuld bredde */
.anvend-knap {
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

/* Rækken med små mærker (sværhed og højdekrav) */
.ekstra-info {
  display: flex;
  gap: 0.5rem;
  margin-top: 4px;
  flex-wrap: wrap;
}

/* Bruger .badge fra _badges.scss – her sættes kun farverne */
.ekstra-info .badge {
  --badge-bg: #{c.$forest_green100};
  --badge-color: #{c.$primary_light50};
  font-size: 0.65rem; // 14px
  font-weight: 400;
}

.filter-item.aktiv .ekstra-info .badge {
  --badge-bg: #{c.$forest_green50};
  --badge-color: #{c.$primary_black100};
}

/* DESKTOP (over 800px): filteret står fast til venstre (position: static)
   med 380px bredde, og mobil-knapperne skjules */
@media (min-width: 801px) {
  .mobil-filter-knap,
  .luk-knap,
  .mobil-overlay {
    display: none;
  }

  .filter-sidebar {
    position: static;
    left: auto;
    width: 380px;
    height: 100%;
    min-height: 100%;
    background-color: c.$primary_light25;
    border-radius: 0;
    padding: 1.25rem;
    z-index: 1;
  }
}

/* Hover-effekter kun på enheder med mus. På touch ville de "hænge fast" efter et tryk.
   Lilla hover, ligesom knapperne på resten af sitet */
@media (hover: hover) {
  .nulstil-link:hover {
    background: c.$primary_black100;
    border-color:c.$primary_black100;
    color: c.$primary_light25;
  }

  .filter-item:not(.aktiv):hover {
    background: c.$primary_black100;
  }

  .filter-item:not(.aktiv):hover .titel,
  .filter-item:not(.aktiv):hover .undertekst {
    color: c.$primary_light25;
  }

  /* Tjekboksen bliver lys, så den kan ses på den lilla baggrund */
  .filter-item:not(.aktiv):hover input[type="checkbox"] {
    border-color: c.$primary_light25;
  }

  .vis-alle-item:not(.aktiv):hover {
    border-color: c.$secondary_purple100;
  }

  .anvend-knap:hover,
  .mobil-filter-knap:hover {
    background-color: c.$secondary_purple100;
    border-color: c.$secondary_purple100;
  }
}
</style>
