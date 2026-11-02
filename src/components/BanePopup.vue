<script setup>
import logoUrl from '../assets/images/gomonkey-logo.svg'

defineProps({
  bane: {
    type: Object,
    required: true
  }
})

defineEmits(['luk'])
</script>

<template>
  <div class="bane-popup" role="dialog" aria-labelledby="popup-titel">
    <div class="popup-header">
      <div class="popup-titel-gruppe">
        <span 
          class="bane-farve-indikator" 
          :style="{ backgroundColor: bane.farve || '#CED0C0' }"
        ></span>
        <h3 id="popup-titel">{{ bane.navn }}</h3>
      </div>
      <button 
        type="button" 
        class="popup-luk" 
        aria-label="Luk information" 
        @click="$emit('luk')"
      >
        &times;
      </button>
    </div>

    <div class="popup-indhold">
      <p v-if="bane.beskrivelse" class="popup-beskrivelse">
        {{ bane.beskrivelse }}
      </p>

      <div class="popup-detaljer">
        <!-- Sværhedsgrad -->
        <div v-if="bane.svaerhedsgradTal" class="detalje-tag fuld-bredde">
          <div class="tag-top">
            <span class="tag-label">Sværhedsgrad</span>
            <div class="skala-ikoner">
              <img 
                v-for="i in 5" 
                :key="i"
                :src="logoUrl" 
                alt="Logo rating"
                class="skala-logo"
                :class="{ aktiv: i <= bane.svaerhedsgradTal }"
              />
            </div>
          </div>
        </div>
        
        <!-- Højdekrav -->
        <div v-if="bane.hoejdekravTal" class="detalje-tag fuld-bredde">
          <div class="tag-top">
            <span class="tag-label">Højde over jorden</span>
            <div class="skala-ikoner">
              <img 
                v-for="i in 5" 
                :key="i"
                :src="logoUrl" 
                alt="Logo rating"
                class="skala-logo"
                :class="{ aktiv: i <= bane.hoejdekravTal }"
              />
            </div>
          </div>
        </div>

        <!-- Adrenalin / Fart -->
        <div v-if="bane.adrenalinTal" class="detalje-tag fuld-bredde">
          <div class="tag-top">
            <span class="tag-label">Adrenalin & Fart</span>
            <div class="skala-ikoner">
              <img 
                v-for="i in 5" 
                :key="i"
                :src="logoUrl" 
                alt="Logo rating"
                class="skala-logo"
                :class="{ aktiv: i <= bane.adrenalinTal }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.bane-popup {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 10;
  width: 340px;
  background-color: #EFE9E5;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(11, 28, 14, 0.15);
  /* Sat ned til 12px i toppen, så hele indholdet rykker med op */
  padding: 12px 20px 20px 20px; 
  animation: popup-glid-ind 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

@keyframes popup-glid-ind {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 4px; /* Minimal bund-padding i header */
  margin-top: 0;
}

.popup-titel-gruppe {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bane-farve-indikator {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}

.popup-titel-gruppe h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #000F02;
  line-height: 1.2;
}

.popup-luk {
  background: none;
  border: none;
  font-size: 1.8rem;
  line-height: 1;
  color: #0B1C0E;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.popup-luk:hover {
  color: #3A4303;
}

.popup-indhold {
  font-size: 0.92rem;
  color: #000F02;
}

.popup-beskrivelse {
  /* Helt nulstillet top-margin, så den ligger tæt op ad headeren */
  margin: 2px 0 12px 0; 
  line-height: 1.4;
  color: #000F02;
}

.popup-detaljer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detalje-tag {
  background: #CED0C0;
  /* Ændret til horisontal flex, så tekst og ikoner står på fuldstændig samme linje */
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 6px;
}

.tag-top {
  display: contents; /* Gør at .tag-top ikke blander sig i flex-layoutet, men lader børnene ligge direkte i .detalje-tag */
}

.tag-label {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.03em;
  color: #0B1C0E;
}

/* Skala med SVG-ikoner */
.skala-ikoner {
  display: flex;
  gap: 4px;
  align-items: center;
}

.skala-logo {
  width: 18px;
  height: 18px;
  object-fit: contain;
  opacity: 0.30;
  transition: opacity 0.2s ease;
}

.skala-logo.aktiv {
  opacity: 1;
}
</style>