<script setup>
</script>

<template>
  <section id="banner">
    <div class="banner__indhold">
      <span class="badge badge--outline banner__kicker">Klar til at slippe jorden?</span>
      <h2>
        Skru’ op for
        <span class="banner__fremhaev">modet</span>
      </h2>
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
  min-height: clamp(22rem, 60vh, 36rem);
  display: flex;
  align-items: center;
  color: c.$primary_light25;

  // Mørk gradient fra venstre over billedet, så teksten kan læses
  background:
    linear-gradient(100deg, rgba(c.$primary_black100, 0.85) 0%, rgba(c.$primary_black100, 0.45) 45%, rgba(c.$primary_black100, 0) 75%),
    url('@/assets/images/gomonkey_bane.webp') center 35% / cover no-repeat;
}

.banner__indhold {
  max-width: 40rem;
}

// Udseendet kommer fra .badge i _badges.scss – her styres kun afstanden
.banner__kicker {
  margin-bottom: s.$spacing-s;
}

h2 {
  font-size: clamp(2.75rem, 8vw, 6rem);
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -0.02em;
  padding-top: 0;
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
