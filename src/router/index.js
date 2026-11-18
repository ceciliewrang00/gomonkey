// ROUTEREN – bestemmer, hvilken side der vises ud fra adressen
// Den slås til i main.js, og siden vises i <RouterView /> i App.vue.
// Links mellem siderne laves med <RouterLink to="/kort"> i stedet for <a href>,
// så siden skifter uden at hele browseren genindlæser.

import { createRouter, createWebHistory } from 'vue-router'

// De fire sider (views). Hver side samler en række komponenter fra src/components
import HomeView from '../views/HomeView.vue'
import AdminView from '@/views/AdminView.vue'
import QuizView from '@/views/QuizView.vue'
import KortView from '@/views/KortView.vue'

const router = createRouter({
  // createWebHistory giver "pæne" adresser som /kort (uden # i adressen)
  history: createWebHistory(import.meta.env.BASE_URL),
  // Bestemmer scroll-positionen ved sideskift.
  // Bruger man browserens tilbage/frem, huskes den gamle position (savedPosition).
  // Linker man til en sektion (fx #skala-forklaring), scrolles der ned til den.
  // top: 96 giver plads til den sticky header, så den ikke dækker sektionen.
  // Ellers starter den nye side altid i toppen
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      // Banekortene hentes fra Firebase, så de findes først lidt efter, at siden er vist
      // (fx når man kommer fra "Læs mere om banen" på kortet).
      // Derfor venter vi op til 3 sekunder på, at elementet dukker op, før vi scroller
      return new Promise((resolve) => {
        const start = Date.now()
        const led = () => {
          if (document.querySelector(to.hash)) {
            resolve({ el: to.hash, top: 96, behavior: 'smooth' })
          } else if (Date.now() - start > 3000) {
            resolve({ top: 0 })
          } else {
            setTimeout(led, 100)
          }
        }
        led()
      })
    }
    return { top: 0 }
  },
  // Listen over sider: path = adressen, component = den side, der vises
  routes: [
    {
      // Forsiden
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      // Banevælgeren (quizzen) – linkes fra "Start banevælger" på forsiden
      path: '/banequiz',
      name: 'quiz',
      component: QuizView
    },
    {
      // Det interaktive kort – linkes fra "Se det fulde kort" på forsiden
      path: '/kort',
      name: 'kort',
      component: KortView
    },
    {
      // Admin – kræver login. Der er ikke noget link til den, man skriver adressen selv
      path: '/admin',
      name: 'admin',
      component: AdminView
    },
  ],
})

export default router
