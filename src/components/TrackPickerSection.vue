<!-- Sektionen "Find din bane" på forsiden: billede, kort tekst og knap til quizzen (/banequiz)
     og et link ned til banekortene (#bane-info) -->
<template>
  <section id="baner" class="baner-section">
    <div class="baner-container">
      <div class="billede-ramme">
        <img src="@/assets/images/bane-img.webp" alt="Klatrebaner" class="baner-img">
      </div>

      <div id="baner-content" class="baner-indhold">
        <!-- Lille mærke, der viser, at det er hurtigt -->
        <span class="badge baner-badge">Banevælger · under 1 minut</span>

        <h2>Find din bane</h2>
        <p>Svar på fem hurtige spørgsmål, så finder vi den bane, der passer til dig, dit barn eller jeres gruppe.</p>

        <!-- Knapperne står lige under teksten, så man ikke skal lede efter dem -->
        <div class="baner-knapper">
          <RouterLink class="button-primary baner-start" to="/banequiz">Start banevælger</RouterLink>
          <a class="button-arrow baner-se" href="#bane-info">
            Se alle baner
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </a>
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
    align-items: center;
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
  aspect-ratio: 4 / 3;

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
  max-width: 36rem;

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

// Mærket: mørk kant og tekst på den lyse baggrund
.baner-badge {
  --badge-bg: transparent;
  --badge-color: #{c.$primary_black100};
  border: 1.5px solid c.$primary_black100;
}

.baner-knapper {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: s.$spacing-s s.$spacing-m;
  margin-top: s.$spacing-xs;
}

// "Se alle baner" er mørk, fordi den lyserøde standardfarve ikke kan ses på lyserød baggrund
.baner-se {
  color: c.$primary_black100;
  font-weight: 700;
}
</style>
