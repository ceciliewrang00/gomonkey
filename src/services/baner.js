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

// De tre niveauer på skalaen.
// tekst = beskrivelsen, passer = hvem niveauet passer til (valgfri)
export const NIVEAUER = [
  {
    navn: 'Let',
    tekst: 'Lavt oppe og korte strækninger. Du behøver ingen erfaring, og det er et godt sted at lære udstyret at kende.',
    passer: 'Børn og alle, der prøver klatring for første gang.',
  },
  {
    navn: 'Mellem',
    tekst: 'Højere oppe, flere forhindringer og lange svævebaner. Du skal bruge balance og lidt styrke i arme og ben.',
    passer: 'Dig, der har prøvet det før eller gerne vil have lidt sus i maven.',
  },
  {
    navn: 'Svær',
    tekst: 'Højt oppe mellem trætoppene, mange forhindringer og de længste svæv. Banerne er fysisk hårde og kræver mod på højder.',
    passer: 'Erfarne klatrere, der vil udfordres.',
  },
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

// Bounce er en aktivitet uden sværhedsgrad – den får mærket "For alle" i stedet
export const BOUNCE_ID = 'bounce'

export function harSvaerhedsgrad(bane) {
  return bane.id !== BOUNCE_ID
}

// Niveauet som ord, fx "Mellem" – eller "For alle" for Bounce
export function niveauFor(bane) {
  if (!harSvaerhedsgrad(bane)) return 'For alle'
  return NIVEAUER[trinFor(bane) - 1].navn
}

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
