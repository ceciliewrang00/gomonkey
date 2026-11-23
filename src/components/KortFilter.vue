<script setup>
// Filteret til venstre for kortet. Et flueben sender med det samme de valgte baner op til KortView.
// Listen kommer fra Firebase "mapfilter", navn og sværhedsgrad fra "baner"

import { ref, computed, watch, onMounted } from 'vue'

// Giver adgang til adressen i browseren (?bane=...)
import { useRoute } from 'vue-router'

import { KORTFILTER_URL } from '@/services/api.js'

// hentBaner hedder hentFaellesBaner her, fordi filen selv har en funktion, der hedder hentBaner
import { hentBaner as hentFaellesBaner, BOUNCE_ID } from '@/services/baner.js'

// 'filter-changed' sendes op til KortView med de valgte baner
const emit = defineEmits(['filter-changed'])

// Kommer man fra et link som /kort?bane=bane-6, er den bane valgt fra start.
// Flere baner kan skrives med komma
const route = useRoute()
const fraAdressen = String(route.query.bane ?? '').split(',').filter(Boolean)

// Id'erne på de baner, der er sat flueben ved
const valgteFiltre = ref(fraAdressen)

// Er filteret åbent på mobil?
const erAaben = ref(false)

const banerListe = ref([])

// true, mens banerne hentes
const indlaeser = ref(true)

// Listen delt i to grupper: klatrebaner og aktiviteter (Bounce).
// Tomme grupper vises ikke
const grupper = computed(() => [
  { titel: 'Klatrebaner', baner: banerListe.value.filter((b) => b.id !== BOUNCE_ID) },
  { titel: 'Aktiviteter', baner: banerListe.value.filter((b) => b.id === BOUNCE_ID) },
].filter((g) => g.baner.length > 0))


// ---------- Hent data ----------

const databaseUrl = `${KORTFILTER_URL}.json`

// Henter listen fra "mapfilter" og sætter navn og sværhedsgrad fra "baner" på hver bane
async function hentBaner() {
  try {
    const response = await fetch(databaseUrl)

    const data = await response.json()

    // Fejler "baner", bruges bare teksterne fra "mapfilter"
    let faelles = []
    try {
      faelles = await hentFaellesBaner()
    } catch (e) {
      console.error('Banernes navne kunne ikke hentes:', e)
    }
    // Sætter navn og sværhedsgrad fra "baner" på én bane.
    // Findes banen ikke dér (fx en ny bane fra admin), beholdes teksterne fra "mapfilter"
    const medFaellesData = (item) => {
      const bane = faelles.find((b) => b.id === item.id)
      if (!bane) return item
      return { ...item, titel: bane.name }
    }

    // Firebase kan sende listen som en liste eller som et objekt
    if (data) {
      if (Array.isArray(data)) {
        // Fjerner tomme pladser, hvor en bane er slettet
        banerListe.value = data.filter(item => item !== null && item !== undefined).map(medFaellesData)
      } else {
        banerListe.value = Object.values(data).map(medFaellesData)
      }
    }

  } catch (fejl) {
    console.error('Fejl ved hentning af banedata fra Firebase:', fejl)

  } finally {
    indlaeser.value = false
  }
}

// Henter banerne, når filteret vises
onMounted(() => {
  hentBaner()
})


// ---------- Når man sætter flueben ----------

// Sender valgene til KortView, hver gang de ændrer sig ('alle', hvis intet er valgt).
// immediate: true sender også med det samme, så en bane fra adressen er valgt fra start
watch(valgteFiltre, (valgte) => {
  emit('filter-changed', valgte.length === 0 ? 'alle' : [...valgte])
}, { immediate: true })

// Flueben: læg banen i listen. Intet flueben: lav en ny liste uden banen.
// Vi laver en ny liste, så watch opdager ændringen
function vaelgBane(id, checked) {
  if (checked) {
    if (!valgteFiltre.value.includes(id)) {
      valgteFiltre.value = [...valgteFiltre.value, id]
    }
  } else {
    valgteFiltre.value = valgteFiltre.value.filter(f => f !== id)
  }
}

// "Vis alle" og "Ryd filtre" tømmer listen, så alle baner vises
function nulstilFilter() {
  valgteFiltre.value = []
}

// "Filtre"-knappen på mobil åbner og lukker filteret
function togglerFilter() {
  erAaben.value = !erAaben.value
}
</script>








