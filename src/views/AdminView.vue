<script setup>
// ---------- Imports ----------

// Vores egen knap-komponent
import BaseButton from '@/components/BaseButton.vue'

// De to dele af admin-siden
import AdminBaner from '@/components/AdminBaner.vue'
import AdminQuiz from '@/components/AdminQuiz.vue'

// ref = en værdi Vue holder øje med. onUnmounted = kører, når man forlader siden
import { ref, onUnmounted } from 'vue'

// RouterLink = link til en anden side i appen
import { RouterLink } from 'vue-router'

// Firebase-funktioner til login, logout og overvågning af loginstatus
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

// Firebase-loginforbindelsen fra vores egen fil
import { auth } from '../firebase'

// Hvilken del af admin-siden der vises: 'baner' eller 'quiz'
const fane = ref('baner')

// ---------- Login ----------

const email = ref('')
const adgangskode = ref('')

// Den bruger, der er logget ind (null = ingen)
const bruger = ref(null)

// true, mens Firebase undersøger, om der allerede er et gemt login
const tjekkerLogin = ref(true)

const loginFejl = ref('')
const loggerInd = ref(false)

async function logInd() {
  loginFejl.value = ''
  loggerInd.value = true

  try {
    // Firebase kontrollerer e-mail og adgangskode
    const resultat = await signInWithEmailAndPassword(auth, email.value.trim(), adgangskode.value)
    bruger.value = resultat.user

    // Tømmer adgangskoden efter vellykket login
    adgangskode.value = ''
  } catch (fejl) {
    loginFejl.value = 'Login mislykkedes. Kontrollér e-mail og adgangskode.'
  } finally {
    loggerInd.value = false
  }
}

async function logUd() {
  loginFejl.value = ''

  try {
    // Loginlytteren herunder opdaterer bruger bagefter.
    // AdminBaner og AdminQuiz forsvinder fra siden og nulstilles af sig selv
    await signOut(auth)
    adgangskode.value = ''
  } catch (fejl) {
    loginFejl.value = 'Du kunne ikke logges ud. Prøv igen.'
  }
}

// Lytter efter login og logout, også når siden genindlæses.
// Funktionen returnerer en stopfunktion, som vi bruger til oprydning
const stopLoginLytter = onAuthStateChanged(auth, (aktuelBruger) => {
  bruger.value = aktuelBruger
  tjekkerLogin.value = false
})

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
        <RouterLink to="/" class="button-pink">← Tilbage til forsiden</RouterLink>
        <!-- Log ud vises kun, når man er logget ind -->
        <BaseButton v-if="bruger" type="button" variant="pink" @click="logUd">Log ud</BaseButton>
      </div>
    </div>

    <h1>Admin</h1>

    <!-- Vises, mens Firebase undersøger, om der er et gemt login -->
    <p v-if="tjekkerLogin">Kontrollerer login...</p>

    <!-- Loginformular. Vises, når man ikke er logget ind -->
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
        <BaseButton type="submit" variant="pink" :disabled="loggerInd">
          {{ loggerInd ? 'Logger ind...' : 'Log ind' }}
        </BaseButton>
      </div>
    </form>

    <!-- Alt herunder vises, når man ER logget ind -->
    <template v-else>
      <p>Logget ind som: {{ bruger.email }}</p>
      <p v-if="loginFejl" role="alert">{{ loginFejl }}</p>

      <!-- Skifter mellem baner og quiz. Den valgte fane er fyldt ud -->
      <div class="knapper">
        <BaseButton
          type="button"
          :variant="fane === 'baner' ? 'primary' : 'pink'"
          @click="fane = 'baner'"
        >
          Baner
        </BaseButton>
        <BaseButton
          type="button"
          :variant="fane === 'quiz' ? 'primary' : 'pink'"
          @click="fane = 'quiz'"
        >
          Quiz
        </BaseButton>
      </div>

      <!-- Hver del henter og gemmer selv sine data -->
      <AdminBaner v-if="fane === 'baner'" />
      <AdminQuiz v-else />
    </template>
  </main>
</template>

<!-- Layout for selve siden. Scoped = gælder kun i denne fil -->
<style lang="scss" scoped>
@use '@/assets/styles/buttons' as b;
@use '@/assets/styles/spacings' as s;
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/flex' as f;

.admin {
  min-height: 100vh;
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: s.$spacing-xxl s.$spacing-m;
  background-color: c.$forest_green25;

  // Øverste række: logo til venstre, knapper til højre
  .head {
    padding: s.$spacing-xs s.$spacing-m;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>

<!-- Fælles udseende for felter, bokse og knapper.
     IKKE scoped, for ellers rammer det ikke indholdet inde i AdminBaner og AdminQuiz.
     Alt ligger under .admin, så det ikke påvirker resten af sitet -->
<style lang="scss">
@use '@/assets/styles/colors' as c;

.admin {
  // Fælles udseende for ALLE felter på siden
  input,
  textarea,
  select {
    display: block;
    width: 100%;
    max-width: 36rem;
    font-family: "Inter", sans-serif;
    font-weight: 300;
    // clamp: skriften skalerer med skærmen, men aldrig under 1rem eller over 1.25rem
    font-size: clamp(1rem, 1.5vw, 1.25rem);
    padding: 0.75rem 1rem;
    border: 2px solid c.$forest_green100;
    border-radius: 1rem;
    background-color: white;
    color: c.$primary_black100;

    // Når man står i et felt, skifter kanten farve
    &:focus {
      outline: none;
      border-color: c.$forest_pink100;
    }
  }

  // Alle feltetiketter ligger over feltet
  label {
    display: block;
    margin-top: 1rem;
    margin-bottom: 0.4rem;
    font-weight: 600;
  }

  // Lys, afrundet boks om hvert afsnit
  .admin-kort {
    padding: 1.5rem;
    background-color: c.$primary_light25;
    border-radius: 1rem;

    li {
      margin-bottom: 0.5rem;
      line-height: 1.5;
    }
  }

  // Spørgsmålskortene ligger under hinanden
  .admin-liste {
    display: grid;
    gap: 1rem;
    max-width: 60rem;
  }

  // Redigeringsformularen sidder inde i spørgsmålskortet
  .redigering {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid c.$primary_black100;
  }

  // Bane-formularens felter: label og felt under hinanden
  .felter,
  .felt {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  // Rækker med knapper: ligger ved siden af hinanden og ombrydes på små skærme
  .knapper {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  // Gør ventetilstanden synlig på deaktiverede knapper
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>