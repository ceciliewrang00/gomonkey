<script setup>
// Banefarverne – samme farver som på kortet.
// klasse er banens id fra $kort-bane-farver i _colors.scss
const baneFarver = [
  { navn: 'Bounce', klasse: 'bounce' },
  { navn: 'Gul', klasse: 'bane-1' },
  { navn: 'Grøn', klasse: 'bane-2' },
  { navn: 'Pink', klasse: 'bane-3' },
  { navn: 'Blå', klasse: 'bane-4' },
  { navn: 'Lilla', klasse: 'bane-5' },
  { navn: 'Rød', klasse: 'bane-6' },
  { navn: 'Sort', klasse: 'bane-7' },
]
</script>

<template>
  <section id="overblik" class="overblik-section">
    <div class="overblik-container">
      <!-- Kortet er ét stort link til kortsiden -->
      <RouterLink to="/kort" class="kort-kort" aria-label="Se det fulde kort">
        <img
          src="@/assets/images/gomonkeykort.webp"
          alt="Kort over GoMonkey Odense"
          class="overblik-kort"
        >
        <div class="kort-overlay">
          <!-- Knappen er .button-primary fra _buttons.scss.
               Kun farverne overskrives i .kort-knap nedenfor, så knappen er lyserød på kortet -->
          <span class="button-primary kort-knap">Se det fulde kort</span>
        </div>
      </RouterLink>

      <!-- Tekstindhold i mørkt kort -->
      <div id="overblik-tekst" class="tekst-indhold">
        <span class="badge">Udforsk terrænet</span>
        <h2>Overblik over parken</h2>
        <p class="lead">
          Før du kaster dig ud i eventyret, så få styr på terrænet. Vores interaktive kort viser dig alle baner, startpunkter og højdekurver.
        </p>
        <p class="sub-tekst">
          Hver bane har sin egen unikke farve og sværhedsgrad, så du nemt kan finde den perfekte udfordring for dig.
        </p>

        <!-- Farveforklaring: hvilken farve hver bane har på kortet -->
        <div class="farve-forklaring">
          <h3 id="banefarver-titel" class="farve-titel">Banernes farver</h3>

          <!-- Små mærker side om side, der bryder over på flere linjer, når pladsen slipper op -->
          <ul class="farve-liste" aria-labelledby="banefarver-titel">
            <li v-for="f in baneFarver" :key="f.klasse">
              <span class="markering" :class="`farve--${f.klasse}`" aria-hidden="true"></span>
              {{ f.navn }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/mixins' as m;
@use '@/assets/styles/spacings' as s;

#overblik {
  @include m.section-black100;
  // Kun top – siderne styres af .forside > section i main.scss
  padding-top: s.$spacing-xxl;
  padding-bottom: 0;

  // Tekst 2/5 til venstre, kort 3/5 til højre
  .overblik-container {
    display: grid;
    grid-template-columns: 1fr;
    align-items: stretch; // Kort og tekstkort får samme højde
    gap: s.$spacing-m;

    @media (min-width: 901px) {
      grid-template-columns: 2fr 3fr;

      // Kortet står først i HTML'en (så det ligger øverst på mobil),
      // men flyttes til højre kolonne på større skærme
      .kort-kort {
        order: 2;
      }
    }
  }

  /* --- Tekst i mørkt kort --- */
  .tekst-indhold {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: s.$spacing-s;
    padding: s.$spacing-xl;
    border-radius: 1.5rem;
    background-color: #0f1a10;

    // Svagt blad-mønster i baggrunden
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      background-image: url('@/assets/images/leaves.svg');
      background-size: 150px;
      background-repeat: repeat;
      filter: invert(1);
      opacity: 0.03;
    }

    h2 {
      font-size: clamp(2rem, 4vw, 2.75rem);
      font-weight: 800;
      line-height: 1.15;
      padding-top: 0;
      color: c.$forest_pink100;
    }

    p {
      margin: 0;
    }

    .lead {
      font-size: clamp(1.05rem, 1.5vw, 1.2rem);
    }

    .sub-tekst {
      font-size: 1rem;
      color: c.$primary_light25;
      padding-left: s.$spacing-s;
      border-left: 2px solid c.$forest_pink100;
    }
  }

  /* --- Farveforklaring --- */
  .farve-forklaring {
    margin-top: 0.25rem;
  }

  // Lille overskrift med store bogstaver, så den ikke konkurrerer med h2
  .farve-titel {
    margin: 0 0 0.6rem;
    padding: 0;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(c.$primary_light25, 0.7);
  }

  // Mærkerne står side om side og bryder over på næste linje (flex-wrap)
  .farve-liste {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    list-style: none;
    margin: 0;
    padding: 0;

    // Ét mærke pr. bane: svag lys baggrund med runde hjørner
    li {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.75rem 0.3rem 0.55rem;
      border-radius: 2rem;
      background-color: rgba(c.$primary_light25, 0.07);
      font-size: 0.85rem;
      font-weight: 500;
      line-height: 1.2;
    }

    // Prik i banens farve.
    // Tynd lys kant, så den sorte bane kan ses på den mørke baggrund
    .markering {
      flex-shrink: 0;
      width: 0.65rem;
      height: 0.65rem;
      border-radius: 50%;
      box-sizing: border-box;
      border: 1px solid rgba(c.$primary_light25, 0.3);
    }
  }

  // Farverne kommer fra $kort-bane-farver i _colors.scss (samme som på kortet)
  @each $navn, $farve in c.$kort-bane-farver {
    .farve--#{$navn} {
      background-color: $farve;
    }
  }

  /* --- Kort --- */
  .kort-kort {
    position: relative;
    display: block;
    min-height: 20rem;
    border-radius: 1.5rem;
    overflow: hidden;
    color: inherit;
    text-decoration: none;

    .overblik-kort {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      // Let sløring – scale skjuler de bløde kanter, som blur giver
      filter: blur(3px) brightness(0.85);
      transform: scale(1.05);
      transition: transform 0.6s ease, filter 0.4s ease;
    }

    // Let mørk tone over hele kortet, knappen står i midten
    .kort-overlay {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      padding: s.$spacing-m;
      background-color: rgba(c.$primary_black100, 0.25);
      transition: background-color 0.4s ease;
    }

    // Knappen er .button-primary fra _buttons.scss.
    // Her overskrives kun farverne: lyserød baggrund og sort tekst
    .kort-knap {
      background-color: c.$forest_pink100;
      color: c.$primary_black100;
    }

    &:hover,
    &:focus-visible {
      // Kortet bliver skarpt ved hover
      .overblik-kort {
        filter: blur(0) brightness(1);
        transform: scale(1.08);
      }

      .kort-overlay {
        background-color: rgba(c.$primary_black100, 0.1);
      }

      // Samme hover som .button-primary: lilla baggrund, her med lys tekst
      .kort-knap {
        background-color: c.$secondary_purple100;
        color: c.$primary_light25;
      }
    }

    &:focus-visible {
      outline: 3px solid c.$secondary_peach100;
      outline-offset: 4px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  #overblik .kort-kort .overblik-kort {
    transition: none;
  }
}
</style>
