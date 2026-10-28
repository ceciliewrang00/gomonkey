<script setup>
// ref = værdi Vue holder øje med. onMounted = kører når siden er vist. watch = kører når en værdi ændrer sig
import BaseButton from '@/components/BaseButton.vue'
import { ref, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'

// Adressen til banerne i databasen (uden .json, den sætter vi på selv)
const API_URL = 'https://gomonkey-baner-default-rtdb.europe-west1.firebasedatabase.app/baner'

// Felterne i formularen. type styrer, om det er input, textarea eller dropdown
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
    { key: 'image', label: 'Billede (filnavn, fx green1-img.webp)', type: 'text' },
    { key: 'altImg', label: 'Alt-tekst til billede', type: 'text' },
    { key: 'class', label: 'Layout', type: 'select', options: ['img-right', 'img-left'] }
]

// ---------- Login ----------

// Demo-login i koden. Det er kun en lås på siden, ikke rigtig sikkerhed
const DEMO_EMAIL = 'demo@gomonkey.dk'
const DEMO_PASSWORD = 'GoMonkey2026'

// Husker login i sessionStorage, så man ikke logges ud ved genindlæsning
const loggedIn = ref(sessionStorage.getItem('loggedIn') === 'true')
const email = ref(DEMO_EMAIL)
const password = ref(DEMO_PASSWORD)
const loginError = ref('')

function login() {
    loginError.value = ''
    // Sammenligner det indtastede med værdierne i koden
    if (email.value === DEMO_EMAIL && password.value === DEMO_PASSWORD) {
        loggedIn.value = true
        sessionStorage.setItem('loggedIn', 'true')
    } else {
        loginError.value = 'Forkert mail eller adgangskode.'
    }
}

function logout() {
    loggedIn.value = false
    sessionStorage.removeItem('loggedIn')
    selectedId.value = ''
}

// ---------- Baner ----------

// Alle baner som liste
const baner = ref([])

// Id på den valgte bane i dropdown (fx "grøn1")
const selectedId = ref('')

// En kopi af den valgte bane, som vi retter i
const form = ref({})

// Besked til brugeren (gemt, fejl osv.)
const message = ref('')

// Når siden er vist: hent banerne
onMounted(async () => {
    try {
        const res = await fetch(`${API_URL}.json`)
        if (!res.ok) throw new Error(`Fejl ${res.status}`)
        const data = await res.json()

        // Laver Firebase-objektet om til en liste og gemmer navnet (fx "grøn1") som id
        baner.value = Object.entries(data).map(([id, bane]) => ({ id, ...bane }))
    } catch (e) {
        message.value = 'Banerne kunne ikke hentes.'
        console.error(e)
    }
})

// Når man vælger en ny bane: kopiér alle felter ind i formularen
watch(selectedId, (id) => {
    message.value = ''
    const bane = baner.value.find((b) => b.id === id)
    if (bane) {
        // Felter banen ikke har, bliver til tom tekst
        form.value = Object.fromEntries(FIELDS.map((f) => [f.key, bane[f.key] ?? '']))
    }
})

// Sender rettelsen til databasen
async function save() {
    message.value = ''
    try {
        // PATCH ændrer kun de felter vi sender, resten af banen bliver ikke rørt
        const res = await fetch(`${API_URL}/${selectedId.value}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form.value)
        })
        if (!res.ok) throw new Error(`Fejl ${res.status}`)

        // Opdater også listen lokalt, så data passer sammen
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
        <div class="head">
            <img src="@/assets/images/logo.svg" alt="GoMonkey logo">

            <div class="double-button">
                <BaseButton to="/" variant="pink">← Tilbage til forsiden</BaseButton>
                <BaseButton @click="logout" variant="pink">Log ud</BaseButton>
            </div>
        </div>

        <h1>Admin</h1>

        <!-- Login vises, hvis man ikke er logget ind -->
        <form v-if="!loggedIn" @submit.prevent="login">
            <p>Demo-login er udfyldt. Tryk bare på "Log ind".</p>

            <label for="email">Mail</label>
            <input id="email" v-model="email" type="email" required />

            <label for="password">Adgangskode</label>
            <input id="password" v-model="password" type="password" required />

            <button type="submit">Log ind</button>
            <p v-if="loginError">{{ loginError }}</p>
        </form>

        <!-- Resten vises kun, når man er logget ind -->
        <template v-else>

            <label for="bane">Vælg bane</label>
            <select id="bane" v-model="selectedId">
                <option value="" disabled>Vælg...</option>
                <option v-for="bane in baner" :key="bane.id" :value="bane.id">
                    {{ bane.name }}
                </option>
            </select>

            <!-- Formularen vises først, når en bane er valgt -->
            <form v-if="selectedId" @submit.prevent="save" class="input">
                <!-- Ét felt pr. post i FIELDS (v-for gentager div'en) -->
                <div v-for="field in FIELDS" :key="field.key" class="field">
                    <label :for="field.key">{{ field.label }}</label>

                    <textarea
                        v-if="field.type === 'textarea'"
                        :id="field.key"
                        v-model="form[field.key]"
                        rows="5"
                    ></textarea>

                    <select v-else-if="field.type === 'select'" :id="field.key" v-model="form[field.key]">
                        <option value="">(ingen)</option>
                        <option v-for="option in field.options" :key="option" :value="option">
                            {{ option }}
                        </option>
                    </select>

                    <input v-else :id="field.key" v-model="form[field.key]" type="text" />
                </div>

                <BaseButton type="submit" variant="primary">Gem</BaseButton>
            </form>

            <p v-if="message">{{ message }}</p>
        </template>
    </main>
</template>

<style lang="scss" scoped>

@use '@/assets/styles/buttons' as b;
@use '@/assets/styles/spacings' as s;
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/flex' as f;

.admin {
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: s.$spacing-xxl s.$spacing-m;

    .head {
        padding: s.$spacing-xs s.$spacing-m;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
    }

    input,
    textarea,
    select {
        font-family: "Inter", sans-serif;
        font-weight: 300;
        font-size: clamp(1rem, 1.5vw, 1.25rem);
        padding: 0.75rem 1rem;
        border: 2px solid c.$primary_black50;
        border-radius: 0.5rem;
        background-color: white;
        color: c.$primary_black100;

        &:focus {
            outline: none;
            border-color: c.$forest_green100;
        }
    }

    form,
    .field {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
}
</style>