<script setup>
// Admin-siden på /admin. Den står for login og for at skifte mellem fanerne
// Baner, Quiz og Kort – hver fane er sin egen fil

import BaseButton from '@/components/BaseButton.vue'

import AdminBaner from '@/components/AdminBaner.vue'
import AdminQuiz from '@/components/AdminQuiz.vue'
import AdminKort from '@/components/AdminKort.vue'

// Menuen i venstre side med overskrifterne fra den åbne fane
import AdminSidebar from '@/components/AdminSidebar.vue'

import { ref, onUnmounted } from 'vue'

import { RouterLink } from 'vue-router'

// Firebase-funktionerne til at logge ind, logge ud og høre, når nogen logger ind eller ud
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

import { auth } from '../firebase'

// Den åbne fane: 'baner', 'quiz' eller 'kort'
const fane = ref('baner')

// Boksen med fanens indhold. Den sendes til sidebaren, så den kan finde overskrifterne
const indhold = ref(null)

// ---------- Login ----------

// Det, der skrives i loginfelterne
const email = ref('')
const adgangskode = ref('')

// Den bruger, der er logget ind (null = ingen)
const bruger = ref(null)

// true, mens Firebase tjekker, om man stadig er logget ind fra sidst
const tjekkerLogin = ref(true)

// Fejlbesked, fx "Login mislykkedes"
const loginFejl = ref('')
// true, mens login er i gang, så knappen ikke kan trykkes to gange
const loggerInd = ref(false)

// "Log ind": Firebase tjekker e-mail og adgangskode. Går det galt, vises en fejlbesked
async function logInd() {
  loginFejl.value = ''
  loggerInd.value = true

  try {
    const resultat = await signInWithEmailAndPassword(auth, email.value.trim(), adgangskode.value)
    bruger.value = resultat.user

    // Tømmer adgangskoden efter login
    adgangskode.value = ''
  } catch (fejl) {
    loginFejl.value = 'Login mislykkedes. Kontrollér e-mail og adgangskode.'
  } finally {
    loggerInd.value = false
  }
}

// "Log ud". Lytteren herunder sætter bruger til null, så loginformularen vises igen
async function logUd() {
  loginFejl.value = ''

  try {
    await signOut(auth)
    adgangskode.value = ''
  } catch (fejl) {
    loginFejl.value = 'Du kunne ikke logges ud. Prøv igen.'
  }
}

// Firebase kører denne funktion, hver gang nogen logger ind eller ud, og når siden åbnes.
// Den giver en stop-funktion tilbage
const stopLoginLytter = onAuthStateChanged(auth, (aktuelBruger) => {
  bruger.value = aktuelBruger
  tjekkerLogin.value = false
})

// Stopper lytteren, når man forlader admin-siden
onUnmounted(() => {
  stopLoginLytter()
})
</script>

<template>
  <main class="admin">
    <!-- Øverste række: logo til venstre, knapper til højre -->
    <div class="head">
      <img src="@/assets/images/logo.svg" alt="GoMonkey logo">

      <div class="double-button">
        <RouterLink to="/" class="button-primary">← Tilbage til forsiden</RouterLink>
        <BaseButton v-if="bruger" type="button" variant="primary" @click="logUd">Log ud</BaseButton>
      </div>
    </div>

    <h1>Admin</h1>

    <!-- Vises, mens Firebase tjekker, om der er et gemt login -->
    <p v-if="tjekkerLogin">Kontrollerer login...</p>

    <!-- Loginformularen. Vises, når man ikke er logget ind -->
    <form v-else-if="!bruger" class="admin-kort" @submit.prevent="logInd">
      <h2>Log ind</h2>

      <label for="admin-email">E-mail</label>
      <input id="admin-email" v-model="email" type="email" autocomplete="username" required />

      <label for="admin-password">Adgangskode</label>
      <input
        id="admin-password"
        v-model="adgangskode"
        type="password"
        autocomplete="current-password"
        required
      />

      <p v-if="loginFejl" role="alert">{{ loginFejl }}</p>

      <div class="knapper">
        <BaseButton type="submit" variant="primary" :disabled="loggerInd">
          {{ loggerInd ? 'Logger ind...' : 'Log ind' }}
        </BaseButton>
      </div>
    </form>

    <!-- Vises, når man er logget ind -->
    <template v-else>
      <p>Logget ind som: {{ bruger.email }}</p>
      <p v-if="loginFejl" role="alert">{{ loginFejl }}</p>

      <!-- Fane-knapperne. Den åbne fane er fyldt ud, de andre har kun kant -->
      <div class="knapper">
        <BaseButton
          type="button"
          :variant="fane === 'baner' ? 'primary' : 'secondary'"
          @click="fane = 'baner'"
        >
          Baner
        </BaseButton>
        <BaseButton
          type="button"
          :variant="fane === 'quiz' ? 'primary' : 'secondary'"
          @click="fane = 'quiz'"
        >
          Quiz
        </BaseButton>
        <BaseButton
          type="button"
          :variant="fane === 'kort' ? 'primary' : 'secondary'"
          @click="fane = 'kort'"
        >
          Kort
        </BaseButton>
      </div>

      <!-- Sidebar til venstre, fanens indhold til højre -->
      <div class="admin-layout">
        <AdminSidebar :omraade="indhold" />

        <!-- Kun den åbne fane vises -->
        <div ref="indhold" class="admin-indhold">
          <AdminBaner v-if="fane === 'baner'" />
          <AdminQuiz v-else-if="fane === 'quiz'" />
          <AdminKort v-else />
        </div>
      </div>
    </template>
  </main>
