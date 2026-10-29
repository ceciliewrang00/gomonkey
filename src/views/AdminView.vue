<script setup>
// ---------- Imports ----------

// Vores egen knap-komponent, så admin-siden ligner resten af siden
import BaseButton from '@/components/BaseButton.vue'

// ref = en værdi Vue holder øje med (siden opdateres, når den ændres)
// onMounted = kører, når siden er vist
// watch = kører, hver gang en bestemt værdi ændrer sig
import { ref, onMounted, watch } from 'vue'

// RouterLink = link til en anden side i appen (uden at genindlæse)
import { RouterLink } from 'vue-router'

// ---------- Indstillinger ----------

// Adressen til banerne i databasen. ".json" sætter vi på, når vi bruger den
const API_URL = 'https://gomonkey-baner-default-rtdb.europe-west1.firebasedatabase.app/baner'

// Liste over alle felter i formularen.
// Vil du kunne rette et nyt felt, skal du bare tilføje en linje her
const FIELDS = [
    { key: 'name', label: 'Navn', type: 'text' },
    { key: 'color', label: 'Farve', type: 'select', options: ['grøn', 'blå', 'rød', 'sort', 'brun'] },
    { key: 'number', label: 'Nummer (antal blade)', type: 'text' },
    { key: 'description', label: 'Beskrivelse', type: 'textarea' },
    { key: 'requirements', label: 'Krav', type: 'text' },
    { key: 'trackHeight', label: 'Banehøjde', type: 'text' },
    { key: 'obstacles', label: 'Forhindringer', type: 'text' },
    { key: 'longestGlide', label: 'Længste svæv', type: 'text' },
    { key: 'glideAmount', label: 'Antal svæv', type: 'text' },
    { key: 'trackLength', label: 'Banelængde', type: 'text' },
    { key: 'difficulty', label: 'Sværhedsgrad (fx 37.5%)', type: 'text' },
    { key: 'altImg', label: 'Alt-tekst til billede', type: 'text' },
    // Dropdown, så man kun kan vælge værdier, som SCSS kender
    { key: 'class', label: 'Layout', type: 'select', options: ['img-right', 'img-left'] }
]

// ---------- Login ----------

// Login ligger direkte i koden, så andre kan prøve siden.
// Det er kun en lås på siden, ikke rigtig sikkerhed
const DEMO_EMAIL = 'demo@gomonkey.dk'
const DEMO_PASSWORD = 'GoMonkey2026'

// Er brugeren logget ind? sessionStorage husker det, til fanen lukkes,
// så man ikke logges ud, når siden genindlæses
const loggedIn = ref(sessionStorage.getItem('loggedIn') === 'true')

// Felterne i login-formularen er forudfyldt med demo-login
const email = ref(DEMO_EMAIL)
const password = ref(DEMO_PASSWORD)

// Fejlbesked, hvis login er forkert
const loginError = ref('')

// Kører, når man trykker "Log ind"
function login() {
    loginError.value = ''

    // Passer det indtastede med koden, er man logget ind
    if (email.value === DEMO_EMAIL && password.value === DEMO_PASSWORD) {
        loggedIn.value = true
        sessionStorage.setItem('loggedIn', 'true')
    } else {
        loginError.value = 'Forkert mail eller adgangskode.'
    }
}

// Kører, når man trykker "Log ud"
function logout() {
    loggedIn.value = false
    sessionStorage.removeItem('loggedIn')

    // Nulstiller den valgte bane, så formularen er tom næste gang
    selectedId.value = ''
}

// ---------- Baner ----------

// Alle baner fra databasen som en liste
const baner = ref([])

// Id på den bane, man har valgt i dropdown (fx "grøn1")
const selectedId = ref('')

// En kopi af den valgte bane. Det er den, man retter i.
// Vi retter i en kopi, så listen ikke ændres, før man trykker "Gem"
const form = ref({})

// Besked til brugeren (fx "Gemt!" eller en fejl)
const message = ref('')

// Når siden er vist: hent banerne fra databasen
onMounted(async () => {
    //Try er det vi håber virker
    try {
        // API-kald: GET henter data
        const res = await fetch(`${API_URL}.json`)

        // fetch melder ikke fejl ved fx 401 eller 404, så vi tjekker selv
        if (!res.ok) throw new Error(`Fejl ${res.status}`)

        const data = await res.json()

        // Firebase giver et objekt. Vi laver det til en liste
        // og gemmer navnet (fx "grøn1") som id
        baner.value = Object.entries(data).map(([id, bane]) => ({ id, ...bane }))
        //Catch er det som sker hvis det vi håber ikke er muligt 
    } catch (e) {
        // Går noget galt, får brugeren en besked i stedet for en tom side
        message.value = 'Banerne kunne ikke hentes.'
        console.error(e)
    }
})

// Kører hver gang man vælger en ny bane i dropdown
watch(selectedId, (id) => {
    // Fjerner gammel besked ("Gemt!") fra forrige bane
    message.value = ''

    // Finder den valgte bane i listen
    const bane = baner.value.find((b) => b.id === id)

    if (bane) {
        // Laver en kopi med ét felt pr. post i FIELDS.
        // Mangler banen et felt, bliver det til tom tekst ('')
        form.value = Object.fromEntries(FIELDS.map((f) => [f.key, bane[f.key] ?? '']))
    }
})

