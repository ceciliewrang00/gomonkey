<script setup>
import BaseButton from './BaseButton.vue'
</script>

<template>
  <section id="overblik">
    <div id="overblik-tekst">
      <h1>Overblik over parken</h1>
      <p>
        Før du kaster dig ud i det, så få styr på terrænet. Kortet viser dig alle vores baner, hvor de starter, og hvor højt du kommer op.
        <br>
        Hver bane har sin egen farve og sit eget niveau, så du nemt kan se, hvor du skal hen.
      </p>
    </div>
    <div id="kort-wrapper">
      <img src="@/assets/images/gomonkeykort.webp" alt="Kort over GoMonkey Odense" class="overblik-kort">
      <RouterLink class="button-primary" to="/kort">Se kort</RouterLink>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/mixins' as m;
@use '@/assets/styles/spacings' as s;
@use '@/assets/styles/flex' as f;

#overblik {
  @include m.section-black100;
  @include f.flex-row;
  // Teksten flugter med venstre kant og kortet med højre kant (samme kanter som hero og banner)
  justify-content: space-between;

  #overblik-tekst {
    min-width: 20rem;
    max-width: s.$tekst-bredde;
  }

  #kort-wrapper {
    position: relative;
    width: s.$billede-bredde;
    height: fit-content;
    // Kun auto op/ned, så kortet stadig centreres lodret ud for teksten.
    // auto til siderne ville skubbe kortet væk fra teksten
    margin: auto 0;

    img {
      width: s.$billede-bredde;
      height: auto;
    }

    &:after {
      content: "";
      position: absolute;
      inset: 0;
      background-color: rgb(c.$primary_light50, 0.25);
      border-radius: 1rem;
    }

    .overblik-kort {
      border-radius: 1rem;
    }

    .button-primary {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1;
    }
  }
}
</style>
