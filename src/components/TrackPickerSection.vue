<script setup>
import BaseButton from './BaseButton.vue'
</script>

<template>
  <section id="baner">
    <h1>Hvilken bane skal du prøve?</h1>
    <h2>Kan du ikke afgøre, hvor du skal begynde?</h2>
    <p>Svar på fem hurtige spørgsmål, så finder vi den bane, der passer til dig og din gruppe. Det tager under et minut.</p>
    <div class="double-button">
      <BaseButton variant="purple">Se banerne</BaseButton>
      <BaseButton variant="blue">Start banevælger</BaseButton>
    </div>
    <img src="@/assets/images/bane-img.svg" alt="To personer igang med at udfører en forhindring" class="baner-img">
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/mixins' as m;

#baner {
  @include m.section-green100;
}
</style>