// Kører, når man trykker "Gem"
async function save() {
    message.value = ''

    try {
        // API-kald: PATCH ændrer kun de felter, vi sender.
        // Resten af banen bliver ikke rørt (PUT ville slette resten)
        const res = await fetch(`${API_URL}/${selectedId.value}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            // Laver formularen om til tekst, som API'et kan modtage
            body: JSON.stringify(form.value)
        })

        // Tjekker, om databasen sagde ja
        if (!res.ok) throw new Error(`Fejl ${res.status}`)

        // Opdaterer også listen på siden, så den passer med databasen
        const bane = baner.value.find((b) => b.id === selectedId.value)
        Object.assign(bane, form.value)

        message.value = 'Gemt!'
    } catch (e) {
        message.value = 'Kunne ikke gemme. Prøv igen.'
        console.error(e)
    }
}
</script>

<template>
    <main class="admin">
        <!-- Øverste række: logo til venstre, knapper til højre -->
        <div class="head">
            <img src="@/assets/images/logo.svg" alt="GoMonkey logo">

            <div class="double-button">
                <!-- Link tilbage til forsiden -->
                <RouterLink to="/" class="button-pink">← Tilbage til forsiden</RouterLink>
                <!-- @click kalder logout-funktionen -->
                <BaseButton @click="logout" variant="pink">Log ud</BaseButton>
            </div>
        </div>

        <h1>Admin</h1>

        <!-- Login-formular. Vises kun, hvis man IKKE er logget ind (v-if) -->
        <!-- @submit.prevent kalder login() og stopper browserens genindlæsning -->
        <form v-if="!loggedIn" @submit.prevent="login">
            <p>Demo-login er udfyldt. Tryk bare på "Log ind".</p>

            <!-- v-model kobler feltet til variablen: det man skriver, gemmes i email -->
            <label for="email">Mail</label>
            <input id="email" v-model="email" type="email" required />

            <label for="password">Adgangskode</label>
            <input id="password" v-model="password" type="password" required />

            <BaseButton version="pink" type="submit">Log ind</BaseButton>

            <!-- Fejlbesked vises kun, hvis loginError har en tekst -->
            <p v-if="loginError">{{ loginError }}</p>
        </form>

        <!-- Alt herunder vises kun, når man ER logget ind (v-else) -->
        <template v-else>

            <!-- Dropdown til at vælge bane. v-model gemmer valget i selectedId -->
            <label for="bane">Vælg bane</label>
            <select id="bane" v-model="selectedId">
                <!-- Første valg er kun en pladsholder, og kan ikke vælges (disabled) -->
                <option value="" disabled>Vælg...</option>
                <!-- v-for laver én option pr. bane. :value er id'et, som gemmes i selectedId -->
                <option v-for="bane in baner" :key="bane.id" :value="bane.id">
                    {{ bane.name }}
                </option>
            </select>

            <!-- Redigeringsformular. Vises først, når en bane er valgt -->
            <form v-if="selectedId" @submit.prevent="save" class="input">

                <!-- v-for laver ét felt pr. post i FIELDS, så vi ikke skriver dem et ad gangen -->
                <div v-for="field in FIELDS" :key="field.key" class="field">
                    <!-- :for kobler teksten til feltet, så man kan klikke på teksten -->
                    <label :for="field.key">{{ field.label }}</label>

                    <!-- Stort tekstfelt, hvis type er "textarea" -->
                    <!-- form[field.key] = feltets værdi, fx form['description'] -->
                    <textarea
                        v-if="field.type === 'textarea'"
                        :id="field.key"
                        v-model="form[field.key]"
                        rows="5"
                    ></textarea>

                    <!-- Dropdown, hvis type er "select" -->
                    <select v-else-if="field.type === 'select'" :id="field.key" v-model="form[field.key]">
                        <option value="">(ingen)</option>
                        <option v-for="option in field.options" :key="option" :value="option">
                            {{ option }}
                        </option>
                    </select>

                    <!-- Ellers et almindeligt tekstfelt -->
                    <input v-else :id="field.key" v-model="form[field.key]" type="text" />
                </div>

                <!-- type="submit" sender formularen og kalder save() -->
                <BaseButton type="submit" variant="primary">Gem</BaseButton>
            </form>

            <!-- Besked til brugeren, fx "Gemt!" -->
            <p v-if="message">{{ message }}</p>
        </template>
    </main>
</template>

<style lang="scss" scoped>
// Henter vores fælles farver, afstande og knapper
@use '@/assets/styles/buttons' as b;
@use '@/assets/styles/spacings' as s;
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/flex' as f;

// Hele admin-siden: elementerne ligger under hinanden
.admin {
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: s.$spacing-xxl s.$spacing-m;

    // Øverste række: logo til venstre, knapper til højre
    .head {
        padding: s.$spacing-xs s.$spacing-m;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
    }

    // Fælles udseende for alle felter
    input,
    textarea,
    select {
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

    // Formularer og felter: label og felt ligger under hinanden
    form,
    .field {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
}
</style>