<script setup>
import { computed } from 'vue'
import logoUrl from '@/assets/images/gomonkey-logo.svg'

const props = defineProps({
  bane: {
    type: Object,
    required: true
  }
})

defineEmits(['luk'])

// De tre skalaer i popuppen. Kun dem, banen har et tal for, bliver vist
const skalaer = computed(() => [
  { label: 'Sværhedsgrad', vaerdi: props.bane.svaerhedsgradTal },
  { label: 'Højde over jorden', vaerdi: props.bane.hoejdekravTal },
  { label: 'Adrenalin & fart', vaerdi: props.bane.adrenalinTal },
].filter(s => s.vaerdi))
</script>

<template>
  <!-- --bane-farve bruges til farvestregen i toppen og prikken ved navnet -->
  <div
    class="bane-popup"
    role="dialog"
    aria-labelledby="popup-titel"
    :style="{ '--bane-farve': bane.farve || '#CED0C0' }"
  >
    <div class="popup-header">
      <div class="popup-titel-gruppe">
        <span class="bane-farve-indikator" aria-hidden="true"></span>
        <h3 id="popup-titel">{{ bane.navn }}</h3>
      </div>
      <button
        type="button"
        class="popup-luk"
        aria-label="Luk information"
        @click="$emit('luk')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>

    <p v-if="bane.beskrivelse" class="popup-beskrivelse">
      {{ bane.beskrivelse }}
    </p>

    <!-- Skalaer: 5 logoer, de aktive står tydeligt -->
    <ul v-if="skalaer.length" class="popup-skalaer">
      <li v-for="s in skalaer" :key="s.label" class="skala">
        <span class="skala-label">{{ s.label }}</span>
        <span class="skala-ikoner">
          <img
            v-for="i in 5"
            :key="i"
            :src="logoUrl"
            alt=""
            class="skala-logo"
            :class="{ aktiv: i <= s.vaerdi }"
          />
          <!-- Skærmlæsere får tallet i stedet for 5 billeder -->
          <span class="sr-only">{{ s.vaerdi }} ud af 5</span>
        </span>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/spacings' as s;

.bane-popup {
  position: absolute;
  // Under knapperne øverst til højre ("Vis hele parken" og "Luk kort")
  top: 5.5rem;
  right: clamp(16px, 3vw, 42px);
  z-index: 10;
  width: min(22rem, calc(100% - 2 * #{s.$spacing-s}));
  overflow: hidden;
  padding: s.$spacing-s s.$spacing-s s.$spacing-s;
  border-radius: 1rem;
  background-color: c.$primary_light25;
  color: c.$primary_black100;
  box-shadow: 0 0.75rem 2rem rgba(c.$primary_darkgreen, 0.2);
  font-family: "Inter", sans-serif; // Samme font som resten af siden
  animation: popup-glid-ind 0.25s cubic-bezier(0.16, 1, 0.3, 1);

  // Farvestreg i toppen i banens farve
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 0.35rem;
    background-color: var(--bane-farve);
  }

  // Mobil: popuppen ligger i bunden af kortet i fuld bredde
  @media (max-width: 600px) {
    top: auto;
    left: s.$spacing-xs;
    right: s.$spacing-xs;
    bottom: s.$spacing-xs;
    width: auto;
  }
}

@keyframes popup-glid-ind {
  from {
    opacity: 0;
    transform: translateY(-0.6rem) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* --- Header --- */
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: s.$spacing-xs;
  padding-top: 0.25rem;
}

.popup-titel-gruppe {
  display: flex;
  align-items: center;
  gap: 0.6rem;

  h3 {
    margin: 0;
    padding-top: 0; // Nulstiller padding fra h3 i _typography.scss
    font-size: 1.25rem;
    font-weight: 900;
    line-height: 1.2;
  }
}

.bane-farve-indikator {
  flex-shrink: 0;
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 50%;
  background-color: var(--bane-farve);
  
}

.popup-luk {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  background-color: c.$primary_light50;
  color: c.$primary_darkgreen;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;

  svg {
    width: 1rem;
    height: 1rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.5;
    stroke-linecap: round;
  }

  &:hover {
    background-color: c.$primary_darkgreen;
    color: c.$primary_light25;
  }

  &:focus-visible {
    outline: 3px solid c.$secondary_purple100;
    outline-offset: 2px;
  }
}

/* --- Beskrivelse --- */
.popup-beskrivelse {
  margin: s.$spacing-xs 0 s.$spacing-s;
  font-size: 0.95rem;
  line-height: 1.5;
}

/* --- Skalaer --- */
.popup-skalaer {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: 0;
  padding: 0; // Nulstiller padding fra ul i _typography.scss
  list-style: none;
}

.skala {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: s.$spacing-xs;
  padding: 0.6rem 0.9rem;
  border-radius: 0.75rem;
  background-color: c.$forest_green25;
  font-size: 0.85rem; // Overskriver li-størrelsen fra _typography.scss
  line-height: 1.3;
}

.skala-label {
  font-weight: 600;
  color: c.$primary_darkgreen;
}

.skala-ikoner {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.skala-logo {
  width: 1.15rem;
  height: 1.15rem;
  object-fit: contain;
  opacity: 0.25;
  transition: opacity 0.2s ease;

  &.aktiv {
    opacity: 1;
  }
}

// Skjult tekst til skærmlæsere
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .bane-popup {
    animation: none;
  }
}
</style>
