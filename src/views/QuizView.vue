<script setup >
  // Siden på /banequiz. Den viser sidehovedet og quizzen (QuizSide.vue)

  import AppHeader from '@/components/AppHeader.vue'

  import QuizSide from '@/components/QuizSide.vue'
</script>

<template>
  <AppHeader />

  <main>
    <QuizSide />
  </main>
</template>