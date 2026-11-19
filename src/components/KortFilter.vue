<script setup>
// Filteret til venstre for kortet. Et flueben sender med det samme de valgte baner op til KortView.
// Listen kommer fra Firebase "mapfilter", navn og sværhedsgrad fra "baner"

import { ref, watch, onMounted } from 'vue'

// Giver adgang til adressen i browseren (?bane=...)
import { useRoute } from 'vue-router'

import { KORTFILTER_URL } from '@/services/api.js'

// hentBaner hedder hentFaellesBaner her, fordi filen selv har en funktion, der hedder hentBaner
import { hentBaner as hentFaellesBaner, niveauFor } from '@/services/baner.js'

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
      return { ...item, titel: bane.name, svaerhed: niveauFor(bane) }
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
      <span v-if="valgteFiltre.length > 0" class="filter-badge">{{ valgteFiltre.length }}</span>
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

      <p class="hjaelpe-tekst">Vælg de baner, du vil se på kortet. Kortet opdateres med det samme.</p>

      <div class="filter-sektion">

        <div v-if="indlaeser" class="indlaeser-tekst">
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
              <span class="titel">Vis alle baner</span>
            </div>
          </label>

          <!-- Én række pr. bane. Hele rækken er en <label>, så man kan klikke hvor som helst på den -->
          <label
            v-for="bane in banerListe"
            :key="bane.id"
            class="filter-item"
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
              <!-- Undertekst til venstre og sværhed til højre -->
              <div v-if="bane.undertekst || bane.svaerhed" class="under-linie">
                <span v-if="bane.undertekst" class="undertekst">{{ bane.undertekst }}</span>
                <span v-if="bane.svaerhed" class="badge ekstra-info">Sværhedsgrad: {{ bane.svaerhed }}</span>
              </div>
            </div>
          </label>

        </div>
      </div>

      <!-- Kun mobil: lukker filteret og viser kortet -->
      <div class="filter-footer">
        <button type="button" class="vis-kort-knap" @click="erAaben = false">
          <template v-if="valgteFiltre.length === 0">Vis alle baner på kortet</template>
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
  font-weight: 900;
  font-size: clamp(1rem, 1.5vw, 1.25rem);
  box-shadow: $skygge;
  cursor: pointer;
}

/* Boblen med antal valgte baner */
.filter-badge {
  background: c.$forest_pink100;
  color: c.$primary_black100;
  font-size: 0.75rem;
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
  padding: 1.5rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
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
  font-weight: 900;
  color: c.$primary_black100;
}

.hjaelpe-tekst {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
  color: c.$primary_black100;
}

/* "Ryd filtre" står ude til højre i overskriftslinjen */
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

.filter-liste {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 25px;
  cursor: pointer;
  color: c.$primary_black100;
  transition: background-color 0.2s ease;
}

/* "Vis alle"-rækken har fed tekst */
.vis-alle-item .titel {
  font-weight: 900;
}

/* Valgt række: teksten bliver blå/lilla */
.filter-item.aktiv .titel,
.filter-item.aktiv .undertekst {
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
  font-weight: 900;
  font-size: clamp(1rem, 1.5vw, 1.25rem);
  cursor: pointer;
}

/* Undertekst og sværheds-mærke på samme linje */
.under-linie {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

/* Sværheds-mærket: en mindre .badge, der aldrig brydes over to linjer */
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
    padding: 1.25rem;
    z-index: 1;
    pointer-events: auto;
  }
}

/* Hover kun på enheder med mus – på touch ville det "hænge fast" */
@media (hover: hover) {
  /* Hover: teksten og tjekboksens kant bliver blå/lilla */
  .filter-item:hover .titel,
  .filter-item:hover .undertekst {
    color: c.$secondary_purple100;
  }

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
