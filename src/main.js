// Den første fil, der kører. Den bygger Vue-appen og sætter den ind i <div id="app"> i index.html

import { createApp } from 'vue'

// Den yderste komponent, som alle sider vises inde i
import App from './App.vue'

// De fælles styles, som gælder på alle sider
import './assets/styles/main.scss'

// Routeren vælger siden ud fra adressen
import router from './router'

// Laver appen, slår routeren til og viser den i <div id="app">
createApp(App).use(router).mount('#app')
