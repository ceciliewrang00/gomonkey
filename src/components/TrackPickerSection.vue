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
        <BaseButton variant="purple" href="#bane__info">Se banerne</BaseButton>
        <BaseButton variant="blue">Start banevælger</BaseButton>
      </div>
    </div>
    <img src="@/assets/images/bane-img.webp" alt="To personer igang med at udfører en forhindring" class="baner-img">
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/mixins' as m;
@use '@/assets/styles/spacings' as s;

#baner {
  @include m.section-green100;
  display: flex;
  flex-direction: row-reverse;
  flex-wrap: wrap;
  gap: s.$spacing-xl;
  justify-content: flex-end;

  #baner-content{
    max-width: 40rem;
  }

  .baner-img {
    margin: auto;
    width: clamp(20rem, 40vw, 35rem);
    border-radius: 1rem;
  }
}
</style>
