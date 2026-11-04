<script setup>
// Links i de to kolonner til højre
const lokationer = [
  { navn: 'Forest Gladsaxe', href: '#' },
  { navn: 'Forest København', href: '#' },
  { navn: 'Forest Odense', href: '#' },
  { navn: 'Cave Gladsaxe', href: '#' },
]

const altGodt = [
  { navn: 'Praktisk info', href: '#' },
  { navn: 'Inspiration', href: '#' },
  { navn: 'Job hos os', href: '#' },
  { navn: 'Gavekort', href: '#' },
]

// Sociale medier – path er SVG-ikonet (24x24 viewBox)
const sociale = [
  {
    navn: 'LinkedIn',
    href: 'https://www.linkedin.com/',
    path: 'M6.94 8.5H3.56V20h3.38V8.5zM5.25 3A1.97 1.97 0 1 0 5.25 6.94 1.97 1.97 0 0 0 5.25 3zM20.44 13.3c0-3.1-1.66-4.55-3.87-4.55-1.79 0-2.59.98-3.03 1.67V8.5h-3.38c.04.95 0 11.5 0 11.5h3.38v-6.42c0-.34.02-.69.13-.93.27-.69.9-1.4 1.95-1.4 1.38 0 1.93 1.05 1.93 2.59V20h3.38l.01-6.7z',
  },
  {
    navn: 'Facebook',
    href: 'https://www.facebook.com/',
    path: 'M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z',
  },
  {
    navn: 'Instagram',
    href: 'https://www.instagram.com/',
    path: 'M12 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2zM17.1 5.8a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM16 2H8a6 6 0 0 0-6 6v8a6 6 0 0 0 6 6h8a6 6 0 0 0 6-6V8a6 6 0 0 0-6-6zm4.2 14A4.2 4.2 0 0 1 16 20.2H8A4.2 4.2 0 0 1 3.8 16V8A4.2 4.2 0 0 1 8 3.8h8A4.2 4.2 0 0 1 20.2 8v8z',
  },
  {
    navn: 'TikTok',
    href: 'https://www.tiktok.com/',
    path: 'M16.6 2h-3.3v13.3a2.9 2.9 0 1 1-2.1-2.8V9.1a6.3 6.3 0 1 0 5.4 6.2V8.6a7.7 7.7 0 0 0 4.4 1.4V6.7a4.4 4.4 0 0 1-4.4-4.4V2z',
  },
  {
    navn: 'YouTube',
    href: 'https://www.youtube.com/',
    path: 'M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.8 15.1V8.9L15.6 12l-5.8 3.1z',
  },
]

const aar = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__top">
        <!-- Venstre side: logo, tagline og sociale medier -->
        <div class="footer__brand">
          <img class="footer__logo" src="@/assets/images/logo.svg" alt="GoMonkey logo" />
          <p class="footer__tagline">
            Vi skaber unikke klatreoplevelser med nervepirrende frihed.
          </p>
          <ul class="footer__social">
            <li v-for="s in sociale" :key="s.navn">
              <a :href="s.href" :aria-label="s.navn" target="_blank" rel="noopener">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="s.path" /></svg>
              </a>
            </li>
          </ul>
        </div>

        <!-- Højre side: link-kolonner -->
        <nav class="footer__nav">
          <div class="footer__group">
            <h3 class="footer__heading">Vores lokationer</h3>
            <ul class="footer__links">
              <li v-for="l in lokationer" :key="l.navn"><a :href="l.href">{{ l.navn }}</a></li>
            </ul>
          </div>

          <div class="footer__group">
            <h3 class="footer__heading">Alt godt om GoMonkey</h3>
            <ul class="footer__links">
              <li v-for="l in altGodt" :key="l.navn"><a :href="l.href">{{ l.navn }}</a></li>
            </ul>
          </div>
        </nav>
      </div>

      <!-- Bundlinje -->
      <div class="footer__bottom">
        <p class="footer__meta">
          <span>© {{ aar }} GoMonkey ApS</span>
          <span class="dot">·</span>
          <span>CVR: 31775302</span>
        </p>
        <p class="footer__meta">
          <a href="mailto:info@gomonkey.dk"><strong>info@gomonkey.dk</strong></a>
          <span class="dot">·</span>
          <a href="tel:+4525533022">+45 <strong>25 53 30 22</strong></a>
        </p>
        <p class="footer__meta">
          <a href="#"><strong>Privatlivspolitik</strong></a>
          <span class="dot">·</span>
          <a href="#"><strong>Handelsbetingelser</strong></a>
        </p>
      </div>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/colors' as c;
@use '@/assets/styles/spacings' as s;

$tekst: c.$primary_light25;
$linje: rgba(239, 233, 229, 0.08);

.footer {
  background-color: c.$primary_black100;
  color: $tekst;
  border-top: 1px solid $linje;
  font-family: "Inter", sans-serif;

  a {
    color: inherit;
    text-decoration: none;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.7;
    }
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
}

// Samme sidemargin som forsidens sektioner (se .forside > section i main.scss)
.footer__inner {
  padding-block: s.$spacing-xxxxl s.$spacing-xxl;
  padding-inline: max(s.$spacing-m, calc((100% - #{s.$indhold-bredde}) / 2));
}

/* --- Top --- */
.footer__top {
  display: grid;
  grid-template-columns: 1fr;
  gap: s.$spacing-xxl;
  padding-bottom: s.$spacing-xxl;
  border-bottom: 1px solid $linje;

  @media (min-width: 900px) {
    grid-template-columns: 1.4fr 1fr;
  }
}

.footer__logo {
  width: clamp(9rem, 14vw, 10rem);
  height: auto;
  // Logoet er mørkt – gør det lyst på den mørke baggrund
  filter: brightness(0) invert(1);
  opacity: 0.93;
}

.footer__tagline {
  font-size: clamp(1.25rem, 2vw, 1.6rem);
  font-weight: 500;
  line-height: 1.5;
  max-width: 32rem;
  margin: s.$spacing-l 0;
}

.footer__social {
  display: flex;
  gap: 0.85rem;

  a {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background-color: $tekst;
  }

  svg {
    width: 1rem;
    height: 1rem;
    fill: c.$primary_black100;
  }
}

/* --- Link-kolonner --- */
.footer__nav {
  display: flex;
  flex-direction: column;
  gap: s.$spacing-xl;
}

.footer__heading {
  font-size: clamp(1.1rem, 1.6vw, 1.25rem);
  font-weight: 500;
  padding: 0 0 0.75rem;
  margin: 0 0 s.$spacing-xs;
  border-bottom: 1px solid $linje;
}

.footer__links {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.8rem s.$spacing-s;

  @media (min-width: 600px) {
    grid-template-columns: repeat(3, 1fr);
  }

  a {
    font-size: 0.95rem;
    font-weight: 500;
    line-height: 1.6;
  }
}

/* --- Bund --- */
.footer__bottom {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: s.$spacing-s;
  padding-top: s.$spacing-xxl;
}

.footer__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 300;
  line-height: 1.4;

  strong {
    font-weight: 600;
  }

  .dot {
    opacity: 0.6;
  }
}
</style>
