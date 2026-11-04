<script setup>
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

// Oversætter farven fra databasen til et klassenavn uden æ/ø/å (samme som TrackBadge)
const farveKlasse = {
    grøn: 'groen',
    blå: 'blaa',
    rød: 'roed',
    sort: 'sort',
    brun: 'brun'
}

// Faktaboksene. Kun felter, banen har udfyldt, bliver vist
const FAKTA = [
    { key: 'trackHeight', label: 'Banehøjde' },
    { key: 'trackLength', label: 'Banelængde' },
    { key: 'obstacles', label: 'Forhindringer' },
    { key: 'glideAmount', label: 'Antal svæv' },
    { key: 'longestGlide', label: 'Længste svæv' },
]

function faktaFor(bane) {
    return FAKTA.filter(f => bane[f.key])
}
</script>

<template>
    <!-- Intro over banerne. id="bane-info", så "Se banerne"-knapperne linker hertil.
         Det er en div og ikke en <header>, fordi header har sit eget layout i main.scss -->
    <div id="bane-info" class="baner-intro">
        <span class="badge badge--dark">Vores baner</span>
        <h2><span class="light">Find den bane</span> - der passer til dig</h2>
        <p>
            Banerne står i rækkefølge efter sværhedsgrad – fra de letteste, hvor alle kan være med,
            til de vildeste, der kræver mod og erfaring. <br>Hver bane har sin egen farve, så du nemt
            kan genkende den i parken.
        </p>
    </div>

    <p v-if="loading" class="status">Henter baner...</p>
    <p v-else-if="error" class="status">{{ error }}</p>
    <!-- Ét kort pr. bane (v-for gentager article) -->
    <article
        v-else
        v-for="(bane, index) in baner"
        :key="bane.id"
        :class="[bane.class, `bane--${farveKlasse[bane.color] ?? 'default'}`]"
        class="bane"
    >
        <div class="bane__kort">
            <!-- Overskriften står i sin egen række over teksten,
                 så billedet kun flugter med teksten under den -->
            <div class="bane__top">
                <!-- 01, 02, 03 ... i banens farve -->
                <span class="bane__nr" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
                <h2 class="bane__navn">{{ bane.name }}</h2>
            </div>

            <!-- Billede af banen -->
            <div class="bane__billede" v-if="bane.image">
                <img :src="`/${bane.image}`" :alt="bane.altImg" class="bane__img"/>
            </div>

            <div class="bane__content">
                <p class="bane__beskrivelse">{{ bane.description }}</p>

                <!-- Krav står for sig selv, da det ofte er en længere tekst -->
                <p v-if="bane.requirements" class="bane__krav">
                    <strong>Krav:</strong> {{ bane.requirements }}
                </p>

                <!-- Faktabokse -->
                <dl class="fakta" v-if="faktaFor(bane).length">
                    <div v-for="f in faktaFor(bane)" :key="f.key" class="fakta__boks">
                        <dt>{{ f.label }}</dt>
                        <dd>{{ bane[f.key] }}</dd>
                    </div>
                </dl>

                <div class="difficulty">
                    <div class="difficulty__label">
                        <span>Sværhedsgrad</span>
                        <span class="difficulty__skala">Let — Svær</span>
                    </div>
                    <div
                        class="difficulty__track"
                        role="meter"
                        aria-label="Sværhedsgrad"
                        :aria-valuenow="parseFloat(bane.difficulty)"
                        aria-valuemin="0"
                        aria-valuemax="100"
                    >
                        <div class="difficulty__fill" :style="{ width: bane.difficulty }"></div>
                    </div>
                </div>
            </div>
        </div>
    </article>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/spacings' as s;

// Banens farve (samme som i TrackBadge)
$bane-farver: (
    groen: c.$forest_green100,
    blaa: c.$secondary_blue100,
    roed: c.$secondary_orange100,
    sort: c.$primary_black100,
    brun: c.$primary_light25,
    default: c.$primary_black50
);

@each $navn, $farve in $bane-farver {
    .bane--#{$navn} {
        --bane-farve: #{$farve};
    }
}

