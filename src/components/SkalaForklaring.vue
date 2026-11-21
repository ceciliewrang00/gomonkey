<script setup>
// Forklaringen af sværhedsgraden på forsiden. TrackInfo sætter den ind mellem introen og banerne.
// (i)-boblen på hver bane linker hertil med #skala-forklaring.
// Den er bevidst flad og lys (ingen kort, skygger eller hover), så den ikke ligner noget, man kan klikke på

import { NIVEAUER } from '@/services/baner.js'
</script>

<template>
  <section id="skala-forklaring" class="skala-sektion" aria-labelledby="skala-titel">
    <div class="skala">
      <!-- Overskrift og én linje om, hvordan bjælken læses -->
      <div class="skala__intro">
        <h3 id="skala-titel" class="skala__titel">Sådan læser du sværhedsgraden</h3>
        <p class="skala__tekst">
          Bjælken viser højde, svæv og hvor hårdt det er. Jo flere fyldte felter, jo sværere bane.
        </p>
      </div>

      <!-- De tre niveauer som en forklaring med samme bjælke som på banerne -->
      <ul class="skala__liste">
        <li v-for="(niveau, i) in NIVEAUER" :key="niveau.navn" class="skala__niveau">
          <div class="trin-bjaelke" aria-hidden="true">
            <span
              v-for="t in 3"
              :key="t"
              class="trin-bjaelke__trin"
              :class="{ 'er-fyldt': t <= i + 1 }"
            ></span>
          </div>
          <strong class="skala__navn">{{ niveau.navn }}</strong>
          <p class="skala__kort">{{ niveau.kort }}</p>
          <p v-if="niveau.passer" class="skala__passer">
            <strong>Passer til:</strong> {{ niveau.passer }}
          </p>
        </li>
      </ul>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/spacings' as s;

// Står inde i TrackInfo mellem introen og banerne: samme grønne baggrund og samme sidemargin
// som forsidens sektioner, og ingen luft i top og bund, da introen og banerne har deres egen
.skala-sektion {
  padding-block: 0;
  padding-inline: max(#{s.$spacing-m}, calc((100% - #{s.$indhold-bredde}) / 2));
  background-color: c.$forest_green25;
  scroll-margin-top: 6rem;  // så headeren ikke dækker forklaringen
}

/* --- Selve forklaringen ---
   Ingen baggrund og ingen kort: kun en tynd streg over og under, som en forklaring på et kort */
.skala {
  display: grid;
  grid-template-columns: 1fr;
  gap: s.$spacing-s;
  padding-block: s.$spacing-m;
  border-top: 1px solid rgba(c.$primary_darkgreen, 0.2);
  border-bottom: 1px solid rgba(c.$primary_darkgreen, 0.2);
  color: c.$primary_darkgreen;

  // Desktop: overskriften til venstre og de tre niveauer til højre
  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 15rem) minmax(0, 1fr);
    column-gap: s.$spacing-xl;
    align-items: start;
  }
}

.skala__titel {
  margin: 0;
  padding: 0;
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.3;
}

.skala__tekst {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

// Tre niveauer side om side på større skærme, under hinanden på mobil
.skala__liste {
  display: grid;
  grid-template-columns: 1fr;
  gap: s.$spacing-s;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: s.$spacing-m;
  }
}

.skala__niveau {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  // Almindelig pil, så det ikke ligner noget, man kan klikke på
  cursor: default;
}

.skala__navn {
  margin-top: 0.3rem;
  font-size: 1rem;
  font-weight: 800;
}

.skala__kort {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.45;
}

// "Passer til": lidt mindre og svagere end beskrivelsen, så det ikke bliver tungt
.skala__passer {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.45;
  opacity: 0.8;

  strong {
    font-weight: 700;
  }
}

/* --- Trin-bjælke (samme som på banerne i TrackInfo) ---
   Tre lige brede trin. Fyldte trin er mørkegrønne, tomme er lyse */
.trin-bjaelke {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  width: 100%;
  max-width: 9rem;

  .trin-bjaelke__trin {
    height: 0.6rem;
    background-color: c.$primary_light50;
  }

  // Runde hjørner i hver ende, så trinene ligner én bjælke
  .trin-bjaelke__trin:first-child {
    border-radius: 1rem 0 0 1rem;
  }

  .trin-bjaelke__trin:last-child {
    border-radius: 0 1rem 1rem 0;
  }

  .trin-bjaelke__trin.er-fyldt {
    background-color: c.$primary_darkgreen;
  }
}
</style>
