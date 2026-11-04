<script setup>
</script>

<template>
  <section id="banner">
    <h2>Skru’ op for modet</h2>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;

#banner {
  background-image: url('@/assets/images/gomonkey_bane.webp');
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
  color: c.$primary_light25;

  min-height: 30vh;
  
  display: flex;
  align-items: center;
  justify-content: flex-start; /* Rykker teksten mod venstre */
  
}
</style>
