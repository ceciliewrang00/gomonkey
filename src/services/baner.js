// BANER – henter banerne og samler alt om dem ét sted
// Det er HER, banerne hentes fra Firebase "baner". Bruges af forsidens banekort (TrackInfo.vue),
// hero, farveforklaringen, popup'en på kortet (via kortApi.js), kortfiltret og quizzen.
// Fordi alle henter fra samme sted, står der det samme om en bane overalt på siden.

import { BANER_URL } from '@/services/api.js'

// Henter alle baner og sorterer dem fra letteste til sværeste.
// Hver bane får sit id med (fx 'bane-1'), så vi kan kende den igen
export async function hentBaner() {
  const res = await fetch(`${BANER_URL}.json`)

  // fetch siger ikke selv fra, hvis serveren svarer med en fejl (fx 404 = ikke fundet),
  // så det tjekker vi selv med res.ok
  if (!res.ok) throw new Error(`Fejl ${res.status}`)

  const data = await res.json()

  // Firebase giver et objekt: { 'bane-1': {...}, 'bane-2': {...} }.
  // Object.entries laver det om til par: ['bane-1', {...}].
  // .map sætter id'et ind i banen, og .sort sorterer efter sværhedsgrad (fx "42.5%" → 42.5)
  return Object.entries(data ?? {})
    .map(([id, bane]) => ({ id, ...bane }))
    .sort((a, b) => parseFloat(a.difficulty) - parseFloat(b.difficulty))
}

// Reglerne for niveauerne (Let/Mellem/Svær) står i niveau.js.
// De sendes videre herfra, så de andre filer kan nøjes med at importere fra baner.js.
// (De ligger i en fil for sig, fordi testscriptet scripts/testQuiz.mjs skal kunne bruge dem
// uden Firebase)
export { NIVEAUER, trinFor, BOUNCE_ID, harSvaerhedsgrad, niveauFor } from './niveau.js'

// Faktatallene, der kan vises om en bane. key = feltets navn i Firebase, label = teksten på siden.
// kort: true = vises også i popup'en på kortet (der er kun plads til 4)
export const FAKTA = [
  { key: 'trackHeight', label: 'Banehøjde', kort: true },
  { key: 'trackLength', label: 'Banelængde', kort: true },
  { key: 'obstacles', label: 'Forhindringer', kort: true },
  { key: 'glideAmount', label: 'Antal svæv', kort: true },
  { key: 'longestGlide', label: 'Længste svæv' },
  // Kun Sort har et frit fald. Det står for sig selv, så det ikke tæller som et svæv
  { key: 'freeFall', label: 'Frit fald', kort: true },
]

// Giver de fakta, der skal vises for en bane – kun dem, banen faktisk har udfyldt.
// Med { kunKort: true } fås kun dem til popup'en
export function faktaFor(bane, { kunKort = false } = {}) {
  return FAKTA.filter((f) => bane[f.key] && (!kunKort || f.kort))
}
