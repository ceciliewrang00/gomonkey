<script setup>
import BaseButton from './BaseButton.vue'
</script>

<template>
  <section id="overblik" class="overblik-section">
    <div class="overblik-container">
      <!-- Tekstindhold -->
      <div id="overblik-tekst" class="tekst-indhold">
        <span class="badge">Udforsk terrænet</span>
        <h2>Overblik over parken</h2>
        <p>
          Før du kaster dig ud i eventyret, så få styr på terrænet. Vores interaktive kort viser dig alle baner, startpunkter og højdekurver.
        </p>
        <p class="sub-tekst">
          Hver bane har sin egen unikke farve og sværhedsgrad, så du nemt kan finde den perfekte udfordring for dig.
        </p>
      </div>

      <!-- Kort & Call to Action -->
      <div id="kort-wrapper" class="kort-wrapper">
        <div class="billede-ramme">
          <img 
            src="@/assets/images/gomonkeykort.webp" 
            alt="Kort over GoMonkey Odense" 
            class="overblik-kort"
          >
          
          <div class="action-wrapper">
            <RouterLink class="button-primary" to="/kort">
              <span>Se det fulde kort</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="arrow-icon"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/mixins' as m;
@use '@/assets/styles/spacings' as s;
@use '@/assets/styles/flex' as f;

#overblik {
  @include m.section-black100;
  padding: 5rem 1.5rem;
  
  .overblik-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: stretch; /* Gør at kort-wrapper tager samme højde som teksten */
    gap: 3.5rem;
    max-width: 1200px;
    margin: 0 auto;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
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
      background-color: rgba(c.$primary_light50, 0.15);
      color: c.$primary_light50;
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    h2 {
      font-size: clamp(2rem, 4vw, 2.75rem);
      font-weight: 800;
      line-height: 1.15;
    }

    p {
      font-size: 1.1rem;
      line-height: 1.6;
      opacity: 0.9;

      &.sub-tekst {
        font-size: 0.95rem;
        opacity: 0.75;
      }
    }
  }

  .kort-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 320px;

    .billede-ramme {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 1rem;
      overflow: hidden;

      .overblik-kort {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .action-wrapper {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 2;

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
}
</style>