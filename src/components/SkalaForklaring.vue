<script setup>
// Forklaringen af sværhedsgraden på forsiden. Står lige over baneoversigten (TrackInfo).
// (i)-boblen på hver bane linker hertil med #skala-forklaring

import { NIVEAUER } from '@/services/baner.js'
</script>

<template>
  <section id="skala-forklaring" class="skala-sektion" aria-labelledby="skala-titel">
    <!-- Mørk boks med de tre niveauer -->
    <div class="skala-forklaring">
      <h4 id="skala-titel" class="skala-titel">Hvad betyder sværhedsgraden?</h4>
      <p class="skala-tekst">
        Sværhedsgraden viser, hvor højt oppe du er, hvor lange svævene er, og hvor meget banen kræver af din krop og dit mod. Jo flere trin der er fyldt ud på bjælken, jo sværere er banen.
      </p>

      <!-- De tre niveauer med samme bjælke som banerne -->
      <ul class="skala-trin">
        <li v-for="(niveau, i) in NIVEAUER" :key="niveau.navn">
          <div class="trin-bjaelke" aria-hidden="true">
            <span
              v-for="t in 3"
              :key="t"
              class="trin-bjaelke__trin"
              :class="{ 'er-fyldt': t <= i + 1 }"
            ></span>
          </div>
          <strong class="skala-trin__navn">{{ niveau.navn }}</strong>
          <p class="skala-trin__tekst">{{ niveau.tekst }}</p>
          <p v-if="niveau.passer" class="skala-trin__tekst">
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

// Samme grønne baggrund som banerne under, og ingen luft i bunden,
// så den går direkte over i baneoversigten
.skala-sektion {
  padding-bottom: 0;
  background-color: c.$forest_green25;
  scroll-margin-top: 6rem;  // så headeren ikke dækker forklaringen
}

/* --- Den mørke boks --- */
.skala-forklaring {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  box-sizing: border-box;
  padding: s.$spacing-l;
  border-radius: 1rem;
  background-color: c.$primary_darkgreen;
  color: c.$primary_light25;
  // Kortene står under hinanden, når boksen er smal (se @container nedenfor)
  container-type: inline-size;
}

.skala-titel {
  margin: 0;
  padding: 0;
  font-weight: 700;
}

// Teksten holdes i en behagelig linjelængde
.skala-tekst {
  max-width: 60ch;
  margin: 0;
}

// Let, Mellem og Svær som tre små kort side om side
.skala-trin {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
  margin: 0.4rem 0 0;
  padding: 0;
  list-style: none;

  // Ét kort pr. niveau med samme lyse baggrund som banerne, så bjælken ser ens ud
  > li {
    padding: 0.9rem 1rem 1rem;
    border-radius: 0.75rem;
    background-color: c.$forest_green25;
    color: c.$primary_black100;
  }

  .trin-bjaelke {
    margin-bottom: 0.75rem;
  }

  .skala-trin__navn {
    display: block;
    font-size: 1rem;
    font-weight: 800;
  }

  .skala-trin__tekst {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    line-height: 1.45;
    color: c.$primary_black100;

    strong {
      font-weight: 700;
    }
  }
}

// @container kigger på boksens bredde og ikke skærmens
@container (max-width: 34rem) {
  .skala-trin {
    grid-template-columns: 1fr;
  }
}

/* --- Trin-bjælke (samme som på banerne i TrackInfo) ---
   Tre lige brede trin. Fyldte trin er mørkegrønne, tomme er lyse */
.trin-bjaelke {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  width: 100%;

  .trin-bjaelke__trin {
    height: 0.75rem;
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
