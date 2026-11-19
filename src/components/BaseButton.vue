<script setup>
// Vores egen knap, som bruges overalt. Udseendet kommer fra _buttons.scss

import { computed } from 'vue'

// variant = hvordan knappen ser ud ('primary', 'secondary', 'pink', 'light' eller 'header').
// href = har knappen en adresse, bliver den et link (<a>), ellers en <button>
const props = defineProps({
  variant: { type: String, default: 'primary' },
  href: String
})

// 'pink' og 'light' er farver af den primære knap, så de får begge klasser
const farveVarianter = ['pink', 'light']

// Vælger klasserne ud fra variant, fx 'pink' → ['button-primary', 'button-pink']
const klasser = computed(() =>
  farveVarianter.includes(props.variant)
    ? ['button-primary', `button-${props.variant}`]
    : [`button-${props.variant}`]
)
</script>

<template>
  <!-- Bliver et <a> eller en <button> alt efter href. Knappens tekst kommer ind i <slot /> -->
  <component :is="href ? 'a' : 'button'" :href="href" :class="klasser">
    <slot />
  </component>
</template>
