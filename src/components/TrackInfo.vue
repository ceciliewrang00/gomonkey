<script setup>
// Banekortene på forsiden: en forklaring af sværhedsgraden og ét kort pr. bane.
// Hvert kort har banens id (fx id="bane-6"), så andre sider kan linke til det med /#bane-6

import { ref, computed, onMounted, onUnmounted } from 'vue'

import { hentBaner, NIVEAUER, trinFor, niveauFor, harSvaerhedsgrad, faktaFor } from '@/services/baner.js'

// Banerne fra Firebase
const baner = ref([])

// Kun klatrebanerne (uden Bounce). Bruges til numrene 01, 02, 03 ...
const klatrebaner = computed(() => baner.value.filter(harSvaerhedsgrad))

// Klatrebanerne først og Bounce til sidst, fordi Bounce er et ekstra tilbud
const visteBaner = computed(() => [
    ...klatrebaner.value,
    ...baner.value.filter((bane) => !harSvaerhedsgrad(bane)),
])

// Banens nummer som "01", "02" ...
function nummerFor(bane) {
    return String(klatrebaner.value.indexOf(bane) + 1).padStart(2, '0')
}

// true, mens vi venter på databasen
const loading = ref(true)

// Fejlbesked, hvis noget går galt
const error = ref(null)

// Henter banerne, når siden er vist. Fejler det, vises en besked
onMounted(async () => {
    try {
        baner.value = await hentBaner()
    } catch (e) {
        error.value = 'Banerne kunne ikke hentes. Prøv igen senere.'
        console.error(e)
    } finally {
        loading.value = false
    }
})

// ---------- Info-boblen ved "Sværhedsgrad" ----------
// Id på banen, hvis boble er åben (null = ingen)
const aabenInfo = ref(null)

/* ---------- Stort billede ----------
   Klik på en banes billede åbner det stort i et <dialog>-vindue */
const billedDialog = ref(null)  // <dialog>-elementet
const stortBillede = ref(null)  // banen, hvis billede vises stort

// Laver banens SVG-tekst om til en adresse, som et <img> kan vise
function billedeSrc(bane) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(bane.svg)
}

// Åbner vinduet med banens billede
function aabnBillede(bane) {
    stortBillede.value = bane
    billedDialog.value?.showModal()
}

function lukBillede() {
    billedDialog.value?.close()
}

// Klik uden for billedet lukker også vinduet
function klikPaaDialog(event) {
    if (event.target === billedDialog.value) lukBillede()
}

// Klik på (i) åbner boblen – klik igen lukker den
function skiftInfo(id) {
    aabenInfo.value = aabenInfo.value === id ? null : id
}

// Lukker boblen, når man går videre med Tab
function lukVedFokusUd(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
        aabenInfo.value = null
    }
}

// Lukker boblen, når man klikker et andet sted på siden (nødvendig i Safari)
function lukVedKlikUdenfor(event) {
    if (aabenInfo.value && !event.target.closest('.info')) {
        aabenInfo.value = null
    }
}

// Lytter efter klik på hele siden, mens forsiden er vist
onMounted(() => document.addEventListener('click', lukVedKlikUdenfor))
onUnmounted(() => document.removeEventListener('click', lukVedKlikUdenfor))
</script>

