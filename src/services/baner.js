// BANER – fælles banedata og regler
// Den ene datakilde for banerne. Bruges af forsidens banekort (TrackInfo.vue), hero,
// popup'en på kortet (via kortApi.js) og kortfiltret (KortFilter.vue),
// så navn, beskrivelse, sværhedsgrad, krav og faktatal er ens alle steder.

import { BANER_URL } from '@/services/api.js'

// Henter alle baner fra Firebase og sorterer dem fra letteste til sværeste.
// Hver bane får sit id fra Firebase (fx 'bane-1') med som "id"
export async function hentBaner() {
  const res = await fetch(`${BANER_URL}.json`)

  // fetch melder ikke selv fejl ved fx 401 eller 404, så vi tjekker
  if (!res.ok) throw new Error(`Fejl ${res.status}`)

  const data = await res.json()

  return Object.entries(data ?? {})
    .map(([id, bane]) => ({ id, ...bane }))
    .sort((a, b) => parseFloat(a.difficulty) - parseFloat(b.difficulty))
}

// Niveauerne (Let/Mellem/Svær) og reglerne for dem står i niveau.js,
// som ikke afhænger af Firebase – så quizlogikken kan testes med node (scripts/testQuiz.mjs).
// De eksporteres videre herfra, så resten af koden kan blive ved med at importere fra baner.js
export { NIVEAUER, trinFor, BOUNCE_ID, harSvaerhedsgrad, niveauFor } from './niveau.js'

// Faktatallene på hver bane. Kun felter, banen har udfyldt, bliver vist.
// "kort: true" = vises også i popup'en på kortet (2×2-gitter)
export const FAKTA = [
  { key: 'trackHeight', label: 'Banehøjde', kort: true },
  { key: 'trackLength', label: 'Banelængde', kort: true },
  { key: 'obstacles', label: 'Forhindringer', kort: true },
  { key: 'glideAmount', label: 'Antal svæv', kort: true },
  { key: 'longestGlide', label: 'Længste svæv' },
]

export function faktaFor(bane, { kunKort = false } = {}) {
  return FAKTA.filter((f) => bane[f.key] && (!kunKort || f.kort))
}
