<script setup>
// ADMIN-SIDEN (adressen /admin)
// Her kan GoMonkey selv rette indholdet på sitet uden at røre koden.
// Først skal man logge ind. Derefter kan man skifte mellem tre faner:
// - Baner: ret teksterne og tallene om banerne (AdminBaner.vue)
// - Quiz:  ret quizzens spørgsmål og svar (AdminQuiz.vue)
// - Kort:  ret, hvor banerne går på kortet, og teksterne i kortfiltret (AdminKort.vue)
// Denne fil står KUN for login og for at skifte fane.
// Hver fane er sin egen fil, som selv henter og gemmer sine data.

// ---------- Imports ----------

// Vores egen knap-komponent
import BaseButton from '@/components/BaseButton.vue'

// De tre faner
import AdminBaner from '@/components/AdminBaner.vue'
import AdminQuiz from '@/components/AdminQuiz.vue'
import AdminKort from '@/components/AdminKort.vue'

// Menuen i venstre side med overskrifterne fra den åbne fane
import AdminSidebar from '@/components/AdminSidebar.vue'

// ref = en værdi Vue holder øje med. onUnmounted = kører, når man forlader siden
import { ref, onUnmounted } from 'vue'

// RouterLink = link til en anden side i appen
import { RouterLink } from 'vue-router'

// Firebase-funktioner: log ind, log ud, og "sig til, når nogen logger ind eller ud"
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

// Firebase-loginforbindelsen fra vores egen fil
import { auth } from '../firebase'

// Hvilken fane der er åben: 'baner', 'quiz' eller 'kort'. Starter på 'baner'
const fane = ref('baner')

// Boksen, som fanens indhold står i (ref="indhold" i templaten).
// Den sendes til sidebaren, så den kan finde overskrifterne derinde
const indhold = ref(null)

// ---------- Login ----------

// Det, der skrives i loginfelterne (forbundet med v-model i templaten)
const email = ref('')
const adgangskode = ref('')

// Den bruger, der er logget ind (null = ingen)
const bruger = ref(null)

// true, mens Firebase tjekker, om man allerede er logget ind fra sidst
// (Firebase husker et login, også hvis man genindlæser siden)
const tjekkerLogin = ref(true)

// loginFejl = fejlbesked, fx "Login mislykkedes".
// loggerInd = true, mens login er i gang (så knappen bliver grå og ikke kan trykkes to gange)
const loginFejl = ref('')
const loggerInd = ref(false)

// Kører, når man trykker "Log ind".
// async/await = vent på, at Firebase svarer, før vi går videre.
// try = prøv det her. catch = gik det galt (fx forkert adgangskode), så gør det her.
// finally = kører altid til sidst, uanset om det gik godt eller skidt
async function logInd() {
  loginFejl.value = ''
  loggerInd.value = true

  try {
    // Firebase tjekker e-mail og adgangskode. .trim() fjerner mellemrum før og efter e-mailen
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

// Logger ud, når man trykker "Log ud"
async function logUd() {
  loginFejl.value = ''

  try {
    // Vi behøver ikke selv sætte bruger til null – det gør "lytteren" herunder.
    // Når bruger er null, viser templaten loginformularen i stedet for fanerne
    await signOut(auth)
    adgangskode.value = ''
  } catch (fejl) {
    loginFejl.value = 'Du kunne ikke logges ud. Prøv igen.'
  }
}

// "LYTTEREN": Firebase kører funktionen her, hver gang nogen logger ind eller ud –
// og én gang, når siden åbnes (så vi ved, om man stadig er logget ind fra sidst).
// aktuelBruger er brugeren, eller null, hvis ingen er logget ind.
// onAuthStateChanged giver en "stop-knap" tilbage, som vi gemmer i stopLoginLytter
const stopLoginLytter = onAuthStateChanged(auth, (aktuelBruger) => {
  bruger.value = aktuelBruger
  tjekkerLogin.value = false
})

// Når man forlader admin-siden, trykker vi på stop-knappen, så lytteren ikke kører videre
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
        <!-- Log ud vises kun, når man er logget ind -->
        <BaseButton v-if="bruger" type="button" variant="primary" @click="logUd">Log ud</BaseButton>
      </div>
    </div>

    <h1>Admin</h1>

    <!-- Vises, mens Firebase undersøger, om der er et gemt login -->
    <p v-if="tjekkerLogin">Kontrollerer login...</p>

    <!-- Loginformular. Vises, når man ikke er logget ind.
         @submit.prevent kører logInd og stopper browseren i at genindlæse siden.
         v-model forbinder feltet med variablen, så de altid har samme indhold -->
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

    <!-- Alt herunder vises, når man ER logget ind -->
    <template v-else>
      <p>Logget ind som: {{ bruger.email }}</p>
      <p v-if="loginFejl" role="alert">{{ loginFejl }}</p>

      <!-- Fane-knapperne. Et klik sætter fane til knappens navn.
           Den åbne fane får variant 'primary' (fyldt ud), de andre 'secondary' (kun kant) -->
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

      <!-- Sidebar med overskrifter til venstre, fanens indhold til højre -->
      <div class="admin-layout">
        <AdminSidebar :omraade="indhold" />

        <!-- Kun den åbne fane vises (v-if / v-else-if / v-else).
             Hver fane henter og gemmer selv sine data -->
        <div ref="indhold" class="admin-indhold">
          <AdminBaner v-if="fane === 'baner'" />
          <AdminQuiz v-else-if="fane === 'quiz'" />
          <AdminKort v-else />
        </div>
      </div>
    </template>
  </main>
</template>

<!-- Layout for selve siden. Scoped = gælder kun i denne fil -->
<style lang="scss" scoped>
@use '@/assets/styles/fonts' as ft;
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

  // Samme luft mellem elementerne som resten af admin-siden
  .admin-indhold {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-width: 0;

    // Overskrifterne stopper lidt under toppen, når man ruller ned til dem.
    // :deep = reglen må også ramme overskrifter inde i fane-filerne (ellers stopper scoped den)
    :deep(h2),
    :deep(h3) {
      scroll-margin-top: 1rem;
    }
  }
}
</style>

<!-- Fælles udseende for felter, bokse og knapper.
     IKKE scoped, for ellers rammer det ikke indholdet inde i AdminBaner, AdminQuiz og AdminKort.
     Alt ligger under .admin, så det ikke påvirker resten af sitet -->
<style lang="scss">
@use '@/assets/styles/fonts' as ft;
@use '@/assets/styles/colors' as c;

.admin {
  // Fælles udseende for ALLE felter på siden
  input,
  textarea,
  select {
    display: block;
    width: 100%;
    max-width: 36rem;
    font-family: ft.$font;
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