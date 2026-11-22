<script setup>
// Sektionen "Sådan følger du dit barn" på forsiden.
// Forklarer, hvad den voksne kan gøre, mens barnet klatrer – og hvad man ikke kan.
// Banevælgeren linker hertil (/#foelg-barnet), når svaret er "Mit barn"

// Ikonet på kortet "Klatr med på banen"
import klatreIkon from '@/assets/images/klatreikon.svg'

// De tre muligheder. ikon = hvilken tegning der vises (se templaten)
const MULIGHEDER = [
  {
    ikon: 'klatr',
    titel: 'Klatr med på banen',
    tekst: 'Du klatrer sammen med dit barn. Så skal du selv have udstyr på og købe billet.',
  },
  {
    ikon: 'gaa',
    titel: 'Gå med på jorden og hep',
    tekst: 'Følg med under banen og hep på dit barn hele vejen. Det er gratis at gå med.',
  },
  {
    ikon: 'maal',
    titel: 'Vent ved start eller mål',
    tekst: 'Sig på gensyn ved starten, og tag imod dit barn, når det kommer ned igen.',
  },
]
</script>

<template>
  <section id="foelg-barnet" class="foelg" aria-labelledby="foelg-titel">
    <div class="foelg__intro">
      <span class="badge badge--outline-green">For forældre</span>
      <h2 id="foelg-titel">Sådan følger du dit barn</h2>
      <p>
        Du bestemmer selv, hvor tæt du vil være på. Vores instruktører holder øje med banerne
        og hjælper, hvis nogen sidder fast eller vil ned.
      </p>
    </div>

    <!-- De tre muligheder, hver med et ikon -->
    <ul class="foelg__liste">
      <li v-for="m in MULIGHEDER" :key="m.ikon" class="foelg__kort">
        <span class="foelg__ikon" aria-hidden="true">
          <!-- Klatr med: klatreikon.svg -->
          <img v-if="m.ikon === 'klatr'" :src="klatreIkon" alt="" class="foelg__ikon-billede">
          <!-- Gå med: to fodspor -->
          <svg v-else-if="m.ikon === 'gaa'" viewBox="0 0 24 24">
            <path d="M8 3c-2 0-3 2.5-3 5s1 4 3 4 3-1.5 3-4-1-5-3-5Z" />
            <path d="M5.5 15.5 6 19a2 2 0 0 0 4 0l.5-3.5" />
            <path d="M16 6c2 0 3 2.5 3 5s-1 4-3 4-3-1.5-3-4 1-5 3-5Z" />
            <path d="M13.5 18.5 14 21" />
            <path d="M18.5 18.5 18 21" />
          </svg>
          <!-- Vent ved mål: et flag -->
          <svg v-else viewBox="0 0 24 24">
            <path d="M5 21V4" />
            <path d="M5 4h11l-2 4 2 4H5" />
          </svg>
        </span>
        <h3 class="foelg__titel">{{ m.titel }}</h3>
        <p class="foelg__tekst">{{ m.tekst }}</p>
      </li>
    </ul>

    <!-- Det, man ikke kan, står tydeligt for sig -->
    <div class="foelg__obs">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M12 7v6M12 16.5v.01" /></svg>
      <p>
        <strong>Godt at vide:</strong> Man kan ikke holde sit barn i hånden på banen.
        Hvor mange voksne der skal med, afhænger af barnets alder –
        <a href="#faq">se svarene nedenfor</a>.
      </p>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/spacings' as s;

// Sort baggrund med lys tekst, så sektionen skiller sig ud fra de lyse sektioner før og efter
.foelg {
  display: flex;
  flex-direction: column;
  gap: s.$spacing-l;
  background-color: c.$primary_black100;
  color: c.$primary_light25;
}

/* --- Overskrift og intro --- */
.foelg__intro {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: s.$spacing-s;
  max-width: 42rem;

  h2,
  p {
    margin: 0;
  }

  // Lyserød overskrift som i overblikket over parken, der også står på mørk baggrund
  h2 {
    color: c.$forest_pink100;
  }

  p {
    opacity: 0.9;
  }
}

/* --- De tre kort --- */
.foelg__liste {
  display: grid;
  grid-template-columns: 1fr;
  gap: s.$spacing-s;
  margin: 0;
  padding: 0;
  list-style: none;

  // Tablet og desktop: tre kort ved siden af hinanden
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.foelg__kort {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: s.$spacing-m;
  border-radius: 1rem;
  // Mørkegrønne kort på den sorte baggrund
  background-color: c.$primary_darkgreen;
  color: c.$primary_light25;
}

// Lyserød firkant med runde hjørner og ikonet i midten (samme form som højdekrav-ikonet på banerne)
.foelg__ikon {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  margin-bottom: 0.25rem;
  border-radius: 1rem;
  background-color: c.$forest_pink100;
  color: c.$primary_black100;

  svg {
    width: 1.5rem;
    height: 1.5rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

// klatreikon.svg er et billede og fylder lidt mere end stregikonerne, så det kan ses tydeligt
.foelg__ikon-billede {
  width: 1.75rem;
  height: 1.75rem;
  object-fit: contain;
}

.foelg__titel {
  margin: 0;
  padding: 0;
  font-size: 1.1rem;
  font-weight: 800;
  line-height: 1.3;
}

.foelg__tekst {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  opacity: 0.85;
}

/* --- Det, man ikke kan --- */
.foelg__obs {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.9rem s.$spacing-s;
  // Lyserød kant, så det, man ikke kan, springer i øjnene på den mørke baggrund
  border: 2px solid c.$forest_pink100;
  border-radius: 0.75rem;

  svg {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    fill: none;
    stroke: c.$forest_pink100;
    stroke-width: 2;
    stroke-linecap: round;
  }

  p {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  strong {
    font-weight: 800;
  }

  a {
    color: inherit;
    font-weight: 700;
    text-underline-offset: 3px;

    &:hover {
      color: c.$forest_pink100;
    }
  }
}
</style>
