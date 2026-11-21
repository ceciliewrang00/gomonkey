// Routeren vælger, hvilken side der vises ud fra adressen. Siden vises i <RouterView /> i App.vue

import { createRouter, createWebHistory } from 'vue-router'

// De fire sider
import HomeView from '../views/HomeView.vue'
import AdminView from '@/views/AdminView.vue'
import QuizView from '@/views/QuizView.vue'
import KortView from '@/views/KortView.vue'

const router = createRouter({
  // Giver adresser som /kort uden # i
  history: createWebHistory(import.meta.env.BASE_URL),

  // Bestemmer, hvor man står på siden efter et sideskift. Tilbage/frem husker den gamle position,
  // et link til en sektion (#...) scroller derned med plads til headeren med ankermenuen (top: 140)
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      // Banekortene hentes fra Firebase og findes først lidt senere,
      // så vi leder efter sektionen hvert 100. millisekund i op til 3 sekunder
      return new Promise((resolve) => {
        const start = Date.now()
        const led = () => {
          if (document.querySelector(to.hash)) {
            resolve({ el: to.hash, top: 140, behavior: 'smooth' })
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

  // Siderne: path = adressen, component = siden
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/banequiz',
      name: 'quiz',
      component: QuizView
    },
    {
      path: '/kort',
      name: 'kort',
      component: KortView
    },
    {
      // Admin kræver login, og der er intet link til den
      path: '/admin',
      name: 'admin',
      component: AdminView
    },
  ],
})

export default router