<template>
  <div class="filter-wrapper">
    <!-- "Filtre"-knappen (kun mobil). Tallet viser, hvor mange baner der er valgt -->
    <button type="button" class="mobil-filter-knap" :aria-expanded="erAaben" @click="togglerFilter">
      <span>Filtre</span>
      <span v-if="valgteFiltre.length > 0" class="filter-badge etiket">{{ valgteFiltre.length }}</span>
    </button>

    <!-- Mørk baggrund bag det åbne filter på mobil. Klik lukker filteret -->
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

      <p class="hjaelpe-tekst lille-tekst">Vælg de baner, du vil se på kortet. Kortet opdateres med det samme.</p>

      <div class="filter-sektion">

        <div v-if="indlaeser" class="indlaeser-tekst lille-tekst">
          Henter baner...
        </div>

        <div v-else class="filter-liste">
          <!-- "Vis alle" er afkrydset, når intet er valgt -->
          <label class="filter-item vis-alle-item" :class="{ aktiv: valgteFiltre.length === 0 }">
            <input
              type="checkbox"
              :checked="valgteFiltre.length === 0"
              @change="nulstilFilter"
            />
            <div class="filter-tekst">
              <span class="titel">Vis alle</span>
            </div>
          </label>

          <!-- En gruppe for banerne og en for aktiviteterne, hver med sin overskrift -->
          <template v-for="gruppe in grupper" :key="gruppe.titel">
            <!-- Overskrift, antal og en streg, der fylder resten af linjen -->
            <h4 class="gruppe-titel">
              {{ gruppe.titel }}
              <span class="gruppe-antal etiket" aria-hidden="true">{{ gruppe.baner.length }}</span>
            </h4>

            <!-- Én række pr. bane. Hele rækken er en <label>, så man kan klikke hvor som helst på den -->
            <label
              v-for="bane in gruppe.baner"
              :key="bane.id"
              class="filter-item"
              :class="[`filter-item--${bane.id}`, { aktiv: valgteFiltre.includes(bane.id) }]"
            >
              <input
                type="checkbox"
                :checked="valgteFiltre.includes(bane.id)"
                @change="vaelgBane(bane.id, $event.target.checked)"
              />
              <div class="filter-tekst">
                <!-- Navnet med underteksten ved siden af, fx "Grøn  Klatrevæg & net" -->
                <div class="titel-linie">
                  <!-- Prik i banens farve, ligesom stregen på kortet -->
                  <span class="filter-prik" aria-hidden="true"></span>
                  <span class="titel">{{ bane.titel }}</span>
                  <span v-if="bane.undertekst" class="undertekst lille-tekst">{{ bane.undertekst }}</span>
                </div>
              </div>
            </label>
          </template>

        </div>
      </div>

      <!-- Kun mobil: lukker filteret og viser kortet -->
      <div class="filter-footer">
        <button type="button" class="vis-kort-knap" @click="erAaben = false">
          <template v-if="valgteFiltre.length === 0">Vis alt på kortet</template>
          <template v-else-if="valgteFiltre.length === 1">Vis 1 bane på kortet</template>
          <template v-else>Vis {{ valgteFiltre.length }} af {{ banerListe.length }} baner på kortet</template>
        </button>
      </div>
    </aside>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/fonts' as ft;
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/mixins' as m;

// Skygge under knapper oven på kortet
$skygge: 0 4px 16px rgba(c.$primary_black100, 0.2);

/* Ramme om hele filteret */
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

/* "Filtre"-knappen på mobil, øverst til venstre oven på kortet */
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
  // Samme kant som Tilbage-knappen, så de er lige høje
  border: solid 2px c.$primary_black100;
  padding: 0.5rem 1.5rem;
  border-radius: 1rem;
  // Teksten følger knap-reglen i _mixins.scss (16/18px, vægt 900)
  @include m.button;
  box-shadow: $skygge;
  cursor: pointer;
}

/* Boblen med antal valgte baner */
// Teksten følger .etiket i _typography.scss
.filter-badge {
  background: c.$forest_pink100;
  color: c.$primary_black100;
  padding: 2px 7px;
  border-radius: 1rem;
}

/* Halvgennemsigtig sort baggrund bag filteret på mobil */
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

/* Mobil: filteret ligger uden for skærmen og glider ind, når det åbnes.
   Nederst er der plads til iPhones hjem-streg */
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
  // --kant = luften i siderne. Bruges også af rækkerne, så deres baggrund kan gå helt ud til kanten
  --kant: 1.5rem;
  padding: var(--kant);
  padding-bottom: calc(var(--kant) + env(safe-area-inset-bottom));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  z-index: 100;
  transition: left 0.3s ease-in-out;
  overflow-y: auto;
  font-family: ft.$font;
  color: c.$primary_black100;
}

/* Listen fylder den ledige plads og kan scrolles */
.filter-sektion {
  flex: 1;
  overflow-y: auto;
  // Scrollområdet går helt ud til panelets kanter, så rækkernes baggrund ikke bliver klippet af.
  // Luften i siderne lægges ind igen som padding, så indholdet står samme sted som før
  margin-inline: calc(-1 * var(--kant));
  padding-inline: var(--kant);
}

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

/* Fed overskrift ligesom h1, bare mindre */
.filter-header h3 {
  margin: 0;
  padding: 0;
  color: c.$primary_black100;
}

// Teksten følger .lille-tekst i _typography.scss
.hjaelpe-tekst {
  margin: 0;
  color: c.$primary_black100;
}

/* "Ryd filtre" står ude til højre i overskriftslinjen */
.nulstil-link {
  margin-left: auto;
  cursor: pointer;
}

// Teksten følger .lille-tekst i _typography.scss
.indlaeser-tekst {
  color: c.$primary_black100;
  padding: 0.5rem 0;
}