</template>

<!-- Layout for selve siden -->
<style lang="scss" scoped>
@use '@/assets/styles/fonts' as ft;
@use '@/assets/styles/buttons' as b;
@use '@/assets/styles/spacings' as s;
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/flex' as f;

.admin {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: s.$spacing-xxl s.$spacing-m;
  background-color: c.$forest_green50;

  .head {
    padding: s.$spacing-xs s.$spacing-m;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  // Mobil: sidebar over indholdet. Store skærme: sidebar til venstre
  .admin-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    align-items: start;

    @media (min-width: 900px) {
      grid-template-columns: 16rem minmax(0, 1fr);
    }
  }

  .admin-indhold {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-width: 0;

    // Overskrifterne stopper lidt under toppen, når man ruller ned til dem.
    // :deep gør, at reglen også rammer overskrifterne i fane-filerne
    :deep(h2),
    :deep(h3) {
      scroll-margin-top: 1rem;
    }
  }
}
</style>

<!-- Fælles udseende for felter, bokse og knapper. Ikke scoped, så det også rammer fane-filerne.
     Alt ligger under .admin, så det ikke påvirker resten af siden -->
<style lang="scss">
@use '@/assets/styles/fonts' as ft;
@use '@/assets/styles/colors' as c;

.admin {
  // Fælles udseende for alle felter
  input,
  textarea,
  select {
    display: block;
    width: 100%;
    max-width: 36rem;
    // Padding og kant regnes med i bredden, så feltet ikke bliver for bredt på små skærme
    box-sizing: border-box;
    font-family: ft.$font;
    font-weight: 300;
    // Skriften skalerer med skærmen mellem 1rem og 1.25rem
    font-size: clamp(1rem, 1.5vw, 1.25rem);
    padding: 0.75rem 1rem;
    border: 2px solid c.$forest_green100;
    border-radius: 1rem;
    background-color: c.$primary_light25;
    color: c.$primary_black100;

    // Kanten skifter farve, når man står i feltet
    &:focus {
      outline: none;
      border-color: c.$forest_pink100;
    }
  }

  label {
    display: block;
    margin-top: 1rem;
    margin-bottom: 0.4rem;
    font-weight: 600;
  }

  // Etiket med et (i) ved siden af
  .label-med-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    margin-bottom: 0.4rem;

    label {
      margin: 0;
    }
  }

  // (i)-knappen og forklaringsboblen – samme udseende som i TrackInfo.vue
  .info {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  // Rund knap uden baggrund
  .info__knap {
    display: inline-grid;
    place-items: center;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: none;
    color: c.$primary_black50;
    cursor: pointer;
    transition: color 0.2s ease;

    &:hover,
    &[aria-expanded="true"] {
      color: c.$primary_black100;
    }

    &:focus-visible {
      outline: 3px solid c.$secondary_purple100;
      outline-offset: 2px;
    }
  }

  // Boblen ligger over knappen, så den ikke dækker feltet
  .info__boble {
    position: absolute;
    bottom: calc(100% + 0.6rem);
    left: 0;
    z-index: 5;
    width: min(18rem, 80vw);
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background-color: c.$primary_darkgreen;
    color: c.$primary_light25;
    font-size: 0.85rem;
    font-weight: 400;
    line-height: 1.45;
    box-shadow: 0 0.5rem 1.5rem rgba(c.$primary_darkgreen, 0.25);
  }

  // Lys, afrundet boks om hvert afsnit
  .admin-kort {
    padding: 1.5rem;
    background-color: c.$forest_green25;
    border: 2px solid c.$forest_green100;
    border-radius: 1rem;

    li {
      margin-bottom: 0.5rem;
      line-height: 1.5;
    }
  }

  .admin-liste {
    display: grid;
    // Kolonnen må blive smallere end indholdet, så en lang ting ikke skubber kassen ud over skærmen
    grid-template-columns: minmax(0, 1fr);
    gap: 1rem;
    max-width: 60rem;
  }

  .redigering {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid c.$primary_black100;
  }

  .felter,
  .felt {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  // Forhåndsvisning af banens billede. Hele billedet vises uden at blive strakt
  .bane-billede {
    width: 100%;
    max-width: 20rem;
    height: auto;
    object-fit: contain;
    box-sizing: border-box;
    padding: 0.5rem;
    border-radius: 0.75rem;
  }

  // Knapper ved siden af hinanden, der ombrydes på små skærme
  .knapper {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  // Gør deaktiverede knapper tydelige
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>