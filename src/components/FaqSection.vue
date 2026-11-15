<script setup>
// FAQ – OFTE STILLEDE SPØRGSMÅL
// Spørgsmålene står i listen SPOERGSMAAL nedenfor. Vil du rette eller tilføje et, så gør det dér.
//
// Hvert svar er en liste af tekststykker, der sættes sammen til én sætning:
//   'almindelig tekst'
//   { tekst: 'link-tekst', href: 'https://...' }   – link til en anden side, telefon eller mail
//   { tekst: 'link-tekst', til: '/banequiz' }      – link til en side på vores eget site
// liste = punktopstilling under svaret (valgfri)
// mangler: true = svaret er ikke skrevet endnu. Spørgsmålet bliver skjult,
//                 indtil svaret er udfyldt og "mangler" er fjernet

const SPOERGSMAAL = [
  {
    sp: 'Skal jeg have erfaring med klatring?',
    svar: ['Nej. Vores instruktører lærer dig alt, hvad du skal vide, før du går i gang.'],
  },
  {
    sp: 'Hvad koster det, og hvor længe må vi klatre?',
    svar: ['Klatring koster fra 230 kr. Prisen inkluderer 3 timers klatring, udstyr, instruktion og adgang til Bounce.'],
  },
  {
    sp: 'Er Bounce inkluderet?',
    svar: ['Ja, Bounce er inkluderet, når du klatrer. Vil du kun hoppe på Bounce, koster det 40 kr.'],
  },
  {
    sp: 'Hvor gammel skal man være?',
    svar: [
      'Det afhænger af banen. De letteste baner er for børn fra 4 år og 95 cm. Se kravene ved ',
      { tekst: 'hver bane', href: '#bane-info' },
      '.',
    ],
  },
  {
    sp: 'Skal der en voksen med?',
    svar: ['Det afhænger af alderen:'],
    liste: [
      '6–10 år: Der skal være 1 voksen med pr. 4 børn.',
      '11–16 år: Der skal være en voksen med.',
      'Fra 16 år: Du må klatre uden en voksen.',
    ],
  },
  {
    sp: 'Hvem må ikke klatre?',
    svar: ['Du må ikke klatre, hvis du:'],
    liste: [
      'vejer over 120 kg',
      'er gravid',
      'er påvirket af alkohol eller stoffer',
      'har epilepsi, hjerte- eller lungeproblemer eller en dårlig ryg',
    ],
  },
  {
    sp: 'Hvilken bane skal vi starte på?',
    svar: [
      'Start på en bane, hvor du føler dig tryg, og arbejd dig op. Er du i tvivl, kan du bruge vores ',
      { tekst: 'banevælger', til: '/banequiz' },
      '. Den finder den rette bane på under et minut.',
    ],
  },
  {
    sp: 'Kan man se på uden at klatre?',
    svar: ['Ja, det er gratis at se på fra jorden. Du betaler først, når du tager sele på.'],
  },
  {
    sp: 'Hvad skal jeg have på?',
    svar: ['[udfyld, fx tøj man kan bevæge sig i, lukkede sko og langt hår sat op]'],
    mangler: true,
  },
  {
    sp: 'Hvad sker der, hvis det regner?',
    svar: ['[udfyld jeres vejrpolitik]'],
    mangler: true,
  },
  {
    sp: 'Kan jeg aflyse eller flytte min booking?',
    svar: ['[udfyld afbestillingsregler]'],
    mangler: true,
  },
  {
    sp: 'Hvornår har I åbent?',
    // Sæt det rigtige link ind i href og fjern "mangler"
    svar: ['Se vores åbningstider ', { tekst: 'her', href: '' }, '.'],
    mangler: true,
  },
  {
    sp: 'Hvor ligger parken?',
    svar: ['Stærmosegårdsvej 57, 5230 Odense, ved Rosengårdscentret.'],
  },
  {
    sp: 'Hvordan kontakter jeg jer?',
    svar: [
      'Ring på ',
      { tekst: '25 53 30 22', href: 'tel:+4525533022' },
      ', eller skriv til ',
      { tekst: 'forestodense@gomonkey.dk', href: 'mailto:forestodense@gomonkey.dk' },
      '.',
    ],
  },
]

// Kun spørgsmål med et færdigt svar bliver vist
const synlige = SPOERGSMAAL.filter((s) => !s.mangler)
</script>

<template>
  <section id="faq" class="faq">
    <!-- Venstre side: overskrift og kontakt -->
    <div class="faq__intro">
      <span class="badge faq__badge">Spørgsmål og svar</span>
      <h2>Godt at vide før I kommer</h2>
      <p>
        Her er svarene på det, vi oftest bliver spurgt om. Kan du ikke finde det, du leder efter,
        så kontakt os.
      </p>

      <!-- Hurtig kontakt -->
      <div class="faq__kontakt">
        <!-- .button-primary og .button-secondary fra _buttons.scss.
             Kun farverne overskrives nedenfor, så de kan ses på den mørke baggrund -->
        <a href="tel:+4525533022" class="button-primary faq__knap-lys">Ring 25 53 30 22</a>
        <a href="mailto:forestodense@gomonkey.dk" class="button-secondary faq__knap-kant">Skriv til os</a>
      </div>
    </div>

    <!-- Spørgsmålene. <details> og <summary> kan åbnes og lukkes af sig selv – også med tastaturet –
         og skærmlæsere ved automatisk, om svaret er åbent eller lukket -->
    <div class="faq__liste">
      <details v-for="s in synlige" :key="s.sp" class="faq__punkt">
        <summary class="faq__spoergsmaal">
          <span>{{ s.sp }}</span>
          <!-- Plus, der bliver til et kryds, når svaret er åbent -->
          <span class="faq__ikon" aria-hidden="true"></span>
        </summary>

        <div class="faq__svar">
          <p>
            <template v-for="(del, i) in s.svar" :key="i">
              <RouterLink v-if="del.til" :to="del.til">{{ del.tekst }}</RouterLink>
              <a v-else-if="del.href" :href="del.href">{{ del.tekst }}</a>
              <template v-else>{{ del }}</template>
            </template>
          </p>
          <ul v-if="s.liste">
            <li v-for="punkt in s.liste" :key="punkt">{{ punkt }}</li>
          </ul>
        </div>
      </details>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/spacings' as s;
