<script setup>
// Denne side er primært lavet af Claude (AI).
// Indholdsfortegnelse over overskrifterne i den åbne admin-fane. Et klik ruller ned til overskriften

import { ref, watch, onUnmounted } from 'vue'

// omraade = boksen med fanens indhold, hvor vi leder efter overskrifter
const props = defineProps({
  omraade: { type: Object, default: null },
})

// Listen i sidebaren: [{ id, tekst }, ...]
const overskrifter = ref([])

// Tæller, så hver overskrift får sit eget id
let naesteId = 0

// Holder øje med, om fanens indhold ændrer sig
let observer = null

// Finder alle h2 og h3 i boksen og laver listen. Overskrifter i en åben
// redigeringsformular, og dem der starter med "Rediger", springes over
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
    // Giver overskriften et id, hvis den ikke har et, så vi kan rulle hen til den
    if (!h.id) h.id = 'admin-afsnit-' + naesteId++
    return {
      id: h.id,
      tekst: h.textContent.trim(),
    }
  })
}

// Ruller blødt ned til overskriften med det id
function rulTil(id) {
  const maal = document.getElementById(id)
  if (maal) maal.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Laver listen igen, hver gang der kommer eller forsvinder noget i boksen.
// Den gamle vagt stoppes, før en ny startes
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

// Stopper vagten, når man forlader admin-siden
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
  // Lange lister kan rulles inde i sidebaren
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
