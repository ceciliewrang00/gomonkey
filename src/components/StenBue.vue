<script setup>
// STEN-BUE – ren pynt
// En stor farvet bue (formen fra public/sten4.svg), der hænger hen over overgangen
// mellem to sektioner på forsiden. Den sættes ind i HomeView.vue mellem to sektioner.
// aria-hidden="true" i templaten = skærmlæsere springer den over, da den kun er pynt.
//
// Props (det, man giver den med i HomeView):
//   side:  'venstre' eller 'hoejre' – hvilken kant buen sidder ved (den er lidt skåret af kanten)
//   farve: 'pink' eller 'blaa'
// De bliver til klasser, fx sten-bue--hoejre og sten-bue__form--pink, som CSS'en styler
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

// Bredden på buen – bruges også til at skubbe den lidt ud over kanten
$bredde: clamp(8rem, 15vw, 13rem);

/* Rækken har ingen højde, så den ikke skubber noget. Buen sidder hen over overgangen
   – mest oppe i sektionen over. overflow-x: clip skærer det af, der stikker ud til siden
   (så siden ikke kan scrolles sidelæns), mens buen stadig må stikke op og ned */
.sten-bue {
  position: relative;
  z-index: 1;
  height: 0;
  display: flex;
  // flex-start: ellers bliver buen strakt ud til rækkens højde (0) og forsvinder
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

// Højre: spejlvendt, så åbningen vender ind mod siden. En lille del er ude over højre kant
.sten-bue--hoejre .sten-bue__form {
  margin-right: calc(#{$bredde} * -0.15);
  transform: translateY(-62%) scaleX(-1);
}

// Venstre: åbningen vender mod højre. En lille del er ude over venstre kant
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
