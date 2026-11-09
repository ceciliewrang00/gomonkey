<script setup>
// Banefarverne – samme farver som i TrackBadge
const baneFarver = [
  { navn: 'Grøn', klasse: 'groen' },
  { navn: 'Blå', klasse: 'blaa' },
  { navn: 'Rød', klasse: 'roed' },
  { navn: 'Sort', klasse: 'sort' },
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

        <!-- Farveforklaring -->
        <ul class="farve-liste" aria-label="Banefarver">
          <li v-for="f in baneFarver" :key="f.klasse">
            <span class="prik" :class="`prik--${f.klasse}`"></span>
            {{ f.navn }}
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/mixins' as m;
@use '@/assets/styles/spacings' as s;

$linje: rgba(239, 233, 229, 0.12);

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
  .farve-liste {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    list-style: none;
    margin: 0;
    padding: s.$spacing-xs 0 0;

    li {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding-right: 1rem;

      border-radius: 2rem;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .prik {
      width: 0.9rem;
      height: 0.9rem;
      border-radius: 50%;
  
    }

    // Farverne kommer fra $bane-farver i _colors.scss
    @each $navn, $farve in c.$bane-farver {
      .prik--#{$navn} {
        background-color: $farve;
      }
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
