<script setup>
// Sektionen på forsiden med et billede af kortet (link til /kort) og en forklaring af banernes farver.
// Navnene hentes fra Firebase, farverne kommer fra $kort-bane-farver i _colors.scss

import { ref, onMounted } from 'vue'

import { hentBaner, harSvaerhedsgrad } from '@/services/baner.js'

// Listerne til farveforklaringen: [{ navn: 'Grøn', klasse: 'bane-1' }, ...]
// Klatrebanerne for sig, og aktiviteter uden sværhedsgrad (Bounce) for sig
const baneFarver = ref([])
const andreAktiviteter = ref([])

// Henter banerne og beholder kun navn og id. Fejler det, forbliver listerne tomme
onMounted(async () => {
  try {
    const baner = await hentBaner()
    const tilMaerke = (bane) => ({ navn: bane.name, klasse: bane.id })
    baneFarver.value = baner.filter(harSvaerhedsgrad).map(tilMaerke)
    andreAktiviteter.value = baner.filter((bane) => !harSvaerhedsgrad(bane)).map(tilMaerke)
  } catch (e) {
    console.error('Banerne kunne ikke hentes til farveforklaringen', e)
  }
})
</script>

<template>
  <section id="overblik" class="overblik-section">
    <div class="overblik-container">
      <!-- Kortet er ét stort link til kortsiden -->
      <RouterLink to="/kort" class="kort-kort" aria-label="Se det fulde kort">
        <img
          src="@/assets/images/kort_forrestodense.png"
          alt="Kort over GoMonkey Odense"
          class="overblik-kort"
        >
        <div class="kort-overlay">
          <span class="button-primary button-pink kort-knap">Se det fulde kort</span>
        </div>
      </RouterLink>

      <div id="overblik-tekst" class="tekst-indhold">
        <span class="badge badge--outline-green">Udforsk terrænet</span>
        <h2>Overblik over parken</h2>
        <p class="lead">
          Før du kaster dig ud i eventyret, så få styr på terrænet. Vores interaktive kort viser dig alle baner, startpunkter og højdekurver.
        </p>
        <p class="sub-tekst">
          Hver bane har sin egen unikke farve og sværhedsgrad, så du nemt kan finde den perfekte udfordring for dig.
        </p>

        <!-- Hvilken farve hver bane har på kortet -->
        <div class="farve-forklaring">
          <h3 id="banefarver-titel" class="farve-titel">Banernes farver</h3>

          <ul class="farve-liste" aria-labelledby="banefarver-titel">
            <li v-for="f in baneFarver" :key="f.klasse">
              <span class="markering" :class="`farve--${f.klasse}`" aria-hidden="true"></span>
              {{ f.navn }}
            </li>
          </ul>

          <!-- Bounce er ikke en klatrebane og står derfor for sig selv -->
          <template v-if="andreAktiviteter.length">
            <h3 id="andre-aktiviteter-titel" class="farve-titel farve-titel--andre">Andre aktiviteter</h3>

            <ul class="farve-liste" aria-labelledby="andre-aktiviteter-titel">
              <li v-for="f in andreAktiviteter" :key="f.klasse" class="farve-liste__andet">
                <span class="markering" :class="`farve--${f.klasse}`" aria-hidden="true"></span>
                {{ f.navn }}
              </li>
            </ul>
          </template>
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

  // Tekst 2/5 til venstre, kort 3/5 til højre
  .overblik-container {
    display: grid;
    grid-template-columns: 1fr;
    align-items: stretch;  // kort og tekst får samme højde
    gap: s.$spacing-m;

    @media (min-width: 901px) {
      grid-template-columns: 2fr 3fr;

      // Kortet står først i HTML'en (øverst på mobil), men flyttes til højre på større skærme
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
    padding: s.$spacing-l;
    border-radius: 1rem;
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

  // Lille overskrift med store bogstaver
  .farve-titel {
    margin: 0 0 0.6rem;
    padding: 0;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(c.$primary_light25, 0.7);

    // Luft over overskriften til Bounce
    &--andre {
      margin-top: s.$spacing-s;
    }
  }

  // 4 lige brede mærker pr. linje, så de står præcis under hinanden
  .farve-liste {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.4rem;
    list-style: none;
    margin: 0;
    padding: 0;

    // Mobil: 2 mærker pr. linje
    @media (max-width: 520px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    // Ét mærke pr. bane med svag lys baggrund
    li {
      display: flex;
      align-items: center;
      min-width: 0;
      white-space: nowrap;
      gap: 0.4rem;
      padding: 0.3rem 0.75rem 0.3rem 0.55rem;
      border-radius: 2rem;
      background-color: rgba(c.$primary_light25, 0.07);
      font-size: 0.85rem;
      font-weight: 500;
      line-height: 1.2;
    }

    // Prik i banens farve med en tynd lys kant, så den sorte bane kan ses
    .markering {
      flex-shrink: 0;
      width: 0.65rem;
      height: 0.65rem;
      border-radius: 50%;
      box-sizing: border-box;
      border: 1px solid rgba(c.$primary_light25, 0.3);
    }

    // Bounce: stiplet kant og ingen fyldt baggrund, så det ikke ligner en bane
    .farve-liste__andet {
      background-color: transparent;
      border: 1px dashed rgba(c.$primary_light25, 0.35);
    }
  }

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
    border-radius: 1rem;
    overflow: hidden;
    color: inherit;
    text-decoration: none;

    .overblik-kort {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      // Let sløring. scale skjuler de bløde kanter, som blur giver
      filter: blur(3px) brightness(0.85);
      transform: scale(1.05);
      transition: transform 0.6s ease, filter 0.4s ease;
    }

    // Mørk tone over kortet med knappen i midten
    .kort-overlay {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      padding: s.$spacing-m;
      background-color: rgba(c.$primary_black100, 0.25);
      transition: background-color 0.4s ease;
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

      // Lilla ved hover ligesom .button-primary
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
