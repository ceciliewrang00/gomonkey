<script setup>
import BaseButton from './BaseButton.vue'
</script>

<template>
  <section id="hero">
    <img src="@/assets/images/forrest-ikon.svg" alt="Ikon med træer">
    <h2>Forrest Odense</h2>
    <h1>Oplev banerne</h1>
    <h2>GoMonkey Forrest Odense</h2>
    <p>Fra den første forsigtige tur på svævebanen til frit fald fra ti meters højde. Hos GoMonkey er der en bane til alle, uanset om du er en nybegynder eller en erfaren klatreabe.</p>
    <div class="double-button">
      <BaseButton variant="secondary" href="#">Se banerne</BaseButton>
      <BaseButton variant="primary" href="#overblik">Se oversigtskort</BaseButton>
    </div>
  </section>
</template>

<style lang="scss" scoped>
#hero {
  background-image: url('@/assets/images/leaves.svg');
  background-repeat: repeat;
  background-size: 150px;
}
</style>
