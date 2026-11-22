<script setup>
  // Forsiden på /. Den samler sektionerne i den rækkefølge, de står på siden

  import AppHeader from '@/components/AppHeader.vue'
  import SektionsMenu from '@/components/SektionsMenu.vue'
  import HeroSection from '@/components/HeroSection.vue'
  import OverviewSection from '@/components/OverviewSection.vue'
  import TrackPickerSection from '@/components/TrackPickerSection.vue'
  import TrackInfo from '@/components/TrackInfo.vue'
  import PrisSection from '@/components/PrisSection.vue'
  import FoelgBarnetSection from '@/components/FoelgBarnetSection.vue'
  import FaqSection from '@/components/FaqSection.vue'
  import Footer from '@/components/Footer.vue'

</script>

<template>
  <AppHeader />
  <!-- forside-klassen giver sektionerne samme bredde (se main.scss) -->
  <main class="forside">
    <!-- Sidens egen menu med genveje til sektionerne. Bliver hængende under headeren, når man scroller -->
    <SektionsMenu />
    <HeroSection />
    <OverviewSection />
    <TrackPickerSection />
    <TrackInfo />
    <!-- Priser for børn og voksne. Menuens "Priser" linker hertil -->
    <PrisSection />
    <!-- Hvad den voksne kan gøre, mens barnet klatrer -->
    <FoelgBarnetSection />
    <FaqSection />
  </main>
  <Footer />
</template>
