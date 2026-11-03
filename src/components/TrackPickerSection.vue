<script setup>
import BaseButton from './BaseButton.vue'
</script>

<template>
  <section id="baner" class="baner-section">
    <div class="baner-container">
      <!-- Billede-wrapper -->
      <div class="billede-wrapper">
        <div class="billede-ramme">
          <img src="@/assets/images/bane-img.webp" alt="Klatrebaner" class="baner-img">
        </div>
      </div>

      <!-- Tekstindhold -->
      <div id="baner-content" class="tekst-indhold">
        <span class="badge">Banevælger</span>
        <h2>Hvilken bane skal du prøve?</h2>
        <h3>Kan du ikke afgøre, hvor du skal begynde?</h3>
        <p>
          Svar på fem hurtige spørgsmål, så finder vi den bane, der passer perfekt til dit temperament og din gruppe. Det tager under et minut.
        </p>
        
        <div class="double-button">
          <RouterLink class="button-primary" to="/banequiz">
            <span>Start banevælger</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="arrow-icon"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </RouterLink>
          <BaseButton variant="secondary" href="#bane-info">Se banerne</BaseButton>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/mixins' as m;
@use '@/assets/styles/spacings' as s;
@use '@/assets/styles/flex' as f;
@use '@/assets/styles/colors' as c;

#baner {
  @include m.section-green100;
  padding: 5rem 1.5rem;
  
  .baner-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: stretch; /* Gør at billedet matcher tekstens højde 1:1 */
    gap: 3.5rem;
    max-width: 1200px;
    margin: 0 auto;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
      
      .billede-wrapper {
        order: 2; /* Billedet lægges under teksten på mobil */
      }
    }
  }

  .tekst-indhold {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1.25rem;

    .badge {
      align-self: flex-start;
       padding: 0.40rem 0.90rem;
      border-radius: 2rem;
      background-color: c.$primary_light50;
      color: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    h2 {
      font-size: clamp(2rem, 4vw, 2.75rem);
      font-weight: 800;
      line-height: 1.15;
    }

    h3 {
      font-size: 1.25rem;
      font-weight: 600;
      opacity: 0.9;
    }

    p {
      font-size: 1.05rem;
      line-height: 1.6;
      opacity: 0.85;
    }

    .double-button {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
      margin-top: 0.5rem;

      .button-primary {
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.9rem 1.8rem;
        border-radius: 3rem;
        font-weight: 700;
        text-decoration: none;

        .arrow-icon {
          transition: transform 0.2s ease;
        }

        &:hover .arrow-icon {
          transform: translateX(4px);
        }
      }
    }
  }

  .billede-wrapper {
    width: 100%;
    height: 100%;
    min-height: 320px;

    .billede-ramme {
      width: 100%;
      height: 100%;
      border-radius: 1rem;
      overflow: hidden;

      .baner-img {
        width: 100%;
        height: 100%;
        object-fit: cover; /* Får billedet til at fylde rammen perfekt ud uden at miste proportioner */
      }
    }
  }
}
</style>