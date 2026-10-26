<script setup>
// computed = en værdi, der regner sig selv ud fra andre værdier 
import { computed } from 'vue'

// Modtager farve og nummer fra TrackInfo
const props = defineProps({
  color: String,
  number: [String, Number]
})

// Oversætter farven fra databasen til et klassenavn uden æ/ø/å
const classMap = {
  grøn: 'groen',
  blå: 'blaa',
  rød: 'roed',
  sort: 'sort',
  brun: 'brun'
}

// Finder den rigtige CSS-klasse til farven (ukendt farve = default)
const colorClass = computed(() => `layer--${classMap[props.color] ?? 'default'}`)

// Databasen gemmer nummeret som tekst, så vi gør det til et tal
const layers = computed(() => Number(props.number) || 1)

// Forreste blad er tydeligt, bladene bagved er mere gennemsigtige
function opacityFor(n) {
  return Math.max(1 - (layers.value - n) * 0.3, 0.25)
}
</script>

<template>
  <!-- Boksen bliver bredere, jo flere blade der er -->
  <div class="badge" :style="{ width: 55 + (layers - 1) * 14 + 'px' }">
    <!-- Ét blad pr. nummer (v-for gentager svg'en) -->
    <svg
      v-for="n in layers"
      :key="n"
      class="layer"
      :class="colorClass"
      viewBox="0 0 55 64"
      :style="{
        right: (n - 1) * 14 + 'px',
        opacity: opacityFor(n),
      }"
    >
      <!-- Selve bladet -->
      <path d="M23.0276 59.6511C22.875 59.9555 22.06 60.2471 21.7352 60.2097C21.3571 60.1646 20.6443 59.4991 20.6461 59.096L20.5995 53.9768C14.4015 50.052 13.1281 42.9775 13.9766 36.008C14.6373 30.5236 16.3876 25.4719 18.9178 20.4895C22.3177 13.7807 25.1533 7.06931 27.5489 0C32.1661 4.88277 35.5376 10.1433 37.8317 16.1097C40.4021 22.9977 41.277 30.1423 40.0676 37.3769C38.3534 46.3061 34.3657 52.1329 25.5339 54.4701L23.0276 59.6511Z" />
    </svg>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;

// Kobler klassenavne til farverne fra _colors.scss
$track-colors: (
  groen: c.$forest_green100,
  blaa: c.$secondary_blue100,
  roed: c.$secondary_orange100,
  sort: c.$primary_black100,
  brun: c.$secondary_peach100,
  default: c.$primary_black50
);

.badge {
  position: relative;
  height: 64px;
}

// Bladene ligger oven på hinanden
.layer {
  position: absolute;
  top: 0;
  width: 55px;
  height: 64px;
}

// Laver en klasse pr. farve, fx .layer--groen
@each $name, $value in $track-colors {
  .layer--#{$name} {
    fill: $value;
  }
}
</style>