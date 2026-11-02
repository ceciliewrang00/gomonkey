<script setup>
import BaseButton from './BaseButton.vue'
</script>

<template>
  <section id="baner">
    <div id="baner-content">
      <h1>Hvilken bane skal du prøve?</h1>
      <h2>Kan du ikke afgøre, hvor du skal begynde?</h2>
      <p>Svar på fem hurtige spørgsmål, så finder vi den bane, der passer til dig og din gruppe. Det tager under et minut.</p>
      <div class="double-button">
        <BaseButton variant="purple" href="#bane-info">Se banerne</BaseButton>
        <RouterLink class="button-blue" to="/banequiz">Start banevælger</RouterLink>
      </div>
    </div>
    <img src="@/assets/images/bane-img.webp" alt="To personer igang med at udfører en forhindring" class="baner-img">
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/mixins' as m;
@use '@/assets/styles/spacings' as s;
@use '@/assets/styles/flex' as f;

#baner {
  @include m.section-green100;
  // Billedet flugter med venstre kant og teksten med højre kant (se _flex.scss)
  @include f.flex-row-reverse;

  #baner-content{
    min-width: 20rem;
    max-width: s.$tekst-bredde;
  }

  .baner-img {
    // Kun auto op/ned, så billedet stadig centreres lodret ud for teksten
    // margin-block ændrer kun top/bund, så margin-right: auto fra mixinen bevares
    margin-block: auto;
    width: s.$billede-bredde;
    border-radius: 1rem;
  }
}
</style>
