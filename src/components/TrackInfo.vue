<script setup>
// Henter TrackBadge, så vi kan bruge den i template
import TrackBadge from './TrackBadge.vue'

// ref = en værdi som Vue holder øje med. onMounted = kører, når siden er vist
import { ref, onMounted } from 'vue'

// Adressen til databasen (API'et)
const URL = 'https://gomonkey-baner-default-rtdb.europe-west1.firebasedatabase.app/baner.json'

// Tom liste til banerne. Siden opdateres, når listen får data
const baner = ref([])

// true mens vi venter på databasen
const loading = ref(true)

// Gemmer en fejlbesked, hvis noget går galt
const error = ref(null)

// Når siden er vist: hent data fra databasen
onMounted(async () => {
    try {
        // API-kald: spørger databasen om banerne
        const res = await fetch(URL)

        // Hvis databasen svarer med en fejl (fx 401 eller 404), så stop her
        if (!res.ok) throw new Error(`Fejl ${res.status}`)

        // Åbner svaret fra databasen og laver det om til data, JavaScript kan arbejde med
        const data = await res.json()

        // Laver Firebase-objektet om til en liste, gemmer navnet som id og sorterer efter sværhedsgrad
        baner.value = Object.entries(data)
            .map(([id, bane]) => ({ id, ...bane }))
            .sort((a, b) => parseFloat(a.difficulty) - parseFloat(b.difficulty))
    } catch (e) {
        // Hvis noget fejler, gemmer vi en besked, som vi kan vise
        error.value = 'Banerne kunne ikke hentes. Prøv igen senere.'
        console.error(e)
    } finally {
        // Uanset om det gik godt eller dårligt, er vi færdige med at vente
        //Altså fjerner vi teksten med at banerne hentes
        loading.value = false
    }
})
</script>

<template>
    <p v-if="loading">Henter baner...</p>
    <p v-else-if="error">{{ error }}</p>
    <!-- Ét kort pr. bane (v-for gentager article) -->
    <article v-else v-for="bane in baner" :key="bane.id" :class="bane.class" class="bane">
        <div class="bane__content">
            <div class="bane-icon">
                <h2 class="h2-baneinfo">{{ bane.name }}</h2>

                <!-- Sender farve og nummer videre til TrackBadge -->
                <TrackBadge :color="bane.color" :number="bane.number" class="track-badge"/>
            </div>

            <p>{{ bane.description }}</p>

            <ul>
                <!-- v-if = vis kun linjen, hvis banen har den information -->
                <li v-if="bane.requirements">Krav: {{ bane.requirements }}</li>
                <li v-if="bane.trackHeight">Banehøjde: {{ bane.trackHeight }}</li>
                <li v-if="bane.obstacles">Forhindringer: {{ bane.obstacles }}</li>
                <li v-if="bane.longestGlide">Længste svæv: {{ bane.longestGlide }}</li>
                <li v-if="bane.glideAmount">Antal svæv: {{ bane.glideAmount }}</li>
                <li v-if="bane.trackLength">Banelængde: {{ bane.trackLength }}</li>
            </ul>

            <div class="difficulty">
                <p>Sværhedsgrad:</p>
                <div class="difficulty__track">
                    <div class="difficulty__fill" :style="{ width: bane.difficulty }"></div>
                </div>
            </div>
        </div>
        <div class="bane__img__wrapper" v-if="bane.image">
            <img :src="`/${bane.image}`" :alt="bane.altImg" class="bane__img"/>
        </div>
    </article>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/spacings' as s;
@use '@/assets/styles/flex' as f;

.bane {
    border-bottom: 1px solid c.$primary_black100;
    margin: auto;
}

.img-right {
    @include f.flex-row;
}

.img-left {
    @include f.flex-row-reverse;
}

.bane__content {
    max-width: 40rem;

    .bane-icon {
    display: flex;
    flex-direction: row;
    gap: 0;
    align-items: center;

        .h2-baneinfo {
        font-family: "Inter", sans-serif;
        font-weight: 900;
        font-size: clamp(1.5rem, 3vw, 2.25rem);
        margin: 0;
        padding-top: s.$spacing-xs;
        }
    }

    ul {
        display: flex;
        flex-direction: column;
        gap: s.$spacing-xs;
        list-style: none;
        padding: 0;
    }
}

.bane__img__wrapper {
    width: clamp(20rem, 40vw, 35rem);
    height: fit-content;

    .bane__img {
        width: 100%;
        height: auto;
    }
}

.difficulty__track {
    background-color: c.$forest_green75;
    width: 100%;
    height: 0.75rem;
    border-radius: 1rem;

    .difficulty__fill {
        background-color: c.$primary_black100;
        height: 100%;
        border-radius: 1rem;
    }
}
</style>