
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
            Kan du ikke afgøre, hvor du skal begynde? Svar på fem hurtige spørgsmål, så finder vi den bane, der passer perfekt til dit temperament og din gruppe. Det tager under et minut.
          </p>
        </div>

        <div class="kort-bund">
          <!-- .button-primary fra _buttons.scss. Farverne overskrives i .knap -->
          <RouterLink class="button-primary knap" to="/banequiz">Start banevælger</RouterLink>
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
  // Kun top/bund – siderne styres af .forside > section i main.scss
  padding-block: s.$spacing-xxl;

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
  border-radius: 1.5rem;
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
  padding: s.$spacing-xl;
  border-radius: 1.5rem;
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
  // Skubber teksten ned midt i kortet, ligesom på designet
  margin-block: auto;

  h2 {
    color: $pink;
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 400;
    line-height: 1.1;
    padding-top: 0;
    margin-bottom: s.$spacing-s;

    strong {
      font-weight: 900;
    }
  }

  p {
    margin: 0;
    max-width: 38rem;
    font-size: clamp(1.05rem, 1.5vw, 1.2rem);
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

// Knappen er .button-primary fra _buttons.scss.
// Her overskrives kun farverne: lyserød baggrund og sort tekst
.knap {
  background-color: $pink;
  color: c.$primary_black100;
  transition: background-color 0.2s;

  &:hover {
    background-color: c.$forest_pink75;
  }
}

// "Se banerne" (.button-arrow) styles helt i _buttons.scss
.knap:focus-visible {
  outline: 3px solid $pink;
  outline-offset: 4px;
}
</style>
