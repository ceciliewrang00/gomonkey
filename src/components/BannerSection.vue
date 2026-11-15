<script setup>
import BaseButton from './BaseButton.vue'

// Link til booking. Samme adresse som "Book"-knappen i quizzen (QuizSide.vue) –
// ret begge steder, hvis I får en direkte bookingside
const BOOK_URL = 'https://gomonkey.dk'
</script>

<template>
  <section id="banner">
    <div class="banner__indhold">
      <span class="badge badge--outline banner__kicker">Klar til at slippe jorden?</span>
      <h2>
        Skru’ op for
        <span class="banner__fremhaev">modet</span>
      </h2>

      <!-- Knappen er .button-primary fra _buttons.scss -->
      <BaseButton variant="primary" :href="BOOK_URL" class="banner__knap">Book din tur</BaseButton>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/spacings' as s;

#banner {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  // Ingen fast højde – sektionen er så høj som indholdet plus luften fra section-reglen i main.scss
  display: flex;
  align-items: center;
  color: c.$primary_light25;

  // Sort bag billedet: når billedet skubbes til højre, bliver den smalle stribe
  // i venstre side sort – den ligger alligevel under den mørke gradient
  background-color: c.$primary_black100;

  // Billedet ligger i sit eget lag (::before) i samme størrelse som sektionen,
  // så det ikke zoomes. Det skubbes til højre med translateX.
  // Ret tallet for at flytte billedet: større tal = længere til højre
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -2;
    background: url('@/assets/images/klatrepark.webp') center 35% / cover no-repeat;
    transform: translateX(6%);
    // Billedets venstre kant toner blødt ud i den sorte baggrund,
    // så man ikke kan se, hvor billedet starter.
    // Helt sort de første 10%, og så toner billedet frem frem til 55%.
    // Større tal = det sorte dækker mere af billedet
    mask-image: linear-gradient(90deg, transparent 0%, transparent 10%, #000 55%);
  }

  // Mørk gradient fra venstre over billedet, så teksten kan læses
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: linear-gradient(100deg, rgba(c.$primary_black100, 0.85) 0%, rgba(c.$primary_black100, 0.45) 45%, rgba(c.$primary_black100, 0) 75%);
  }
}

.banner__indhold {
  max-width: 40rem;
}

// Udseendet kommer fra .badge i _badges.scss – her styres kun afstanden
.banner__kicker {
  margin-bottom: s.$spacing-s;
}

h2 {
  font-size: clamp(2.5rem, 7vw, 5rem);
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -0.02em;
  padding-top: 0;
}

// Book-knappen: form og størrelse kommer fra .button-primary i _buttons.scss.
// Her er den lyserød med sort tekst, så den kan ses på det mørke billede.
// display: inline-block, så margin virker på <a>
.banner__knap {
  display: inline-block;
  margin-top: s.$spacing-l;
  background-color: c.$forest_pink100;
  color: c.$primary_black100;

  // Samme hover som .button-primary: lilla baggrund, her med lys tekst
  &:hover {
    background-color: c.$secondary_purple100;
    color: c.$primary_light25;
  }
}

// "modet" står i pink kursiv med en streg under, der tegnes ind
.banner__fremhaev {
  position: relative;
  display: inline-block;
  color: c.$forest_pink100;
  font-style: italic;
  padding-right: 0.1em;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -0.08em;
    height: 0.14em;
    border-radius: 1em;
    background-color: c.$primary_light25;
    transform: rotate(-2deg);
    transform-origin: left;
    animation: streg 0.9s 0.3s ease-out both;
  }
}

@keyframes streg {
  from { transform: rotate(-2deg) scaleX(0); }
  to { transform: rotate(-2deg) scaleX(1); }
}

@media (prefers-reduced-motion: reduce) {
  .banner__fremhaev::after {
    animation: none;
  }
}
</style>
