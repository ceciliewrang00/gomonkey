<script setup>
// Denne side er primærl lavet af claude (AI)
// SIDEBAR PÅ ADMIN-SIDEN
// En indholdsfortegnelse i venstre side: en liste med overskrifterne (h2 og h3) i den åbne fane.
// Klikker man på en overskrift, ruller siden ned til den.
// Listen laves automatisk ved at kigge efter overskrifter på siden. Derfor virker den for
// Baner, Quiz og Kort, uden at de tre filer skal ændres.

import { ref, watch, onUnmounted } from 'vue'

// omraade = boksen med fanens indhold, hvor vi leder efter overskrifter (sendes ind fra AdminView)
const props = defineProps({
  omraade: { type: Object, default: null },
})

// Listen, der vises i sidebaren: [{ id: 'admin-afsnit-0', tekst: 'Grøn' }, ...]
const overskrifter = ref([])

// En tæller, så hver overskrift får sit eget id: admin-afsnit-0, admin-afsnit-1 ...
let naesteId = 0

// "Vagten", der holder øje med, om indholdet ændrer sig (se watch længere nede)
let observer = null

// Finder alle h2 og h3 i boksen og laver listen.
// Disse springes over:
//  - overskrifter inde i en åben redigeringsformular (.redigering)
//  - overskrifter, der starter med "Rediger" (fx "Rediger baner").
//    /^rediger/i er et regex: ^ = starter med, i = ligegyldigt om det er store eller små bogstaver
function opdater() {
  const el = props.omraade
  if (!el) {
    overskrifter.value = []
    return
  }

  const fundne = [...el.querySelectorAll('h2, h3')].filter(
    (h) => !h.closest('.redigering') && !/^rediger/i.test(h.textContent.trim()),
  )

  overskrifter.value = fundne.map((h) => {
    // Giv overskriften et id, hvis den ikke har et – det skal bruges til at rulle hen til den.
    // naesteId++ = brug tallet, og læg så 1 til, så det næste bliver anderledes
    if (!h.id) h.id = 'admin-afsnit-' + naesteId++
    return {
      id: h.id,
      tekst: h.textContent.trim(),
    }
  })
}

// Klik på et punkt: find overskriften med det id, og rul blødt ned til den
function rulTil(id) {
  const maal = document.getElementById(id)
  if (maal) maal.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Listen skal laves om, hver gang indholdet ændrer sig: når data er hentet, når man skifter fane,
// og når man opretter eller sletter noget.
// En MutationObserver er browserens "vagt": den kører en funktion (her opdater),
// hver gang der kommer eller forsvinder noget i boksen, eller en tekst ændres.
// watch herunder starter vagten, så snart boksen findes (immediate: true = med det samme).
// disconnect = stop den gamle vagt, før en ny startes
watch(
  () => props.omraade,
  (el) => {
    observer?.disconnect()
    opdater()
    if (!el) return
    observer = new MutationObserver(opdater)
    observer.observe(el, { childList: true, subtree: true, characterData: true })
  },
  { immediate: true },
)

// Når man forlader admin-siden, stoppes vagten
onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <nav class="admin-sidebar" aria-label="Indhold på siden">
    <p class="titel">Indhold</p>
    <ul>
      <li v-for="o in overskrifter" :key="o.id">
        <a :href="'#' + o.id" @click.prevent="rulTil(o.id)">{{ o.tekst }}</a>
      </li>
    </ul>
  </nav>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;

.admin-sidebar {
  padding: 1rem 1.25rem;
  background-color: c.$forest_green25;
  border: 2px solid c.$forest_green100;
  border-radius: 1rem;
  // Lange lister (fx mange quizspørgsmål) kan rulles inde i sidebaren
  max-height: 40vh;
  overflow-y: auto;

  // På store skærme bliver sidebaren stående, mens man ruller
  @media (min-width: 900px) {
    position: sticky;
    top: 1rem;
    max-height: calc(100vh - 2rem);
  }

  .titel {
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li {
    margin: 0.75rem 0;
    line-height: 1.3;
  }

  a {
    color: c.$primary_black100;
    text-decoration: none;

    &:hover,
    &:focus-visible {
      color: c.$forest_pink100;
      text-decoration: underline;
    }
  }
}
</style>
