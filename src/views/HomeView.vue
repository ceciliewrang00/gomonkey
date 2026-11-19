<script setup>
  // Forsiden på /. Den samler sektionerne i den rækkefølge, de står på siden

  import AppHeader from '@/components/AppHeader.vue'
  import HeroSection from '@/components/HeroSection.vue'
  import BannerSection from '@/components/BannerSection.vue'
  import OverviewSection from '@/components/OverviewSection.vue'
  import TrackPickerSection from '@/components/TrackPickerSection.vue'
  import TrackInfo from '@/components/TrackInfo.vue'
  import FaqSection from '@/components/FaqSection.vue'
  import StenBue from '@/components/StenBue.vue'
  import Footer from '@/components/Footer.vue'

</script>

<template>
  <AppHeader />
  <!-- forside-klassen giver sektionerne samme bredde (se main.scss) -->
  <main class="forside">
    <HeroSection />
    <!-- Pynt: en blå bue mellem hero og overblikket -->
    <StenBue side="hoejre" farve="blaa" />
    <OverviewSection />
    <TrackPickerSection />
    <BannerSection />
    <!-- Pynt: en lyserød bue mellem banneret og banerne -->
    <StenBue side="hoejre" farve="pink" />
    <TrackInfo />
    <FaqSection />
  </main>
  <Footer />
</template>
