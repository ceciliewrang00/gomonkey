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
        <h1>Oplev banerne</h1>
        <h3>GoMonkey Forrest Odense</h3>
      </div>
      <p>Fra den første forsigtige tur på svævebanen til frit fald fra ti meters højde. <br>Hos GoMonkey er der en bane til alle, uanset om du er en nybegynder eller en erfaren klatreabe.</p>
      <div class="double-button">
        <BaseButton variant="primary" href="#overblik">Se oversigtskort</BaseButton>
        <BaseButton variant="secondary" href="#bane-info">Se banerne</BaseButton>
      </div>
    </div>

    <!-- Billede med organisk form, skygge-form bagved og badge -->
    <div class="hero__visual">
      <div class="hero__shape" aria-hidden="true"></div>
      <img
        src="@/assets/images/banner2.webp"
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
  background-color: c.$forest-pink100;
  background-image: url('@/assets/images/leaves.svg');
  background-repeat: repeat;
  background-size: 150px;
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  gap: s.$spacing-xxl;
  overflow: hidden; // Så klistermærker ikke giver vandret scroll

  @media (min-width: 900px) {
    grid-template-columns: 1.1fr 1fr;
  }

  #hero__content {
    max-width: 50rem;

    #hero__content__title {
      display: flex;
      flex-direction: column;
    }
  }
}

.forest-icon {
  display: flex;
  flex-direction: row;
  gap: 1.5rem;
  align-items: center; // Teksten står i midten ud for ikonet
}

.icon {
  width: 3rem;
  height: 3rem;
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