/* --- Intro --- */
// Samme sidemargin som sektionerne (se .forside > section i main.scss)
.baner-intro {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: s.$spacing-s;
    text-align: left;
    padding-block: s.$spacing-xxl s.$spacing-s;
    padding-inline: max(s.$spacing-m, calc((100% - #{s.$indhold-bredde}) / 2));
    background-color: c.$forest_green25;
    scroll-margin-top: 5rem; // Så den sticky header ikke dækker overskriften

    h2 {
        font-size: clamp(2rem, 4vw, 2.75rem);
        font-weight: 800;
        line-height: 1.15;
        padding-top: 0;

        // "Find den bane" står tyndt, resten fedt
        .light {
            font-weight: 300;
        }
    }

    p {
        margin: 0;
    }
}

.status {
    text-align: center;
    padding: s.$spacing-xl;
    margin: 0;
    background-color: c.$forest_green25;
}

// Afstanden styres af .bane__kort – siderne styres af .forside > article i main.scss.
// Stregen sidder her, så den går lige og helt ud til siderne af skærmen
.bane {
    padding-block: 0;
    background-color: c.$forest_green25;
    border-top: 1px solid rgba(c.$primary_darkgreen, 0.25);

    &:last-of-type {
        padding-bottom: s.$spacing-xxl;
    }
}

/* --- Kortet --- */
// Mobil: overskrift, billede, tekst under hinanden
.bane__kort {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-areas:
        "top"
        "billede"
        "tekst";
    gap: s.$spacing-m;
    // Åbent layout uden boks – stregen mellem banerne sidder på .bane
    padding: s.$spacing-l 0;

    @media (min-width: 900px) {
        grid-template-columns: 1fr 1fr;
        column-gap: s.$spacing-xl;
        padding: s.$spacing-xl 0;
    }
}

/* --- Nummer foran overskriften --- */
.bane__nr {
    flex-shrink: 0;
    font-size: clamp(2.5rem, 5vw, 3.75rem);
    font-weight: 900;
    line-height: 1;
    color: var(--bane-farve);
    font-variant-numeric: tabular-nums;
}

// Store skærme: overskriften står over tekstkolonnen,
// og billedet fylder kun rækken med teksten
// Standard (og img-left) = billedet til venstre, img-right = billedet til højre
@media (min-width: 900px) {
    .bane__kort {
        grid-template-areas:
            ".       top"
            "billede tekst";
    }

    .img-right .bane__kort {
        grid-template-areas:
            "top   ."
            "tekst billede";
    }
}

.bane__top { grid-area: top; }
.bane__billede { grid-area: billede; }
.bane__content { grid-area: tekst; }

/* --- Billede --- */
.bane__billede {
    position: relative;
    min-height: 16rem;
    border-radius: 1.25rem;
    overflow: hidden;

    // Billedet fylder feltet, men feltets højde styres af teksten ved siden af
    .bane__img {
        position: absolute;
        inset: s.$spacing-s;
        width: calc(100% - 2 * #{s.$spacing-s});
        height: calc(100% - 2 * #{s.$spacing-s});
        object-fit: contain;
        // Den hvide baggrund i tegningerne smelter sammen med den grønne baggrund
        mix-blend-mode: multiply;
        transition: transform 0.4s ease;
    }
}

.bane__kort:hover .bane__img {
    transform: scale(1.03);
}

/* --- Tekst --- */
.bane__content {
    display: flex;
    flex-direction: column;
    gap: s.$spacing-s;
}

.bane__top {
    display: flex;
    align-items: baseline;
    gap: s.$spacing-s;
    padding-bottom: s.$spacing-s;
    border-bottom: 1px solid var(--bane-farve);
}

.bane__navn {
    font-weight: 900;
    font-size: clamp(1.5rem, 3vw, 2.25rem);
    line-height: 1.1;
    margin: 0;
    padding-top: 0;
}

.bane__beskrivelse {
    margin: 0;
}

.bane__krav {
    margin: 0;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background-color: c.$primary_darkgreen;
    color: c.$primary_light25;
    font-size: 1rem;

    strong {
        font-weight: 700;
    }
}

/* --- Faktabokse --- */
.fakta {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
    gap: 0.6rem;
    margin: 0;

    .fakta__boks {
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        background-color: c.$primary_darkgreen;
        color: c.$primary_light25;
    }

    dt {
        font-size: 0.8rem;
        font-weight: 500;
        color: c.$primary_light25;
        opacity: 0.7;
    }

    dd {
        margin: 0.15rem 0 0;
        font-size: 1.1rem;
        font-weight: 800;
    }
}

/* --- Sværhedsgrad --- */
.difficulty {
    padding-top: s.$spacing-xs;

    .difficulty__label {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        font-size: 0.95rem;
        font-weight: 700;
    }

    .difficulty__skala {
        font-weight: 400;
        color: c.$primary_black50;
    }
}

.difficulty__track {
    background-color: c.$primary_light50;
    width: 100%;
    height: 0.75rem;
    border-radius: 1rem;
    overflow: hidden;

    .difficulty__fill {
        background-color: var(--bane-farve);
        height: 100%;
        border-radius: 1rem;
    }
}

@media (prefers-reduced-motion: reduce) {
    .bane__img {
        transition: none;
    }
}
</style>
