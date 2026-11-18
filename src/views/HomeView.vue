<script setup>
  // FORSIDEN (adressen /, se src/router/index.js)
  // Siden har ingen logik selv. Den samler bare sektionerne i den rækkefølge,
  // de står på siden. Hver sektion er sin egen komponent i src/components,
  // og de, der viser baner (hero, overblik, banekort), henter selv data fra Firebase
  // via services/baner.js – så de altid viser de samme baner.
  //
  // Rækkefølgen oppefra:
  // AppHeader        – logo, menu og "BOOK"-knap (sticky i toppen)
  // HeroSection      – stort billede med wire, badges og vejret
  // OverviewSection  – kortet over parken + banernes farver (link til /kort)
  // TrackPickerSection – "Find din bane" (link til quizzen på /banequiz)
  // BannerSection    – "Skru' op for modet" med bookingknap
  // TrackInfo        – et kort for hver bane med sværhedsgrad og fakta
  // FaqSection       – ofte stillede spørgsmål
  // Footer           – links, kontakt og sociale medier
  // StenBue er kun pynt mellem to sektioner
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
  <!-- forside-klassen giver sektionerne samme indholdsbredde (se main.scss) -->
  <main class="forside">
    <HeroSection />
    <!-- Blå bue i højre side hen over overgangen fra hero til overblikket -->
    <StenBue side="hoejre" farve="blaa" />
    <OverviewSection />
    <TrackPickerSection />
    <BannerSection />
    <!-- Lyserød bue i højre side hen over overgangen fra banneret til banerne -->
    <StenBue side="hoejre" farve="pink" />
    <TrackInfo />
    <FaqSection />
  </main>
  <Footer />
</template>

