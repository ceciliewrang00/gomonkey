<script setup>
// BANEKORTENE PÅ FORSIDEN
// Øverst en forklaring af sværhedsgraden (Let/Mellem/Svær), og derunder ét stort kort pr. bane
// med billede, beskrivelse, krav, faktatal og en sværhedsbjælke.
// Alt om banerne hentes fra Firebase "baner" via services/baner.js – det samme, som
// popup'en på kortet og quizzen bruger.
// Hvert kort har banens id som id (fx id="bane-6"), så andre sider kan linke direkte til det
// med /#bane-6 (fx "Læs mere om banen" på kortet og "Se Grøn" i quizzen).

// ref = en værdi som Vue holder øje med. onMounted = kører, når siden er vist.
// onUnmounted = kører, når siden forlades (bruges til at fjerne klik-lytteren igen)
import { ref, onMounted, onUnmounted } from 'vue'

// Banerne og reglerne for niveauer står i services/baner.js, så alle sider viser det samme
import { hentBaner, NIVEAUER, trinFor, niveauFor, harSvaerhedsgrad, faktaFor } from '@/services/baner.js'

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
        // Uanset om det gik godt eller dårligt, er vi færdige med at vente,
        // så teksten "Henter baner..." fjernes
        loading.value = false
    }
})

// ---------- Info-boblen ved "Sværhedsgrad" ----------
// Ved hver bane står der "Sværhedsgrad (i)". Klik på (i) åbner en lille boble med en forklaring.
// Kun én boble kan være åben ad gangen, så vi gemmer bare id'et på banen, hvis boble er åben
// (null = ingen er åben)
const aabenInfo = ref(null)

/* ---------- Stort billede ----------
   Klik på en banes billede åbner det stort i et vindue oven på siden.
   Vi bruger HTML's eget <dialog>-element. Med showModal() får vi det hele gratis:
   mørk baggrund, Escape lukker, og tastaturet bliver inde i vinduet */
const billedDialog = ref(null) // selve <dialog>-elementet (ref="billedDialog" i templaten)
const stortBillede = ref(null) // Banen, hvis billede vises stort (null = lukket)

// Åbn vinduet med banens billede. ?. = kun hvis dialogen findes
function aabnBillede(bane) {
    stortBillede.value = bane
    billedDialog.value?.showModal()
}

// Luk vinduet
function lukBillede() {
    billedDialog.value?.close()
}

// Klik på den mørke baggrund uden for billedet lukker også.
// Klikker man på billedet, er event.target billedet. Klikker man udenfor, er det selve dialogen
function klikPaaDialog(event) {
    if (event.target === billedDialog.value) lukBillede()
}

// Klik på (i) åbner boblen – klik igen lukker den.
// Er denne banes boble åben, sættes den til null (lukket). Ellers sættes den til banens id (åben)
function skiftInfo(id) {
    aabenInfo.value = aabenInfo.value === id ? null : id
}

// Lukker boblen, når man med tastaturet (Tab) går videre fra (i)-knappen og boblen.
// relatedTarget = det element, man går hen til. Ligger det ikke inde i boblen, lukker vi den
function lukVedFokusUd(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
        aabenInfo.value = null
    }
}

// Lukker boblen, når man klikker et andet sted på siden.
// closest('.info') = "ligger det, man klikkede på, inde i en info-boble?" Hvis ikke, lukkes den.
// (Den ovenfor er ikke nok alene, fordi Safari ikke flytter fokus, når man klikker på en knap)
function lukVedKlikUdenfor(event) {
    if (aabenInfo.value && !event.target.closest('.info')) {
        aabenInfo.value = null
    }
}

