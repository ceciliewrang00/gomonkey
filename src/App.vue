<script setup>
import AppHeader from '@/components/AppHeader.vue'
import HeroSection from '@/components/HeroSection.vue'
import BannerSection from '@/components/BannerSection.vue'
import OverviewSection from '@/components/OverviewSection.vue'
import TrackPickerSection from '@/components/TrackPickerSection.vue'
import TrackInfo from '@/components/TrackInfo.vue'
</script>

<template>
  <AppHeader />
  <main>
    <HeroSection />
    <BannerSection />
    <OverviewSection />
    <TrackPickerSection />
    <TrackInfo />
  </main>
</template>
