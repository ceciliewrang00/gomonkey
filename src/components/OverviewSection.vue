<script setup>
import BaseButton from './BaseButton.vue'
</script>

<template>
  <section id="overblik">
    <h1>Overblik over parken</h1>
    <p>
      Før du kaster dig ud i det, så få styr på terrænet. Kortet viser dig alle vores baner, hvor de starter, og hvor højt du kommer op.
      <br>
      Hver bane har sin egen farve og sit eget niveau, så du nemt kan se, hvor du skal hen.
    </p>
    <div class="kort-wrapper">
      <img src="@/assets/images/kort.svg" alt="Kort over GoMonkey Odense" class="overblik-kort">
      <BaseButton variant="primary">Se kort</BaseButton>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/mixins' as m;

#overblik {
  @include m.section-black100;

  .kort-wrapper {
    position: relative;
    width: 20rem;
    height: fit-content;
    margin: auto;

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
