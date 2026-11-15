<script setup>
import BaseButton from './BaseButton.vue'
</script>

<template>
  <section id="hero">
    <div id="hero__content">
      <div id="hero__content__title">
        <div class="forest-icon">
          <img src="@/assets/images/forrest-ikon.webp" alt="Ikon med træer" class="icon">
          <h4>Forrest Odense</h4>
        </div>
        <h1>Hvor højt tør du?</h1>
        <h3>Klatring, svæv og frit fald midt i skoven</h3>
      </div>
      <p>8 baner i trætoppene – fra lave, trygge baner for de mindste til svæv på 126 meter og frit fald fra 16 meters højde. Der er en bane til dig, uanset om du er nybegynder eller erfaren klatreabe.</p>      <div class="double-button">
        <BaseButton variant="primary" href="#overblik">Find din bane</BaseButton>
        <BaseButton variant="secondary" href="#bane-info">Se oversigtskort</BaseButton>
      </div>
    </div>

    <!-- Billede med organisk form, skygge-form bagved og badge -->
    <div class="hero__visual">
      <div class="hero__shape" aria-hidden="true"></div>
      <img
        src="@/assets/images/gomonkey_bane.webp"
        alt="Pige på svævebanen mellem træerne i GoMonkey Forest Odense"
        class="hero__img"
      >

      <!-- Lille badge -->
      <span class="hero__badge">
        <strong>8 klatrebaner</strong> fra let til vild
      </span>
    </div>
  </section>
</template>

<style lang="scss" scoped>

@use '@/assets/styles/spacings' as s;
@use '@/assets/styles/colors' as c;

// Organisk "blad/sten"-form til billedet
$form: 62% 38% 46% 54% / 55% 45% 55% 45%;

#hero {
  // position + isolation, så blad-mønsteret (::before) kan ligge bag indholdet
  position: relative;
  isolation: isolate;
  background-color: c.$forest-pink100;
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  gap: s.$spacing-xxl;
  overflow: hidden; // Så klistermærker ikke giver vandret scroll

  @media (min-width: 900px) {
    grid-template-columns: 1.1fr 1fr;
  }

  // Blad-mønsteret i baggrunden. Det ligger i sit eget lag, så det kan gøres
  // svagere med opacity uden at teksten og billedet også bliver gennemsigtige.
  // z-index: -1 lægger det bag indholdet. Ret opacity for at gøre det svagere/stærkere
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background-image: url('@/assets/images/leaves.svg');
    background-repeat: repeat;
    background-size: 150px;
    opacity: 0.8;
  }

  #hero__content {
    max-width: 36rem;

    #hero__content__title {
      display: flex;
      flex-direction: column;
    }
  }
}

/* --- Teksten ---
   Tydeligt hierarki: lille "Forrest Odense" øverst, stor overskrift,
   mellemstor undertitel, rolig brødtekst og så knapperne.
   Luften mellem hvert lag gør, at man læser ét ting ad gangen */

// Lille "etiket" øverst: ikon + Forrest Odense med store bogstaver
.forest-icon {
  display: flex;
  flex-direction: row;
  gap: 0.75rem;
  align-items: center; // Teksten står i midten ud for ikonet
  margin-bottom: s.$spacing-s;

  h4 {
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
}

.icon {
  width: 2.25rem;
  height: 2.25rem;
}

// Stor, tæt overskrift – det første øjet rammer
#hero h1 {
  
  line-height: 0.98;
  letter-spacing: -0.02em;
}

// Undertitlen: tydeligt mindre og lettere end overskriften
#hero h3 {
  padding-top: 0;
  margin-top: s.$spacing-s;
  font-size: clamp(1.2rem, 2vw, 1.55rem);
  font-weight: 500;
  line-height: 1.3;
}

// Brødteksten: lidt luft over og en behagelig linjelængde
#hero__content > p {
  max-width: 32rem;
  margin: s.$spacing-m 0 0;
  font-size: clamp(1rem, 1.3vw, 1.125rem);
  line-height: 1.65;
}

// God afstand ned til knapperne, så de står for sig selv
#hero .double-button {
  margin-top: s.$spacing-l;
  gap: 1rem;

  
}

/* --- Billedet --- */
.hero__visual {
  position: relative;
  width: min(100%, 34rem);
  aspect-ratio: 1 / 1.05;
  justify-self: center;
  margin-block: s.$spacing-m;
}

// Sort form bagved, lidt forskudt – giver dybde og "klistermærke"-look
.hero__shape {
  position: absolute;
  inset: 0;
  border-radius: $form;
  background-color: c.$primary_black100;
  transform: translate(1rem, 1rem) rotate(-4deg);
}

.hero__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 40%; // Hold fokus på personen på svævebanen
  border-radius: $form;
  border: 6px solid c.$primary_light25;
  transform: rotate(-4deg);
  transition: transform 0.5s ease, border-radius 0.8s ease;
}

.hero__visual:hover .hero__img {
  transform: rotate(-1deg) scale(1.02);
  border-radius: 48% 52% 58% 42% / 45% 55% 45% 55%;
}

/* --- Badge --- */
.hero__badge {
  position: absolute;
  right: -0.5rem;
  bottom: 12%;
  padding: 0.7rem 1.2rem;
  border-radius: 3rem;
  background-color: c.$secondary_purple100;
  color: c.$primary_light25;
  box-shadow: 4px 4px 0 c.$primary_black100;
  transform: rotate(6deg);

  strong {
    font-weight: 900;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__img {
    transition: none;
  }
}
</style>
