<script setup>
// Første spørgsmål fra banevælgeren ("Hvem skal klatre?") står direkte i sektionen.
// Et klik på et svar starter banevælgeren med svaret valgt, fx /banequiz?hvem=barn

import { ref, onMounted } from 'vue'

import { SPOERGSMAAL_URL } from '@/services/api.js'

// Bruges, hvis spørgsmålene ikke kan hentes. Samme svar som i Firebase
const RESERVE_SVAR = [
  { hvem: 'mig', tekst: 'Mig selv' },
  { hvem: 'barn', tekst: 'Mit barn' },
  { hvem: 'gruppeBoern', tekst: 'Børn og voksne sammen' },
  { hvem: 'gruppeVoksne', tekst: 'En gruppe voksne' },
]

const spoergsmaalTekst = ref('Hvem skal klatre?')
const svar = ref(RESERVE_SVAR)

// Henter "Hvem skal klatre?" fra Firebase, så teksterne er de samme som i banevælgeren
onMounted(async () => {
  try {
    const res = await fetch(`${SPOERGSMAAL_URL}.json`)
    if (!res.ok) return
    const data = await res.json()
    const sp = Object.values(data ?? {}).find((s) => s?.id === 'hvem')
    if (sp?.svar?.length) {
      spoergsmaalTekst.value = sp.tekst || spoergsmaalTekst.value
      svar.value = sp.svar.filter((s) => s?.hvem)
    }
  } catch (e) {
    console.error('Spørgsmålet kunne ikke hentes til "Find din bane"', e)
  }
})
</script>

<template>
  <section id="baner" class="baner-section">
    <div class="baner-container">
      <div class="billede-ramme">
        <img src="@/assets/images/bane-img.webp" alt="Klatrebaner" class="baner-img">
      </div>

      <div id="baner-content" class="baner-indhold">
        <span class="badge badge--dark">Banevælger</span>

        <h2>Find din bane</h2>
        <p>Tag vores banevælger: Svar på et par hurtige spørgsmål, så finder vi den bane, der passer til jer. Det tager under et minut.</p>

        <!-- Første spørgsmål. Hvert svar er et link, der starter banevælgeren med svaret valgt -->
        <div class="baner-spoergsmaal">
          <h4 class="baner-spoergsmaal__titel">{{ spoergsmaalTekst }}</h4>
          <ul class="baner-svar">
            <li v-for="s in svar" :key="s.hvem">
              <RouterLink :to="{ path: '/banequiz', query: { hvem: s.hvem } }" class="baner-svar__knap">
                <span>{{ s.tekst }}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/spacings' as s;
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/mixins' as m;

// Lyserød baggrund med blad-mønster, så sektionen bryder de mørke sektioner omkring den og ikke bliver overset
#baner {
  @include m.blad-baggrund;
  color: c.$primary_black100;

  .baner-container {
    display: grid;
    grid-template-columns: 2fr 3fr;
    // Billedet er lige så højt som indholdet, så de flugter i top og bund
    align-items: stretch;
    gap: s.$spacing-xl;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
      gap: s.$spacing-m;
    }
  }
}

/* --- Billede --- */
.billede-ramme {
  border-radius: 1rem;
  overflow: hidden;
  // Højden følger indholdet ved siden af. På mobil, hvor billedet står alene, er det mindst 16rem højt
  min-height: 16rem;

  .baner-img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

/* --- Tekst og knapper --- */
.baner-indhold {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: s.$spacing-s;

  // Hele overskriften er fed
  h2 {
    margin: 0;
    padding: 0;
    font-weight: 900;
  }

  p {
    margin: 0;
  }
}

/* --- Første spørgsmål --- */
.baner-spoergsmaal {
  width: 100%;
  margin-top: s.$spacing-xs;
}

// "Hvem skal klatre?" er en h4 og følger h4-reglerne i _typography.scss (størrelse og vægt)
.baner-spoergsmaal__titel {
  margin: 0 0 0.75rem;
  padding: 0;
}

// Svarene som store knapper, to pr. række på større skærme
.baner-svar {
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
    padding: 0;
  }
}

// Lyst kort med tekst og pil. Bliver mørkt ved hover, og pilen rykker
.baner-svar__knap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  height: 100%;
  box-sizing: border-box;
  padding: 0.9rem 1.1rem;
  border-radius: 1rem;
  background-color: c.$primary_light25;
  color: c.$primary_black100;
  font-weight: 400;
  line-height: 1.3;
  text-decoration: none;
  box-shadow: 0 0.25rem 0.75rem rgba(c.$primary_black100, 0.08);
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;

  svg {
    flex-shrink: 0;
    width: 1.1rem;
    height: 1.1rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 0.2s ease;
  }

  &:hover {
    background-color: c.$primary_black100;
    color: c.$primary_light25;
    transform: translateY(-2px);

    svg {
      transform: translateX(4px);
    }
  }

  &:focus-visible {
    outline: 3px solid c.$primary_black100;
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    svg {
      transition: none;
    }

    &:hover {
      transform: none;
    }
  }
}
</style>
