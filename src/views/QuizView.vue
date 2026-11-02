<script setup >
  // Siden på adressen /banequiz (se src/router/index.js).
  // Den samler bare sidehovedet og quizzen. Al logik ligger i QuizSide.vue
  import AppHeader from '@/components/AppHeader.vue'
  import QuizSide from '@/components/QuizSide.vue'
</script>

<template>
  <!-- Sidehovedet med logo og menu -->
  <AppHeader />

  <main>
    <!-- Selve quizzen -->
    <QuizSide />
  </main>
</template>