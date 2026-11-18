<script setup>
// BASEBUTTON – vores egen knap, som bruges overalt på sitet
// I stedet for at skrive klasserne på hver eneste knap, skriver man fx:
//   <BaseButton variant="primary" href="/kort">Se kortet</BaseButton>
// Udseendet kommer fra _buttons.scss.
//
// Props (det, man kan give knappen med):
//   variant = hvordan knappen ser ud: 'primary', 'secondary', 'pink', 'light' eller 'header'
//   href    = har knappen en adresse, bliver den et link (<a>). Ellers en almindelig <button>
import { computed } from 'vue'

const props = defineProps({
  variant: { type: String, default: 'primary' },
  href: String
})

// 'pink' og 'light' er bare andre farver af den primære knap.
// Derfor skal de have BÅDE .button-primary (formen) og deres egen farve-klasse
const farveVarianter = ['pink', 'light']

// Klasserne, knappen får. Eksempler:
//   variant 'pink'      → ['button-primary', 'button-pink']
//   variant 'secondary' → ['button-secondary']
// "a ? b : c" betyder: er a sandt, så b – ellers c
const klasser = computed(() =>
  farveVarianter.includes(props.variant)
    ? ['button-primary', `button-${props.variant}`]
    : [`button-${props.variant}`]
)
</script>

<template>
  <!-- <component :is="..."> laver enten et <a> eller en <button>, alt efter om der er en href.
       <slot /> er "hullet", hvor knappens tekst kommer ind (det, man skriver mellem tags) -->
  <component :is="href ? 'a' : 'button'" :href="href" :class="klasser">
    <slot />
  </component>
</template>
