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
          <span class="kort-knap">
            <!-- Kort-nål i en lille rund boks -->
            <span class="kort-knap__ikon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </span>
            Se det fulde kort
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="arrow-icon"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </span>
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

    .kort-knap {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 1.25rem 0.5rem 0.5rem;
      border-radius: 1rem;
      background-color: c.$primary_light25;
      color: c.$primary_black100;
      // Samme skrift som .button-primary (t.button i _typography.scss)
      font-family: "Inter", sans-serif;
      font-weight: 900;
      font-size: 1rem;
      box-shadow: 0 0.75rem 2rem rgba(c.$primary_black100, 0.35);
      transition: background-color 0.2s, color 0.2s, transform 0.2s ease;
    }

    // Kort-nålen i en lille rund boks
    .kort-knap__ikon {
      display: grid;
      place-items: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.75rem;
      background-color: c.$primary_black100;
      color: c.$primary_light25;
      transition: background-color 0.2s, color 0.2s;

      svg {
        width: 1.1rem;
        height: 1.1rem;
      }
    }

    .arrow-icon {
      transition: transform 0.2s ease;
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

      .kort-knap {
        background-color: c.$secondary_purple100;
        color: c.$primary_light25;
        transform: translateY(-2px);
      }

      .kort-knap__ikon {
        background-color: c.$primary_light25;
        color: c.$secondary_purple100;
      }

      .arrow-icon {
        transform: translateX(4px);
      }
    }

    &:focus-visible {
      outline: 3px solid c.$secondary_peach100;
      outline-offset: 4px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  #overblik .kort-kort .overblik-kort,
  #overblik .kort-kort .arrow-icon {
    transition: none;
  }
}
</style>
