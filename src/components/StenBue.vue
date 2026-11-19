<script setup>
// Pynt: en farvet bue, der hænger hen over overgangen mellem to sektioner på forsiden

// side = hvilken kant buen sidder ved ('venstre' eller 'hoejre'), farve = 'pink' eller 'blaa'
defineProps({
  side: { type: String, default: 'hoejre' },
  farve: { type: String, default: 'pink' },
})
</script>

<template>
  <div class="sten-bue" :class="`sten-bue--${side}`" aria-hidden="true">
    <span class="sten-bue__form" :class="`sten-bue__form--${farve}`"></span>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;

// Buens bredde – bruges også til at skubbe den lidt ud over kanten
$bredde: clamp(8rem, 15vw, 13rem);

/* Rækken har ingen højde, så den ikke skubber noget.
   Det, der stikker ud til siden, skæres af, så siden ikke kan scrolles sidelæns */
.sten-bue {
  position: relative;
  z-index: 1;
  height: 0;
  display: flex;
  // Ellers bliver buen strakt ud til rækkens højde (0) og forsvinder
  align-items: flex-start;
  overflow-x: clip;
  overflow-y: visible;
  pointer-events: none;
}

.sten-bue--hoejre {
  justify-content: flex-end;
}

.sten-bue--venstre {
  justify-content: flex-start;
}

.sten-bue__form {
  display: block;
  flex-shrink: 0;
  width: $bredde;
  aspect-ratio: 42.71 / 40.91;
  -webkit-mask: url('/sten4.svg') center / contain no-repeat;
  mask: url('/sten4.svg') center / contain no-repeat;
}

// Højre: spejlvendt og lidt ude over højre kant
.sten-bue--hoejre .sten-bue__form {
  margin-right: calc(#{$bredde} * -0.15);
  transform: translateY(-62%) scaleX(-1);
}

// Venstre: lidt ude over venstre kant
.sten-bue--venstre .sten-bue__form {
  margin-left: calc(#{$bredde} * -0.15);
  transform: translateY(-62%);
}

.sten-bue__form--pink {
  background-color: c.$forest_pink100;
}

.sten-bue__form--blaa {
  background-color: c.$secondary_purple100;
}
</style>
