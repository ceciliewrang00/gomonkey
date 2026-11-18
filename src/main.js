// STARTFILEN – det første, der kører, når siden åbnes
// index.html har et tomt <div id="app">. Her bygger vi Vue-appen og sætter den ind i det div.
//
// Sådan hænger det sammen:
// main.js → App.vue → RouterView → den side, adressen peger på (se router/index.js)
//   /          → HomeView.vue  (forsiden)
//   /banequiz  → QuizView.vue  (banevælgeren)
//   /kort      → KortView.vue  (det interaktive kort)
//   /admin     → AdminView.vue (redigering af data i Firebase)

import { createApp } from 'vue'

// Rodkomponenten – den yderste "kasse", som alle sider vises inde i
import App from './App.vue'

// De fælles styles (farver, skrift, knapper, luft om sektioner), som gælder på alle sider
import './assets/styles/main.scss'

// Routeren bestemmer, hvilken side der vises ud fra adressen i browseren
import router from './router'

// Lav appen, slå routeren til, og vis det hele i <div id="app">
createApp(App).use(router).mount('#app')
