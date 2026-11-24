<script setup>
// Prisboksen på forsiden: pris for børn og voksne, hvad der er med i besøget, og tilkøb.
// Forsidens menu linker hertil (#priser)

import { BOOK_URL } from '@/services/api.js'

// Priserne for standard klatring (3 timer)
const PRISER = [
  { navn: 'Børn', alder: '6–12 år', pris: 230 },
  { navn: 'Unge og voksne', alder: 'Fra 13 år', pris: 260 },
]

// Det, der er med i prisen
const INKLUDERET = [
  '3 timers klatring',
  'Instruktion',
  'Leje af klatresele og hjelm',
  'Trampolinnet i træerne (Bounce)',
]

// Ekstra priser, der er gode at kende
const TILKOEB = [
  { tekst: 'Frit fald på Sort bane', pris: '+30 kr.' },
  { tekst: 'Kun Bounce (uden klatring)', pris: '40 kr.' },
  { tekst: 'Se på fra jorden', pris: 'Gratis' },
]
</script>

<template>
  <section id="priser" class="priser" aria-labelledby="priser-titel">
    <!-- Venstre: overskrift og hvad der er med -->
    <div class="priser__intro">
      <span class="badge badge--dark">Priser</span>
      <h2 id="priser-titel">Hvad koster et besøg?</h2>
      <p>Prisen gælder hele besøget: <br>Udstyr, instruktion og Bounce er med.</p>

      <h4 class="priser__undertitel">Det får I</h4>
      <ul class="priser__inkluderet">
        <li v-for="punkt in INKLUDERET" :key="punkt">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
          {{ punkt }}
        </li>
      </ul>

      <!-- Grupper og arrangementer har egne priser – her står, hvordan man kontakter parken -->
      <div class="priser__grupper">
        <h4 class="priser__undertitel">Skole, institution eller arrangement?</h4>
        <p>
          Kommer I som skole eller institution, eller skal I holde fødselsdag, polterabend,
          teambuilding eller blå mandag? Så har vi særlige priser og pakker. Kontakt os, så finder vi det rigtige til jer.
        </p>
        <p class="priser__kontakt">
          <a href="tel:+4525533022">Ring 25 53 30 22</a>
          <span aria-hidden="true">·</span>
          <a href="mailto:forestodense@gomonkey.dk">forestodense@gomonkey.dk</a>
        </p>
      </div>
    </div>

    <!-- Højre: selve prisboksen -->
    <div class="priser__boks">
      <p class="priser__boks-titel etiket etiket--lys">Standard klatring · 3 timer</p>

      <!-- Børn og voksne -->
      <dl class="priser__liste">
        <div v-for="p in PRISER" :key="p.navn" class="priser__pris">
          <dt>
            <strong>{{ p.navn }}</strong>
            <span class="etiket etiket--lys">{{ p.alder }}</span>
          </dt>
          <dd>{{ p.pris }} <span>kr.</span></dd>
        </div>
      </dl>

      <!-- Tilkøb og gratis -->
      <ul class="priser__tilkoeb">
        <li v-for="t in TILKOEB" :key="t.tekst">
          <span>{{ t.tekst }}</span>
          <span class="priser__tilkoeb-pris">{{ t.pris }}</span>
        </li>
      </ul>

      <a :href="BOOK_URL" class="button-primary button-pink priser__knap">Book jeres besøg</a>
      <p class="priser__note lille-tekst">Priserne er vejledende. Den endelige pris ser du, når du booker.</p>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/spacings' as s;
@use '@/assets/styles/mixins' as m;

// Lyserød baggrund med blad-mønster, samme som "Find din bane"
.priser {
  @include m.blad-baggrund;
  display: grid;
  grid-template-columns: 1fr;
  gap: s.$spacing-xl;
  color: c.$primary_black100;

  // Desktop: tekst til venstre, prisboks til højre
  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 28rem);
    column-gap: s.$spacing-xxl;
    align-items: center;
  }
}

/* --- Venstre side --- */
.priser__intro {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: s.$spacing-s;

  h2 {
    padding-top: 0;
  }

  p {
    margin: 0;
    max-width: 34rem;
  }
}

// Små overskrifter er h4 og følger h4-reglerne i _typography.scss (størrelse og vægt)
.priser__undertitel {
  margin: s.$spacing-xs 0 0;
  padding: 0;
}

// Grupper og arrangementer: adskilt fra listen over med en tynd streg
.priser__grupper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 36rem;
  margin-top: s.$spacing-xs;
  padding-top: s.$spacing-s;
  border-top: 1px solid rgba(c.$primary_black100, 0.15);

  .priser__undertitel {
    margin: 0;
  }

  p {
    line-height: 1.55;
  }
}

// Telefon og mail som tydelige links
.priser__kontakt {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.6rem;
  font-weight: 700;

  a {
    color: c.$primary_darkgreen;
    text-underline-offset: 3px;

    &:hover {
      color: c.$secondary_purple100;
    }
  }
}

.priser__inkluderet {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (min-width: 520px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    // Teksten følger brødtekst-reglerne for li i _typography.scss
  }

  // Flueben i en mørk cirkel, så de kan ses på den lyserøde baggrund
  svg {
    flex-shrink: 0;
    box-sizing: border-box;
    width: 1.6rem;
    height: 1.6rem;
    padding: 0.3rem;
    border-radius: 50%;
    background-color: c.$primary_darkgreen;
    fill: none;
    stroke: c.$primary_light25;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

/* --- Prisboksen --- */
.priser__boks {
  display: flex;
  flex-direction: column;
  gap: s.$spacing-s;
  padding: s.$spacing-l;
  border-radius: 1rem;
  background-color: c.$primary_darkgreen;
  color: c.$primary_light25;
}

// Teksten følger .etiket i _typography.scss. Her fjernes kun luften
.priser__boks-titel {
  margin: 0;
}

// Børn og voksne som to rækker med prisen stort til højre
.priser__liste {
  display: flex;
  flex-direction: column;
  margin: 0;
}

.priser__pris {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: s.$spacing-s;
  padding: 0.9rem 0;
  border-bottom: 1px solid rgba(c.$primary_light25, 0.15);

  dt {
    display: flex;
    flex-direction: column;

    strong {
      font-size: 1.1rem;
      font-weight: 800;
    }

    // Alderen følger .etiket i _typography.scss
  }

  dd {
    margin: 0;
    font-size: 2rem;
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;

    span {
      font-size: 1rem;
      font-weight: 700;
    }
  }
}

.priser__tilkoeb {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    justify-content: space-between;
    gap: s.$spacing-s;
    line-height: 1.4;
  }
}

.priser__tilkoeb-pris {
  font-weight: 700;
  white-space: nowrap;
}

// Knappen fylder hele boksens bredde (button-primary er ellers kun så bred som teksten)
.priser__knap {
  width: 100%;
  box-sizing: border-box;
  margin-top: 0.25rem;
  text-align: center;
}

// Teksten følger .lille-tekst i _typography.scss (brødtekst i 14px)
.priser__note {
  margin: 0;
}
</style>
