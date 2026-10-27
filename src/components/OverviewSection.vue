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
      <img src="@/assets/images/kort.webp" alt="Kort over GoMonkey Odense" class="overblik-kort">
      <BaseButton variant="primary">Se kort</BaseButton>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/mixins' as m;
@use '@/assets/styles/spacings' as s;

#overblik {
  @include m.section-black100;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: s.$spacing-xl;

  #overblik-tekst {
    max-width: 40rem;
  }

  #kort-wrapper {
    position: relative;
    width: clamp(20rem, 40vw, 35rem);
    height: fit-content;
    margin: auto;

    img {
      width: clamp(20rem, 40vw, 35rem);
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

    button {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1;
    }
  }
}
</style>
