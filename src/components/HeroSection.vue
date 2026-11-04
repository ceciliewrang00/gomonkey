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

    <!-- Billede med organisk form, skygge-form bagved og klistermærker -->
    <div class="hero__visual">
      <div class="hero__shape" aria-hidden="true"></div>
      <img
        src="@/assets/images/banner2.webp"
        alt="Pige på svævebanen mellem træerne i GoMonkey Forest Odense"
        class="hero__img"
      >

      <!-- Roterende rundt klistermærke med tekst -->
      <svg class="hero__sticker" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <path id="cirkel" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0" />
        </defs>
        <circle cx="100" cy="100" r="98" class="sticker__bg" />
        <text class="sticker__tekst">
          <textPath href="#cirkel">Nervepirrende frihed • GoMonkey Forest •</textPath>
        </text>
        <!-- Lille blad i midten -->
        <path
          class="sticker__blad"
          transform="translate(78 70) scale(0.8)"
          d="M23.0276 59.6511C22.875 59.9555 22.06 60.2471 21.7352 60.2097C21.3571 60.1646 20.6443 59.4991 20.6461 59.096L20.5995 53.9768C14.4015 50.052 13.1281 42.9775 13.9766 36.008C14.6373 30.5236 16.3876 25.4719 18.9178 20.4895C22.3177 13.7807 25.1533 7.06931 27.5489 0C32.1661 4.88277 35.5376 10.1433 37.8317 16.1097C40.4021 22.9977 41.277 30.1423 40.0676 37.3769C38.3534 46.3061 34.3657 52.1329 25.5339 54.4701L23.0276 59.6511Z"
        />
      </svg>

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
  align-items: flex-end;
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

/* --- Roterende klistermærke --- */
.hero__sticker {
  position: absolute;
  top: -1.5rem;
  left: -1.5rem;
  width: clamp(6.5rem, 12vw, 9rem);
  animation: roter 18s linear infinite;

  .sticker__bg {
    fill: c.$primary_black100;
  }

  .sticker__tekst {
    fill: c.$primary_light25;
    font-family: "Inter", sans-serif;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: 2.5px;
    text-transform: uppercase;
  }

  .sticker__blad {
    fill: c.$forest_pink100;
  }
}

@keyframes roter {
  to {
    transform: rotate(360deg);
  }
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
  .hero__sticker {
    animation: none;
  }

  .hero__img {
    transition: none;
  }
}
</style>
