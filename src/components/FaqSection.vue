<script setup>
// Ofte stillede spørgsmål. Hvert svar er en liste af stykker, så der kan være links midt i:
// tekst, { tekst, href } (andet site, tlf, mail) eller { tekst, til } (vores eget site)

const SPOERGSMAAL = [
  {
    sp: 'Skal jeg have erfaring med klatring?',
    svar: ['Nej. Vores instruktører lærer dig alt, hvad du skal vide, før du går i gang.'],
  },
  // Teksterne bygger på gomonkey.dk/inspiration/sikkerhedssystem/
  {
    sp: 'Er det sikkert at klatre?',
    svar: [
      'Ja. Vi bruger et sikkerhedssystem med "continuous belay": Du klikker dig på sikkerhedswiren nede på jorden og kan slet ikke klikke dig af, før du står på jorden igen efter banen. Læs mere om ',
      { tekst: 'vores sikkerhedssystem', href: 'https://gomonkey.dk/inspiration/sikkerhedssystem/' },
      '.',
    ],
  },
  {
    sp: 'Hvordan foregår instruktionen?',
    svar: ['Alle starter med en grundig instruktion, hvor vi viser, hvordan selen bruges, og forklarer reglerne i parken. Vores guider tjekker, at alles seler sidder rigtigt.'],
    liste: [
      'Bagefter prøver du en kort prøvebane – så mange gange du har lyst.',
      'Ingen bliver sendt op i træerne, før de føler sig helt trygge.',
    ],
  },
  {
    sp: 'Hvilke seler findes der, og passer de til mit barn?',
    svar: ['Vi har seler i størrelser til både børn og voksne. Selen passer, hvis man er mindst 110 cm høj og vejer under 120 kg. Vores instruktører finder den rigtige størrelse til jer og tjekker, at den sidder rigtigt, før I går op i træerne. Selen er med i prisen.'],
  },
  {
    sp: 'Hvilke baner skal man have sele på?',
    svar: ['Man har sele på alle klatrebanerne, fra Grøn til Sort. Kun på Bounce skal man ikke have sele på, fordi nettet har høje vægge hele vejen rundt.'],
  },
  {
    sp: 'Hvem er instruktørerne?',
    svar: ['Alle vores guider er uddannede klatreinstruktører og kender udstyret, redningsprocedurerne og sikkerheden ud og ind. De er også uddannet i førstehjælp og hjælper gerne med et par opmuntrende ord undervejs.'],
  },
  {
    sp: 'Kan man komme ned, hvis man fortryder?',
    svar: ['Ja. Der er flere nedgangsstiger undervejs på klatrebanerne, så du kan komme ned, hvis du ikke har lyst til at fortsætte.'],
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
      'Det afhænger af banen. På de letteste klatrebaner skal man være mindst 110 cm høj. På Bounce er der ingen krav. Se kravene ved ',
      { tekst: 'hver bane', href: '#bane-info' },
      '.',
    ],
  },
  {
    sp: 'Skal der en voksen med?',
    svar: ['Det afhænger af alderen (se nedenfor). Den voksne behøver ikke klatre med, men kan blive på jorden og følge med derfra. Det er gratis at se på. Vores instruktører holder øje med banerne og hjælper, hvis nogen sidder fast eller vil ned.'],
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

// Kun spørgsmål med et færdigt svar vises (dem uden mangler: true)
const synlige = SPOERGSMAAL.filter((s) => !s.mangler)
</script>

<template>
  <section id="faq" class="faq">
    <!-- Venstre side: overskrift og kontakt -->
    <div class="faq__intro">
      <span class="badge badge--dark">Spørgsmål og svar</span>
      <h2>Godt at vide før I kommer</h2>
      <p>
        Her er svarene på det, vi oftest bliver spurgt om. Kan du ikke finde det, du leder efter,
        så kontakt os.
      </p>

      <div class="double-button faq__kontakt">
        <a href="tel:+4525533022" class="button-primary">Ring 25 53 30 22</a>
        <a href="mailto:forestodense@gomonkey.dk" class="button-secondary">Skriv til os</a>
      </div>
    </div>

    <!-- Spørgsmålene. <details> og <summary> kan åbnes og lukkes af sig selv – også med tastaturet -->
    <div class="faq__liste">
      <details v-for="s in synlige" :key="s.sp" class="faq__punkt">
        <summary class="faq__spoergsmaal">
          <span>{{ s.sp }}</span>
          <!-- Plus, der bliver til et kryds, når svaret er åbent -->
          <span class="faq__ikon" aria-hidden="true"></span>
        </summary>

        <div class="faq__svar">
          <!-- Svaret sættes sammen stykke for stykke: link til vores egen side, almindeligt link eller tekst -->
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

// Lys baggrund med mørk tekst. Spørgsmålene til højre er stadig mørkegrønne kort med lys tekst
.faq {
  background-color: c.$primary_light25;
  color: c.$primary_black100;
  display: grid;
  grid-template-columns: 1fr;
  gap: s.$spacing-xl;

  // Desktop: overskrift til venstre, spørgsmål til højre
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

  p {
    margin: 0;
    max-width: 28rem;
  }
}

.faq__kontakt {
  margin-top: s.$spacing-xs;
}

/* --- Spørgsmålene --- */
// Hvert spørgsmål er et mørkegrønt kort. Listen har en fast højde og kan scrolles,
// så sektionen ikke bliver for lang
.faq__liste {
  display: flex;
  flex-direction: column;
  gap: s.$spacing-xs;
  max-height: 30rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: s.$spacing-s;  // luft mellem kortene og scrollbaren
  padding-bottom: 4rem;  // så det sidste spørgsmål kan scrolles fri af udtoningen
  // Svag udtoning i bunden, som viser, at der er flere spørgsmål
  mask-image: linear-gradient(to bottom, #000 85%, transparent 100%);
}

.faq__punkt {
  flex-shrink: 0;  // kortene må ikke klemmes sammen
  padding: 0 s.$spacing-s;
  border-radius: 1rem;
  background-color: c.$primary_darkgreen;
  color: c.$primary_light25;
}

// Spørgsmålet: fed tekst til venstre, plus til højre. Browserens egen trekant fjernes
.faq__spoergsmaal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: s.$spacing-s;
  padding: s.$spacing-s 0;
  // Samme regler som brødtekst i _typography.scss (16/18px, vægt 300)
  @include m.brodtekst;
  line-height: 1.35;
  list-style: none;
  cursor: pointer;
  transition: color 0.2s ease;

  // Skjuler Safaris egen trekant
  &::-webkit-details-marker {
    display: none;
  }

  // Lyserød ved hover – lilla kan ikke ses på den mørke baggrund
  &:hover {
    color: c.$forest_pink100;
  }

  // Fokusramme inde i kortet, så den ikke bliver skåret af
  &:focus-visible {
    outline: 3px solid c.$forest_pink100;
    outline-offset: -3px;
    border-radius: 0.5rem;
  }
}

// Plusset: to streger i en rund ring
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

// Åbent svar: plusset drejer og bliver til et kryds
.faq__punkt[open] .faq__ikon {
  transform: rotate(45deg);
  background-color: c.$primary_light25;
  color: c.$primary_darkgreen;
}

.faq__svar {
  padding: 0 s.$spacing-xl s.$spacing-s 0;

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

  // Punktopstilling uden den ekstra luft fra _typography.scss
  ul {
    margin: 0.75rem 0 0;
    padding: 0 0 0 1.25rem;
  }

  // Punkterne følger brødtekst-reglerne for li i _typography.scss
}

@media (prefers-reduced-motion: reduce) {
  .faq__ikon {
    transition: none;
  }
}
</style>
