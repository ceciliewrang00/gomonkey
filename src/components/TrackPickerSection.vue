<!--
  FIND DIN BANE
  Sektion på forsiden (HomeView) med et billede og et kort med tekst.
  Den har intet script, fordi der ikke er nogen data eller logik – kun to links:
  - "Start banevælger" går til quizzen på /banequiz (QuizView → QuizSide.vue)
  - "Se banerne" ruller ned til banekortene (#bane-info i TrackInfo.vue)
  id="baner" bruges af "Find din bane"-knappen i hero (href="#baner")
-->
<template>
  <section id="baner" class="baner-section">
    <div class="baner-container">
      <!-- Billede -->
      <div class="billede-ramme">
        <img src="@/assets/images/bane-img.webp" alt="Klatrebaner" class="baner-img">
      </div>

      <!-- Kort med tekst -->
      <div id="baner-content" class="baner-kort">
        <div class="tekst-indhold">
          <h2>Find din <strong>bane</strong></h2>
          <p>
            Kan du ikke afgøre, hvor du skal begynde? 
          </p>
          <p>Svar på fem hurtige spørgsmål, så finder vi den bane, der passer perfekt til dit temperament og din gruppe. Det tager under et minut.</p>
        </div>

        <div class="kort-bund">
          <!-- .button-primary + .button-pink fra _buttons.scss -->
          <RouterLink class="button-primary button-pink" to="/banequiz">Start banevælger</RouterLink>
          <!-- .button-arrow fra _buttons.scss: tekst med pil, der rykker ved hover -->
          <a class="button-arrow" href="#bane-info">
            Se banerne
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/mixins' as m;
@use '@/assets/styles/spacings' as s;
@use '@/assets/styles/colors' as c;

$kort-baggrund: #0f1a10;
$pink: c.$forest_pink100;

#baner {
  @include m.section-black100;
  // Luften i top, bund og sider kommer fra section-reglen i main.scss

  .baner-container {
    display: grid;
    grid-template-columns: 2fr 3fr;
    align-items: stretch; // Billede og kort får samme højde
    gap: s.$spacing-m;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }
}

/* --- Billede --- */
.billede-ramme {
  border-radius: 1rem;
  overflow: hidden;
  min-height: 20rem;

  .baner-img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

/* --- Kortet --- */
.baner-kort {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: s.$spacing-xl;
  padding: s.$spacing-l;
  border-radius: 1rem;
  background-color: $kort-baggrund;

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
}

.tekst-indhold {


  h2 {
    color: $pink;
    font-weight: 400;


    strong {
      font-weight: 900;
    }
  }

  p {
    color: c.$primary_light25;
  }
}

.kort-bund {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: s.$spacing-s;
}

// "Start banevælger" (.button-primary + .button-pink) og
// "Se banerne" (.button-arrow) styles helt i _buttons.scss
</style>