<template>
    <!-- Intro over banerne. "Se banerne"-knapperne linker hertil (#bane-info) -->
    <div id="bane-info" class="baner-intro">
        <div class="baner-intro__tekst">
            <span class="badge baner-intro__badge">Baner i Forest Odense</span>
            <h2><span class="light">Find den bane - </span><br>der passer til dig</h2>
            <p>
                Banerne står i rækkefølge efter sværhedsgrad – fra de letteste, hvor alle kan være med,
                til de vildeste, der kræver mod og erfaring.
            </p>
            <p>Hver bane har sin egen farve, så du nemt
                kan genkende den i parken.</p>
        </div>

        <!-- Forklaring af sværhedsbjælken, som står på hver bane -->
        <section id="skala-forklaring" class="skala-forklaring" aria-labelledby="skala-titel">
            <h4 id="skala-titel" class="skala-titel">Hvad betyder sværhedsgraden?</h4>
            <p class="skala-tekst">
                Sværhedsgraden viser, hvor højt oppe du er, hvor lange svævene er, og hvor meget banen kræver af din krop og dit mod. Jo flere trin der er fyldt ud på bjælken, jo sværere er banen.
            </p>

            <!-- De tre niveauer med samme bjælke som banerne -->
            <ul class="skala-trin">
                <li v-for="(niveau, i) in NIVEAUER" :key="niveau.navn">
                    <div class="trin-bjaelke" aria-hidden="true">
                        <span
                            v-for="t in 3"
                            :key="t"
                            class="trin-bjaelke__trin"
                            :class="{ 'er-fyldt': t <= i + 1 }"
                        ></span>
                    </div>
                    <strong class="skala-trin__navn">{{ niveau.navn }}</strong>
                    <p class="skala-trin__tekst">{{ niveau.tekst }}</p>
                    <p v-if="niveau.passer" class="skala-trin__tekst">
                        <strong>Passer til:</strong> {{ niveau.passer }}
                    </p>
                </li>
            </ul>
        </section>
    </div>

    <p v-if="loading" class="status">Henter baner...</p>
    <p v-else-if="error" class="status">{{ error }}</p>
    <!-- Ét kort pr. bane -->
    <article
        v-else
        v-for="bane in visteBaner"
        :key="bane.id"
        :id="bane.id"
        :class="[bane.class, `bane--${bane.id}`]"
        class="bane"
    ><!-- id = banens id (fx "bane-6"), så hero og popup'en på kortet kan linke direkte hertil (/#bane-6) -->
        <div class="bane__kort">
            <!-- Overskriften står over teksten, så billedet kun flugter med teksten -->
            <div class="bane__top">
                <!-- Nummeret i banens farve. Bounce får ikke et nummer -->
                <span v-if="harSvaerhedsgrad(bane)" class="bane__nr" aria-hidden="true">{{ nummerFor(bane) }}</span>
                <h2 class="bane__navn">{{ bane.name }}</h2>
            </div>

            <!-- Klik på billedet åbner det stort -->
            <button
                v-if="bane.svg"
                type="button"
                class="bane__billede"
                :aria-label="`Se billedet af ${bane.name} i stor størrelse`"
                @click="aabnBillede(bane)"
            >
                <img :src="billedeSrc(bane)" :alt="bane.altImg" class="bane__img"/>
                <!-- Forstørrelsesglas, som viser, at billedet kan åbnes -->
                <span class="bane__zoom" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5M11 8v6M8 11h6" /></svg>
                </span>
            </button>

            <div class="bane__content">
                <p class="bane__beskrivelse">{{ bane.description }}</p>

                <p v-if="bane.requirements" class="bane__krav">
                    <strong>Krav:</strong> {{ bane.requirements }}
                </p>

                <!-- Ekstra pris, fx frit fald på Sort. Vises kun, hvis banen har en -->
                <p v-if="bane.addOn" class="bane__krav">
                    <strong>Tilkøb:</strong> {{ bane.addOn }}
                </p>

                <!-- Faktabokse med de fakta, banen har udfyldt -->
                <dl class="fakta" v-if="faktaFor(bane).length">
                    <div v-for="f in faktaFor(bane)" :key="f.key" class="fakta__boks">
                        <dt>{{ f.label }}</dt>
                        <dd>{{ bane[f.key] }}</dd>
                    </div>
                </dl>

                <div class="difficulty">
                    <div class="difficulty__label">
                        <!-- "Sværhedsgrad" med en (i)-knap, der åbner en forklaring -->
                        <span
                            class="info"
                            @focusout="lukVedFokusUd"
                            @keydown.esc="aabenInfo = null"
                        >
                            Sværhedsgrad
                            <button
                                type="button"
                                class="info__knap"
                                aria-label="Hvad betyder sværhedsgrad?"
                                :aria-expanded="aabenInfo === bane.id"
                                :aria-controls="`info-${bane.id}`"
                                @click="skiftInfo(bane.id)"
                            >
                                <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                                    <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6" />
                                    <circle cx="10" cy="6.2" r="1.15" fill="currentColor" />
                                    <rect x="9.1" y="8.6" width="1.8" height="6" rx="0.9" fill="currentColor" />
                                </svg>
                            </button>
                            <span
                                v-if="aabenInfo === bane.id"
                                :id="`info-${bane.id}`"
                                class="info__boble"
                            >
                                Niveauet bygger på banens højde og længde, antallet af forhindringer
                                og svæv, og hvor fysisk krævende banen er.
                                Bjælken har tre trin: Let, Mellem og Svær.
                                <a href="#skala-forklaring" class="info__link" @click="aabenInfo = null">Se hele forklaringen</a>
                            </span>
                        </span>
                        <!-- Niveauet skrevet med ord -->
                        <span class="difficulty__niveau">{{ niveauFor(bane) }}</span>
                    </div>
                    <!-- Bjælke med tre trin: 1 fyldt = Let, 2 = Mellem, 3 = Svær. Bounce har ingen fyldte trin.
                         role="meter" fortæller skærmlæsere, hvor svær banen er -->
                    <div
                        class="trin-bjaelke"
                        role="meter"
                        aria-label="Sværhedsgrad"
                        :aria-valuetext="niveauFor(bane)"
                        :aria-valuenow="harSvaerhedsgrad(bane) ? trinFor(bane) : 0"
                        aria-valuemin="0"
                        aria-valuemax="3"
                    >
                        <span
                            v-for="t in 3"
                            :key="t"
                            class="trin-bjaelke__trin"
                            :class="{ 'er-fyldt': harSvaerhedsgrad(bane) && t <= trinFor(bane) }"
                        ></span>
                    </div>
                </div>

                <!-- Link til kortet, hvor kun denne bane er valgt -->
                <RouterLink
                    :to="{ path: '/kort', query: { bane: bane.id } }"
                    class="button-arrow bane__kort-link"
                    :aria-label="`Se ${bane.name} på kortet`"
                >
                    Se på kortet
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </RouterLink>
            </div>
        </div>
    </article>

    <!-- Det store billede. Én dialog til alle baner -->
    <dialog
        ref="billedDialog"
        class="billed-dialog"
        :aria-label="stortBillede ? `Billede af ${stortBillede.name}` : 'Billede'"
        @click="klikPaaDialog"
        @close="stortBillede = null"
    >
        <figure v-if="stortBillede" class="billed-dialog__indhold">
            <button type="button" class="button-close billed-dialog__luk" aria-label="Luk billedet" @click="lukBillede">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <img :src="billedeSrc(stortBillede)" :alt="stortBillede.altImg" class="billed-dialog__img">
            <figcaption class="billed-dialog__tekst">
                <span class="billed-dialog__prik" :class="`bane--${stortBillede.id}`" aria-hidden="true"></span>
                {{ stortBillede.name }}
            </figcaption>
        </figure>
    </dialog>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/spacings' as s;

// Banens farve fra $kort-bane-farver ud fra klassen, fx .bane--bane-1. Ukendte baner bliver grå
.bane {
    --bane-farve: #{c.$primary_black50};
}

@each $id, $farve in c.$kort-bane-farver {
    .bane--#{$id} {
        --bane-farve: #{$farve};
    }
}