.filter-liste {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  // Baggrunden ved hover og valgt går helt ud til panelets kanter.
  // Den negative margin trækker rækken ud, og paddingen holder tjekboksen samme sted som overskriften
  margin-inline: calc(-1 * var(--kant));
  padding: 0.65rem var(--kant);
  cursor: pointer;
  color: c.$primary_black100;
  transition: background-color 0.2s ease;
}

// Valgt række: svag lilla flade
.filter-item.aktiv {
  background-color: rgba(c.$secondary_purple100, 0.08);
}

// Banens farve til prikken, fx .filter-item--bane-1. Ukendte baner bliver grå
.filter-item {
  --bane-farve: #{c.$primary_black50};
}

@each $id, $farve in c.$kort-bane-farver {
  .filter-item--#{$id} {
    --bane-farve: #{$farve};
  }
}

.filter-prik {
  flex-shrink: 0;
  align-self: center;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  background-color: var(--bane-farve);
}

/* Overskrift over hver gruppe ("Baner" og "Aktiviteter") */
.gruppe-titel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0 1rem;
  padding: 0;
  // Størrelse og vægt følger h4 i _typography.scss
  line-height: 1.2;
  color: c.$primary_darkgreen;

  // Tynd streg efter overskriften
  &::after {
    content: '';
    flex: 1;
    height: 2px;
    border-radius: 1px;
    background-color: rgba(c.$primary_darkgreen, 0.2);
  }
}

/* Lille rund mærke med antallet i gruppen */
.gruppe-antal {
  display: inline-grid;
  place-items: center;
  min-width: 1.4rem;
  height: 1.4rem;
  padding: 0 0.4rem;
  border-radius: 1rem;
  background-color: c.$forest_green25;
  // Teksten følger .etiket i _typography.scss
  color: c.$primary_darkgreen;
}

/* "Vis alle"-rækken har fed tekst */
.vis-alle-item .titel {
  font-weight: 900;
}

/* Valgt række: teksten bliver blå/lilla */
.filter-item.aktiv .titel {
  color: c.$secondary_purple100;
}

/* Vores egen tjekboks i stedet for browserens */
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

/* Afkrydset: blå/lilla boks med lyst flueben */
.filter-item input[type="checkbox"]:checked {
  background: c.$secondary_purple100;
  border-color: c.$secondary_purple100;
}

/* Fluebenet ✓ i tjekboksen */
.filter-item input[type="checkbox"]:checked::after {
  content: "✓";
  color: c.$primary_light25;
  font-size: 13px;
  font-weight: bold;
  line-height: 1;
}

/* Tydelig ramme, når man bruger tastaturet */
.filter-item input[type="checkbox"]:focus-visible {
  outline: 3px solid c.$secondary_purple100;
  outline-offset: 2px;
}

.filter-tekst {
  display: flex;
  flex-direction: column;
  gap: 2px;
  // Fylder resten af rækken, så sværheden står ude til højre
  flex: 1;
  min-width: 0;
}

// Navn og undertekst på samme linje. Er der ikke plads, ryger underteksten ned under navnet
.titel-linie {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 0.5rem;
}


// Banenavnet følger brødtekst-reglerne (16/18px), men står fed
.filter-tekst .titel {
  @include m.brodtekst;
  font-weight: 700;
  line-height: 1.3;
  color: c.$primary_black100;
}

// Undertitlen følger .lille-tekst i _typography.scss og står dæmpet, så navnet er det, man ser først
.filter-tekst .undertekst {
  color: c.$primary_black75;
}

/* Bunden med "Vis ... på kortet" (kun mobil) står helt nede */
.filter-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 2px solid c.$primary_black100;
}

.vis-kort-knap {
  width: 100%;
  background-color: c.$primary_black100;
  color: c.$primary_light25;
  border: none;
  padding: 0.75rem;
  border-radius: 1rem;
  // Teksten følger knap-reglen i _mixins.scss (16/18px, vægt 900)
  @include m.button;
  cursor: pointer;
}

/* Desktop: filteret svæver oven på kortet, og mobil-knapperne skjules.
   Afstanden (24px) og bredden (360px) bruges også i KortView.vue – ret begge steder */
@media (min-width: 801px) {
  .mobil-filter-knap,
  .luk-knap,
  .mobil-overlay,
  .filter-footer {
    display: none;
  }

  /* Klik og træk går igennem rammen til kortet under filteret */
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

  /* Et lyst kort med runde hjørner, aldrig højere end skærmen */
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
    --kant: 1.25rem;
    padding: var(--kant);
    z-index: 1;
    pointer-events: auto;
  }
}

/* Hover kun på enheder med mus – på touch ville det "hænge fast" */
@media (hover: hover) {
  /* Hover: teksten og tjekboksens kant bliver blå/lilla */
  // Hover: svag flade bag rækken, og navnet bliver lilla
  .filter-item:hover {
    background-color: rgba(c.$primary_darkgreen, 0.06);
  }

  .filter-item.aktiv:hover {
    background-color: rgba(c.$secondary_purple100, 0.12);
  }

  .filter-item:hover .titel {
    color: c.$secondary_purple100;
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
