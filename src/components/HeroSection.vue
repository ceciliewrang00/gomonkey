<script setup>
import BaseButton from './BaseButton.vue'
</script>

<template>
  <section id="hero">
    <div id="hero__content">
      <div id="hero__content__title">
        <div class="forest-icon">
          <img src="@/assets/images/forrest-ikon.webp" alt="Ikon med træer" class="icon">
          <h2>Forrest Odense</h2>
        </div>
        <h1>Oplev banerne</h1>
        <h2>GoMonkey Forrest Odense</h2>
      </div>
      <p>Fra den første forsigtige tur på svævebanen til frit fald fra ti meters højde. Hos GoMonkey er der en bane til alle, uanset om du er en nybegynder eller en erfaren klatreabe.</p>
      <div class="double-button">
        <BaseButton variant="secondary" href="#bane__info">Se banerne</BaseButton>
        <BaseButton variant="primary" href="#overblik">Se oversigtskort</BaseButton>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>

@use '@/assets/styles/spacings' as s;

#hero {
  background-image: url('@/assets/images/leaves.svg');
  background-repeat: repeat;
  background-size: 150px;
  display: flex;
  flex-direction: column;

  #hero__content {
    max-width: 40rem;
  

    #hero__content__title {
      display: flex;
      flex-direction: column;
    }
  }
}

.forest-icon {
  display: flex;
  flex-direction: row;
  gap: 1.5rem;
  align-items: flex-end;
}

.icon {
    width: 3rem;
    height: 3rem;
  }
</style>