// Lyt efter klik på hele siden, mens forsiden er vist – og stop igen, når man forlader den
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
            <h2><span class="light">Find den bane - </span><br>der passer til dig</h2>
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
            <h4 id="skala-titel" class="skala-titel">Hvad betyder sværhedsgraden?</h4>
            <p class="skala-tekst">
                Sværhedsgraden viser, hvor højt oppe du er, hvor lange svævene er, og hvor meget banen kræver af din krop og dit mod. Jo flere trin der er fyldt ud på bjælken, jo sværere er banen.
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
                    <!-- Hvem niveauet passer til (kun hvis niveauet har en "passer"-tekst) -->
                    <p v-if="niveau.passer" class="skala-trin__tekst">
                        <strong>Passer til:</strong> {{ niveau.passer }}
                    </p>
                </li>
            </ul>
        </section>
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
    ><!-- id = banens id (fx "bane-6"), så hero og popup'en på kortet kan linke direkte hertil (/#bane-6) -->
        <div class="bane__kort">
            <!-- Overskriften står i sin egen række over teksten,
                 så billedet kun flugter med teksten under den -->
            <div class="bane__top">
                <!-- 01, 02, 03 ... i banens farve. padStart(2, '0') sætter et 0 foran, så 1 bliver 01 -->
                <span class="bane__nr" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
                <h2 class="bane__navn">{{ bane.name }}</h2>
            </div>

            <!-- Billede af banen -->
            <!-- Billedet er en knap: klik åbner det stort -->
            <button
                v-if="bane.image"
                type="button"
                class="bane__billede"
                :aria-label="`Se billedet af ${bane.name} i stor størrelse`"
                @click="aabnBillede(bane)"
            >
                <img :src="`/${bane.image}`" :alt="bane.altImg" class="bane__img"/>
                <!-- Lille forstørrelsesglas-ikon i hjørnet, så man kan se, at billedet kan åbnes -->
                <span class="bane__zoom" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5M11 8v6M8 11h6" /></svg>
                </span>
            </button>

            <div class="bane__content">
                <p class="bane__beskrivelse">{{ bane.description }}</p>

                <!-- Krav står for sig selv, da det ofte er en længere tekst -->
                <p v-if="bane.requirements" class="bane__krav">
                    <strong>Krav:</strong> {{ bane.requirements }}
                </p>

                <!-- Faktabokse, fx "Banehøjde: 8 m". faktaFor giver kun de fakta, banen har udfyldt.
                     dl/dt/dd er HTML's liste til "navn: værdi" -->
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
                         Præcis samme bjælke og farve som i forklaringen øverst.
                         Bounce har ingen sværhedsgrad: bjælken vises, men ingen trin er fyldt.
                         role="meter" og aria-value... fortæller skærmlæsere, hvor svær banen er -->
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

                <!-- Link til kortet, hvor kun denne bane er valgt (?bane=… læses af KortFilter).
                     .button-arrow fra _buttons.scss – her bare i mørk farve, så den kan læses på den lyse baggrund -->
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

    <!-- Det store billede. Én dialog til alle baner – den viser den bane, man klikkede på -->
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
            <img :src="`/${stortBillede.image}`" :alt="stortBillede.altImg" class="billed-dialog__img">
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

// Badge, overskrift og tekst under hinanden
.baner-intro__tekst {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: s.$spacing-s;
}

// Desktop: introteksten til venstre og forklaringsboksen til højre.
// Boksen får mere plads (2fr), da den har tre kort ved siden af hinanden.
// end = boksen står nederst, så dens bund flugter med den sidste linje tekst til venstre
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

        strong {
            font-weight: 700;
        }
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
// Billedet er en knap (klik åbner det stort), så browserens knap-stil nulstilles
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

// Forstørrelsesglasset i hjørnet – bliver tydeligere ved hover og fokus
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

    // Ingen blå ramme om hele vinduet – lukkeknappen har sin egen fokusramme
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

// Lukkeknappen bruger .button-close fra _buttons.scss
.billed-dialog__luk {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 1;
}

// Billedet fylder så meget som muligt, men aldrig mere end skærmen
.billed-dialog__img {
    width: 100%;
    max-height: calc(100dvh - 10rem);
    object-fit: contain;
    mix-blend-mode: multiply; // Den hvide baggrund i tegningen smelter sammen med kortet
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

// Linjen under navn og nummer er en ::after-streg i stedet for en border,
// så den kan få runde ender. Ret height for tykkelsen
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
// "Se på kortet"-linket nederst på hver bane. Mørkt, fordi baggrunden er lys
.bane__kort-link {
    color: c.$primary_darkgreen;
    font-weight: 700;
}

.difficulty {
    padding-top: s.$spacing-xs;

    // "Sværhedsgrad" er en lille, dæmpet etiket med store bogstaver.
    // Selve niveauet ("Let", "Mellem" …) står stort og fedt – det er det, man skal se
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

    // Niveauet ude til højre, fx "Let"
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
    // Boblen står inde i "SVÆRHEDSGRAD"-etiketten, som har store bogstaver og ekstra
    // bogstavafstand – det nulstilles her, så teksten er almindelig læsbar tekst
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
    .bane__img,
    .bane__zoom {
        transition: none;
    }

    .billed-dialog[open] {
        animation: none;
    }
}
</style>
