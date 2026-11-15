<script setup>
// ref = en værdi som Vue holder øje med. onMounted = kører, når siden er vist.
// onUnmounted = kører, når siden forlades (bruges til at fjerne klik-lytteren igen)
import { ref, onMounted, onUnmounted } from 'vue'

// Banerne og reglerne for niveauer står i services/baner.js,
// så hero-sektionen (banestigen) bruger præcis de samme data
import { hentBaner, NIVEAUER, trinFor, niveauFor } from '@/services/baner.js'

// Tom liste til banerne. Siden opdateres, når listen får data
const baner = ref([])

// true mens vi venter på databasen
const loading = ref(true)

// Gemmer en fejlbesked, hvis noget går galt
const error = ref(null)

// Når siden er vist: hent data fra databasen
onMounted(async () => {
    try {
        // Henter banerne (sorteret fra let til svær) – se services/baner.js
        baner.value = await hentBaner()
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

// (i)-forklaringen ved "Sværhedsgrad": id på banen, hvis boble er åben (null = ingen)
const aabenInfo = ref(null)

// Klik på (i) åbner boblen – klik igen lukker den
function skiftInfo(id) {
    aabenInfo.value = aabenInfo.value === id ? null : id
}

// Lukker boblen, når fokus forlader (i)-knappen og boblen (fx med Tab).
// relatedTarget er det element, der får fokus bagefter
function lukVedFokusUd(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
        aabenInfo.value = null
    }
}

// Lukker boblen ved klik et andet sted på siden.
// (Safari giver ikke knapper fokus ved klik, så focusout alene er ikke nok)
function lukVedKlikUdenfor(event) {
    if (aabenInfo.value && !event.target.closest('.info')) {
        aabenInfo.value = null
    }
}

onMounted(() => document.addEventListener('click', lukVedKlikUdenfor))
onUnmounted(() => document.removeEventListener('click', lukVedKlikUdenfor))
</script>

<template>
    <!-- Intro over banerne. id="bane-info", så "Se banerne"-knapperne linker hertil.
         Det er en div og ikke en <header>, fordi header har sit eget layout i main.scss -->
    <div id="bane-info" class="baner-intro">
        <!-- Introteksten. Står til venstre for forklaringsboksen på desktop og over den på mobil -->
        <div class="baner-intro__tekst">
            <span class="badge baner-intro__badge">Baner i Forrest Odense</span>
            <h2><span class="light">Find den bane - </span> <br>der passer til dig</h2>
            <p>
                Banerne står i rækkefølge efter sværhedsgrad – fra de letteste, hvor alle kan være med,
                til de vildeste, der kræver mod og erfaring.
            </p>
            <p>Hver bane har sin egen farve, så du nemt
                kan genkende den i parken.</p>
        </div>

        <!-- Forklaring af sværhedsbjælken, som står på hver bane længere nede.
             Står her ét sted, så man ikke selv skal gætte, hvad bjælken betyder -->
        <section id="skala-forklaring" class="skala-forklaring" aria-labelledby="skala-titel">
            <h3 id="skala-titel" class="skala-titel">Sådan læser du sværhedsgraden</h3>
            <p class="skala-tekst">
                Bjælken på hver bane har tre trin, der viser, hvor svær den er i forhold til parkens andre baner.
                Jo flere trin der er fyldt ud, jo sværere er banen.
            </p>

            <!-- De tre niveauer. Hvert kort har samme trin-bjælke som banerne,
                 så man kan sammenligne direkte -->
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
                </li>
            </ul>
        </section>
    </div>

    <!-- To sten samlet, der sidder hen over overgangen mellem introen og banerne
         (samme idé som på gomonkey.dk). Kun pynt, så skærmlæsere springer dem over -->
    <div class="sten-samling" aria-hidden="true">
        <span class="sten-samling__sten sten-samling__sten--bue"></span>
        <span class="sten-samling__sten sten-samling__sten--rund"></span>
    </div>

    <p v-if="loading" class="status">Henter baner...</p>
    <p v-else-if="error" class="status">{{ error }}</p>
    <!-- Ét kort pr. bane (v-for gentager article) -->
    <article
        v-else
        v-for="(bane, index) in baner"
        :key="bane.id"
        :id="bane.id"
        :class="[bane.class, `bane--${bane.id}`]"
        class="bane"
    ><!-- id = banens id (fx "bane-6"), så banestigen i hero kan linke direkte hertil -->
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
                        <!-- "Sværhedsgrad" med (i)-knap. Klik åbner en lille boble med forklaringen.
                             Escape eller fokus et andet sted lukker den igen -->
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
                        <!-- Niveauet skrevet med ord (Let, Mellem eller Svær), så man ikke selv skal aflæse bjælken -->
                        <span class="difficulty__niveau">{{ niveauFor(bane) }}</span>
                    </div>
                    <!-- Bjælke med tre trin: 1 fyldt = Let, 2 = Mellem, 3 = Svær.
                         Præcis samme bjælke og farve som i forklaringen øverst -->
                    <div
                        class="trin-bjaelke"
                        role="meter"
                        aria-label="Sværhedsgrad"
                        :aria-valuetext="niveauFor(bane)"
                        :aria-valuenow="trinFor(bane)"
                        aria-valuemin="1"
                        aria-valuemax="3"
                    >
                        <span
                            v-for="t in 3"
                            :key="t"
                            class="trin-bjaelke__trin"
                            :class="{ 'er-fyldt': t <= trinFor(bane) }"
                        ></span>
                    </div>
                </div>
            </div>
        </div>
    </article>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/spacings' as s;

// Banens farve – fra $kort-bane-farver i _colors.scss (samme farver som på kortet).
// Klassen er banens id fra Firebase, fx .bane--bane-1.
// Ukendte baner får en grå farve (står først, så banefarverne vinder)
.bane {
    --bane-farve: #{c.$primary_black50};
}

@each $id, $farve in c.$kort-bane-farver {
    .bane--#{$id} {
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
    // Samme luft i top og bund som sektionerne (se section i main.scss).
    // Introen er en div og ikke en section, så den skal have det sat her
    padding-block: s.$sektion-luft;
    padding-inline: max(s.$spacing-m, calc((100% - #{s.$indhold-bredde}) / 2));
    // Samme grønne baggrund som banerne, så introen hører med til sektionen.
    // Den tynde streg over den første bane adskiller introen fra listen
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

// Badge, overskrift og tekst under hinanden
// Badget: ingen baggrund, kun en mørk kant og mørk tekst – samme stil som badgerne i
// OverviewSection og FAQ, bare mørk, fordi baggrunden her er lys.
// Udseendet kommer fra .badge i _badges.scss – her sættes kun farverne og kanten
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

// Desktop: introteksten til venstre og forklaringsboksen til højre.
// Boksen får lidt mere plads (1.2fr), da den har tre kort ved siden af hinanden
@media (min-width: 900px) {
    .baner-intro {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
        column-gap: s.$spacing-xl;
        // stretch = forklaringsboksen bliver lige så høj som teksten til venstre,
        // så toppen og bunden flugter
        align-items: stretch;
    }

    // Indholdet i boksen står lodret i midten af den højere boks
    .baner-intro .skala-forklaring {
        margin-top: 0;
        justify-content: center;
    }
}

/* --- Forklaring af sværhedsgraden --- */
// Boks med mørk kant i stedet for baggrundsfarve (samme runde hjørner som faktaboksene).
// Fylder hele bredden inden for introens padding, så den flugter med banerne under
.skala-forklaring {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    width: 100%;
    box-sizing: border-box;
    margin-top: s.$spacing-xs;
    padding: s.$spacing-l;
    // Mørkegrøn boks med lys tekst
    border-radius: 1rem;
    background-color: c.$primary_darkgreen;
    color: c.$primary_light25;
}

// Overskriften i forklaringsboksen
.skala-titel {
    margin: 0;
    padding: 0;
    font-weight: 700;
}

// Teksten holdes i en behagelig linjelængde, selvom boksen er bred
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

    // Ét kort pr. niveau: samme lyse grønne baggrund som banerne og mørk tekst.
    // Så ser bjælken helt ens ud her og på banerne
    // (de mørkegrønne trin ville forsvinde direkte på den mørkegrønne boks)
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
    }
}

// Når forklaringsboksen er smal, står kortene under hinanden.
// @container kigger på boksens bredde (ikke skærmens), så det virker både på mobil
// og på desktop, hvor boksen kun fylder den højre halvdel.
// container-type gør boksen til den "container", der måles på
.skala-forklaring {
    container-type: inline-size;
}

@container (max-width: 34rem) {
    .skala-trin {
        grid-template-columns: 1fr;
    }
}

/* --- To sten mellem introen og banerne ---
   Rækken har ingen højde, så den ikke skubber noget. Stenene centreres på stregen
   over den første bane (translateY(-50%)), så de sidder halvt i introen og halvt i banerne.
   Samme sidemargin som resten, og stenene står ude til højre, hvor den første bane har tom plads.
   Formerne er sten4.svg og sten_1.svg fra public, brugt som maske, så de kan få en farve.
   Farverne følger sidens design: lyserød som i hero og knapperne,
   mørkegrøn som forklaringsboksen lige over */
.sten-samling {
    position: relative;
    z-index: 1;
    height: 0;
    display: flex;
    justify-content: flex-end;
    align-items: flex-start;
    gap: 2rem;
    padding-inline: max(s.$spacing-m, calc((100% - #{s.$indhold-bredde}) / 2));
}

.sten-samling__sten {
    display: block;
}

// Stor lyserød bue (sten4), spejlvendt så åbningen vender mod højre.
// Sidder mest under stregen – kun den øverste del stikker op i introen
.sten-samling__sten--bue {
    width: clamp(6rem, 11vw, 9rem);
    aspect-ratio: 42.71 / 40.91;
    background-color: c.$forest_pink100;
    -webkit-mask: url('/sten4.svg') center / contain no-repeat;
    mask: url('/sten4.svg') center / contain no-repeat;
    transform: translateY(-38%) scaleX(-1);
}

// Mindre mørkegrøn rund sten (sten_1) ved siden af – let drejet og centreret på stregen
.sten-samling__sten--rund {
    width: clamp(3rem, 5vw, 4.25rem);
    aspect-ratio: 42.25 / 48.78;
    background-color: c.$primary_darkgreen;
    -webkit-mask: url('/sten_1.svg') center / contain no-repeat;
    mask: url('/sten_1.svg') center / contain no-repeat;
    transform: translateY(-50%) rotate(-15deg);
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
  

    &:last-of-type {
        padding-bottom: s.$sektion-luft;
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
    border-bottom: 5px solid var(--bane-farve);
}

.bane__navn {
    font-weight: 900;
    font-size: clamp(1.5rem, 3vw, 2.25rem);
    line-height: 1.1;
    margin: 0;
    padding-top: 0;
    // Samme farve som banen (og nummeret ved siden af)
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
.difficulty {
    padding-top: s.$spacing-xs;

    .difficulty__label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
        font-size: 0.95rem;
        font-weight: 700;
    }

    // Niveauet ude til højre, fx "Let"
    .difficulty__niveau {
        font-weight: 800;
    }
}

/* --- (i)-knap og forklaringsboble ved "Sværhedsgrad" --- */
// position: relative, så boblen placeres i forhold til teksten
.info {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
}

// Rund knap uden baggrund – ikonet arver tekstfarven (currentColor)
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

// Boblen over "Sværhedsgrad", så den ikke dækker bjælken, den forklarer.
// Mørkegrøn med lys tekst ligesom faktaboksene. z-index lægger den øverst
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

// Så den sticky header ikke dækker forklaringen, når man hopper til den fra boblen
.skala-forklaring {
    scroll-margin-top: 6rem;
}

/* --- Trin-bjælke (bruges både på banerne og i forklaringen) ---
   Tre lige brede trin med lidt luft imellem. Fyldte trin er mørkegrønne, tomme trin er lyse.
   Samme farve på alle baner og i forklaringen, så de ser ens ud.
   Ret her, så ændres bjælken begge steder */
.trin-bjaelke {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    width: 100%;

    .trin-bjaelke__trin {
        height: 0.75rem;
        background-color: c.$primary_light50;
    }

    // Runde hjørner kun i hver ende, så de tre trin ligner én bjælke
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
    .bane__img {
        transition: none;
    }
}
</style>