@use '@/assets/styles/mixins' as m;

// Samme mørke baggrund og lyse tekst som OverviewSection (mixin fra _mixins.scss).
// Sidemargin kommer fra .forside > section i main.scss
.faq {
  @include m.section-black100;
  display: grid;
  grid-template-columns: 1fr;
  gap: s.$spacing-xl;

  // Desktop: overskrift til venstre (smal), spørgsmål til højre (bred).
  // align-items: center = teksten til venstre står lodret i midten ud for spørgsmålene
  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    align-items: center;
  }
}

/* --- Venstre side --- */
.faq__intro {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: s.$spacing-s;

  h2 {
    padding-top: 0;
    font-size: clamp(2rem, 4vw, 2.75rem);
    line-height: 1.15;
  }

  p {
    margin: 0;
    max-width: 28rem;
  }
}

// Badget: ingen baggrund, men lys grøn kant og tekst – samme som "Udforsk terrænet" i OverviewSection.
// Udseendet kommer fra .badge i _badges.scss – her sættes kun farverne og kanten
.faq__badge {
  --badge-bg: transparent;
  --badge-color: #{c.$forest_green25};
  border: 1.5px solid c.$forest_green25;
}

.faq__kontakt {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: s.$spacing-xs;
}

// "Ring"-knappen: lys med mørk tekst
.faq__knap-lys {
  background-color: c.$primary_light25;
  color: c.$primary_darkgreen;

  &:hover {
    background-color: c.$forest_pink100;
    color: c.$primary_black100;
  }
}

// "Skriv til os"-knappen: lys kant og lys tekst
.faq__knap-kant {
  border-color: c.$primary_light25;
  color: c.$primary_light25;

  &:hover {
    background-color: c.$forest_pink100;
    border-color: c.$forest_pink100;
    color: c.$primary_black100;
  }
}

/* --- Spørgsmålene --- */
// Hvert spørgsmål er et mørkegrønt kort ($primary_darkgreen) med luft imellem.
// Listen har en fast højde og kan scrolles, så sektionen ikke bliver for lang.
// Ret max-height for at vise flere eller færre spørgsmål ad gangen.
// overscroll-behavior: contain = når man er nået bunden af listen, scroller siden ikke med
.faq__liste {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: 30rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 1rem; // Luft mellem kortene og scrollbaren
  padding-bottom: 4rem; // Så det sidste spørgsmål kan scrolles fri af udtoningen
  // Svag udtoning i bunden, så man kan se, at der er flere spørgsmål længere nede
  mask-image: linear-gradient(to bottom, #000 85%, transparent 100%);
}

.faq__punkt {
  flex-shrink: 0; // Kortene må ikke klemmes sammen i den scrollbare liste
  padding: 0 1.25rem;
  border-radius: 0.75rem;
  background-color: c.$primary_darkgreen;
}

// Spørgsmålet: fed tekst til venstre, plus-ikon til højre.
// list-style: none fjerner browserens egen trekant
.faq__spoergsmaal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: s.$spacing-s;
  padding: 1.25rem 0;
  font-size: clamp(1.05rem, 1.5vw, 1.2rem);
  font-weight: 700;
  line-height: 1.35;
  list-style: none;
  cursor: pointer;
  transition: color 0.2s ease;

  // Safari viser sin egen trekant – den skjules her
  &::-webkit-details-marker {
    display: none;
  }

  // Lyserød ved hover – lilla kan ikke ses på den mørke baggrund
  &:hover {
    color: c.$forest_pink100;
  }

  // Fokusramme inde i kortet (negativ offset, så den ikke bliver skåret af listen)
  &:focus-visible {
    outline: 3px solid c.$forest_pink100;
    outline-offset: -3px;
    border-radius: 0.5rem;
  }
}

// Plus-ikonet: to streger (::before og ::after) i en rund ring
.faq__ikon {
  position: relative;
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border: 2px solid currentColor;
  border-radius: 50%;
  transition: transform 0.3s ease, background-color 0.2s ease;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0.8rem;
    height: 2px;
    background-color: currentColor;
    transform: translate(-50%, -50%);
  }

  // Den lodrette streg i plusset
  &::after {
    transform: translate(-50%, -50%) rotate(90deg);
  }
}

// Åbent svar: plusset drejer og bliver til et kryds, og ringen bliver lys
.faq__punkt[open] .faq__ikon {
  transform: rotate(45deg);
  background-color: c.$primary_light25;
  color: c.$primary_darkgreen;
}

// Selve svaret
.faq__svar {
  padding: 0 3rem 1.25rem 0;

  p {
    margin: 0;
    max-width: 40rem;
  }

  // Links i svarene: understreget, lyserøde ved hover
  a {
    color: inherit;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;

    &:hover {
      color: c.$forest_pink100;
    }
  }

  // Punktopstilling. Nulstiller den ekstra luft, som ul har i _typography.scss
  ul {
    margin: 0.75rem 0 0;
    padding: 0 0 0 1.25rem;
  }

  li {
    font-size: 1rem;
    line-height: 1.6;
  }
}

@media (prefers-reduced-motion: reduce) {
  .faq__ikon {
    transition: none;
  }
}
</style>