/* --- Intro --- */
// Samme sidemargin som sektionerne
.baner-intro {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: s.$spacing-s;
    text-align: left;
    // Samme luft i top og bund som sektionerne
    padding-block: s.$sektion-luft;
    padding-inline: max(s.$spacing-m, calc((100% - #{s.$indhold-bredde}) / 2));
    // Samme grønne baggrund som banerne, med en tynd streg over den første bane
    background-color: c.$forest_green25;
    scroll-margin-top: 5rem;  // så headeren ikke dækker overskriften

    h2 {
        
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

// Badget har kun en mørk kant og mørk tekst, fordi baggrunden er lys
.baner-intro__badge {
    --badge-bg: transparent;
    --badge-color: #{c.$primary_black100};
    border: 1.5px solid c.$primary_black100;
}

.baner-intro__tekst {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: s.$spacing-s;
}

// Desktop: introteksten til venstre og forklaringsboksen til højre
@media (min-width: 900px) {
    .baner-intro {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.8fr);
        column-gap: s.$spacing-xl;
        align-items: end;
    }

    .baner-intro .skala-forklaring {
        margin-top: 0;
    }
}

/* --- Forklaring af sværhedsgraden --- */
// Boks med mørk kant, der flugter med banerne under
.skala-forklaring {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    width: 100%;
    box-sizing: border-box;
    margin-top: s.$spacing-xs;
    padding: s.$spacing-l;
    border-radius: 1rem;
    background-color: c.$primary_darkgreen;
    color: c.$primary_light25;
}

.skala-titel {
    margin: 0;
    padding: 0;
    font-weight: 700;
}

// Teksten holdes i en behagelig linjelængde
.baner-intro .skala-tekst {
    max-width: 60ch;


}

// Let, Mellem og Svær som tre små kort side om side
.skala-trin {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.6rem;
    margin: 0.4rem 0 0;

    list-style: none;
    padding: 0;

    // Ét kort pr. niveau med samme lyse baggrund som banerne, så bjælken ser ens ud
    > li {
        padding: 0.9rem 1rem 1rem;
        border-radius: 0.75rem;
        background-color: c.$forest_green25;
        color: c.$primary_black100;
    }

    .trin-bjaelke {
        margin-bottom: 0.75rem;
    }

    .skala-trin__navn {
        display: block;
        font-size: 1rem;
        font-weight: 800;
    }

    .skala-trin__tekst {
        margin: 0.25rem 0 0;
        font-size: 0.85rem;
        line-height: 1.45;
        color: c.$primary_black100;

        strong {
            font-weight: 700;
        }
    }
}

// Er boksen smal, står kortene under hinanden.
// @container kigger på boksens bredde og ikke skærmens
.skala-forklaring {
    container-type: inline-size;
}

@container (max-width: 34rem) {
    .skala-trin {
        grid-template-columns: 1fr;
    }
}

.status {
    text-align: center;
    padding: s.$spacing-xl;
    margin: 0;
    background-color: c.$forest_green25;
}

// Stregen mellem banerne går helt ud til siderne af skærmen
.bane {
    padding-block: 0;
    background-color: c.$forest_green25;
  

    &:last-of-type {
        padding-bottom: s.$sektion-luft;
    }
}

/* --- Kortet --- */
// Mobil: overskrift, billede og tekst under hinanden
.bane__kort {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-areas:
        "top"
        "billede"
        "tekst";
    gap: s.$spacing-m;
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

// Store skærme: overskriften står over teksten, og billedet står ved siden af.
// img-right = billedet til højre, ellers til venstre
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
// Fjerner browserens knap-stil på billedet
.bane__billede {
    position: relative;
    display: block;
    width: 100%;
    min-height: 16rem;
    padding: 0;
    border: none;
    border-radius: 1.25rem;
    overflow: hidden;
    background: none;
    cursor: zoom-in;

    &:focus-visible {
        outline: 3px solid c.$primary_darkgreen;
        outline-offset: 3px;
    }

    // Billedet fylder feltet, men højden styres af teksten ved siden af
    .bane__img {
        position: absolute;
        inset: s.$spacing-s;
        width: calc(100% - 2 * #{s.$spacing-s});
        height: calc(100% - 2 * #{s.$spacing-s});
        object-fit: contain;
        // Tegningens hvide baggrund smelter sammen med den grønne baggrund
        mix-blend-mode: multiply;
        transition: transform 0.4s ease;
    }
}

.bane__kort:hover .bane__img {
    transform: scale(1.03);
}

// Forstørrelsesglasset bliver tydeligere ved hover
.bane__zoom {
    position: absolute;
    right: 0.75rem;
    bottom: 0.75rem;
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    background-color: c.$primary_darkgreen;
    color: c.$primary_light25;
    opacity: 0.75;
    transition: opacity 0.2s ease, transform 0.2s ease;

    svg {
        width: 1.25rem;
        height: 1.25rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.2;
        stroke-linecap: round;
    }
}

.bane__billede:hover .bane__zoom,
.bane__billede:focus-visible .bane__zoom {
    opacity: 1;
    transform: scale(1.08);
}

/* --- Det store billede (dialog) ---
   Lyst kort midt på skærmen over en mørk, sløret baggrund */
.billed-dialog {
    width: min(64rem, calc(100vw - 2rem));
    max-height: calc(100dvh - 2rem);
    padding: 0;
    border: none;
    border-radius: 1.25rem;
    background-color: c.$forest_green25;
    box-shadow: 0 1.5rem 4rem rgba(c.$primary_black100, 0.4);
    overflow: hidden;

    // Ingen ramme om hele vinduet – lukkeknappen har sin egen
    &:focus {
        outline: none;
    }

    &::backdrop {
        background-color: rgba(c.$primary_black100, 0.75);
        backdrop-filter: blur(4px);
    }

    &[open] {
        animation: dialog-ind 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
}

@keyframes dialog-ind {
    from { opacity: 0; transform: scale(0.96); }
    to { opacity: 1; transform: scale(1); }
}

.billed-dialog__indhold {
    position: relative;
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: s.$spacing-m;
}

.billed-dialog__luk {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 1;
}

// Billedet er så stort som muligt, men aldrig større end skærmen
.billed-dialog__img {
    width: 100%;
    max-height: calc(100dvh - 10rem);
    object-fit: contain;
    mix-blend-mode: multiply;  // tegningens hvide baggrund smelter sammen med kortet
}

.billed-dialog__tekst {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: s.$spacing-xs;
    font-size: 1.1rem;
    font-weight: 800;
}

.billed-dialog__prik {
    width: 0.9rem;
    height: 0.9rem;
    border-radius: 50%;
    background-color: var(--bane-farve);
}

/* --- Tekst --- */
.bane__content {
    display: flex;
    flex-direction: column;
    gap: s.$spacing-s;
}

// Stregen under navnet, med runde ender
.bane__top {
    position: relative;
    display: flex;
    align-items: baseline;
    gap: s.$spacing-s;
    padding-bottom: calc(#{s.$spacing-s} + 5px);

    &::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 5px;
        border-radius: 1rem;
        background-color: var(--bane-farve);
    }
}

.bane__navn {
    font-weight: 900;
    font-size: clamp(1.5rem, 3vw, 2.25rem);
    line-height: 1.1;
    margin: 0;
    padding-top: 0;
    color: var(--bane-farve);
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
// "Se på kortet"-linket er mørkt, fordi baggrunden er lys
.bane__kort-link {
    color: c.$primary_darkgreen;
    font-weight: 700;
}

.difficulty {
    padding-top: s.$spacing-xs;

    // "Sværhedsgrad" er en lille, dæmpet etiket. Niveauet står stort og fedt
    .difficulty__label {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-bottom: 0.5rem;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: c.$primary_black75;
    }

    .difficulty__niveau {
        font-size: 1.1rem;
        font-weight: 900;
        letter-spacing: 0;
        text-transform: none;
        line-height: 1;
        color: c.$primary_black100;
    }
}

/* --- (i)-knap og forklaringsboble ved "Sværhedsgrad" --- */
.info {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
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

// Boblen ligger over "Sværhedsgrad", så den ikke dækker bjælken
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
    // Nulstiller etikettens store bogstaver, så boblens tekst er almindelig
    text-transform: none;
    letter-spacing: normal;
    box-shadow: 0 0.5rem 1.5rem rgba(c.$primary_darkgreen, 0.25);
}

.info__link {
    display: inline-block;
    margin-top: 0.4rem;
    color: c.$primary_light25;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 2px;

    &:focus-visible {
        outline: 2px solid c.$primary_light25;
        outline-offset: 2px;
    }
}

// Så headeren ikke dækker forklaringen
.skala-forklaring {
    scroll-margin-top: 6rem;
}

/* --- Trin-bjælke (både på banerne og i forklaringen) ---
   Tre lige brede trin. Fyldte trin er mørkegrønne, tomme er lyse */
.trin-bjaelke {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    width: 100%;

    .trin-bjaelke__trin {
        height: 0.75rem;
        background-color: c.$primary_light50;
    }

    // Runde hjørner i hver ende, så trinene ligner én bjælke
    .trin-bjaelke__trin:first-child {
        border-radius: 1rem 0 0 1rem;
    }

    .trin-bjaelke__trin:last-child {
        border-radius: 0 1rem 1rem 0;
    }

    .trin-bjaelke__trin.er-fyldt {
        background-color: c.$primary_darkgreen;
    }
}

@media (prefers-reduced-motion: reduce) {
    .bane__img,
    .bane__zoom {
        transition: none;
    }

    .billed-dialog[open] {
        animation: none;
    }
}
</style>
