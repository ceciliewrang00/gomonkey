// BANER – fælles banedata og regler
// Bruges både af hero-sektionen (banestigen) og baneoversigten (TrackInfo.vue),
// så banerne kun hentes og regnes ud ét sted.

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

// De tre niveauer på skalaen
export const NIVEAUER = [
  { navn: 'Let', tekst: 'Lavt og overskueligt. God til første tur og til de mindste.' },
  { navn: 'Mellem', tekst: 'Højere oppe med flere forhindringer og svævebaner.' },
  { navn: 'Svær', tekst: 'Højt oppe og fysisk krævende. Kræver mod og erfaring.' },
]

// Oversætter sværhedsgraden fra databasen (fx "42.5%") til et trin: 1, 2 eller 3.
// Under 35 % = 1 (Let), under 70 % = 2 (Mellem), ellers 3 (Svær).
// Grænserne passer med niveauerne i kortfiltret (Firebase "mapfilter").
// Ændres en banes sværhedsgrad i admin, følger trinnet automatisk med
export function trinFor(bane) {
  const procent = parseFloat(bane.difficulty)
  if (procent < 35) return 1
  if (procent < 70) return 2
  return 3
}

// Niveauet som ord, fx "Mellem"
export function niveauFor(bane) {
  return NIVEAUER[trinFor(bane) - 1].navn
}
