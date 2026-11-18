<script setup>
// BANNER – "Skru' op for modet"
// Et stort banner på forsiden (HomeView) mellem "Find din bane" og banekortene.
// Kun tekst og en bookingknap – ingen data fra Firebase.
import BaseButton from './BaseButton.vue'

// Link til booking – står ét sted i services/api.js
import { BOOK_URL } from '@/services/api.js'
</script>

<template>
  <section id="banner">
    <div class="banner__indhold">
      <span class="badge badge--outline banner__kicker">Klar til at slippe jorden?</span>
      <h2>
        Skru’ op for
        <span class="fremhaev">modet</span>
      </h2>

      <!-- Knappen er .button-primary fra _buttons.scss -->
      <BaseButton variant="primary" :href="BOOK_URL" class="button-pink banner__knap">Book din tur</BaseButton>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/mixins' as m;
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
    // Samme gradient som hero (billede-gradient i _mixins.scss)
    background: m.billede-gradient();
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

// Book-knappen: .button-primary + .button-pink fra _buttons.scss.
// Her styres kun afstanden. display: inline-block, så margin virker på <a>
.banner__knap {
  display: inline-block;
  margin-top: s.$spacing-l;
}

// "modet" bruger den fælles .fremhaev-klasse fra _typography.scss
// (pink kursiv med en streg under, der tegnes ind – samme som "du?" i hero)
</style>
