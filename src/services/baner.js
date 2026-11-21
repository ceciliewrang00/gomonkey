// Henter banerne fra Firebase "baner". Alle sider henter herfra,
// så der står det samme om en bane overalt

import { BANER_URL } from '@/services/api.js'

// Henter alle baner med deres id og sorterer dem fra letteste til sværeste
export async function hentBaner() {
  const res = await fetch(`${BANER_URL}.json`)

  // Stopper med en fejl, hvis Firebase svarer med en fejl
  if (!res.ok) throw new Error(`Fejl ${res.status}`)

  const data = await res.json()

  // Laver Firebase-objektet om til en liste, sætter id'et på hver bane og sorterer efter sværhedsgrad
  return Object.entries(data ?? {})
    .map(([id, bane]) => ({ id, ...bane }))
    .sort((a, b) => parseFloat(a.difficulty) - parseFloat(b.difficulty))
}

// Niveau-reglerne ligger i niveau.js og sendes videre herfra,
// så de andre filer kun skal importere fra baner.js
export { NIVEAUER, trinFor, BOUNCE_ID, harSvaerhedsgrad, niveauFor } from './niveau.js'

// Faktatallene om en bane. key = feltet i Firebase, label = teksten på siden.
// kort: true = vises også i popup'en på kortet
// Banehøjde står sidst, fordi "… over jorden" fylder mere end de andre og så kommer ned på sin egen linje
export const FAKTA = [
  { key: 'trackLength', label: 'Banelængde', kort: true },
  { key: 'obstacles', label: 'Forhindringer', kort: true },
  { key: 'glideAmount', label: 'Antal svæv', kort: true },
  { key: 'longestGlide', label: 'Længste svæv' },
  { key: 'freeFall', label: 'Frit fald', kort: true },
  { key: 'trackHeight', label: 'Banehøjde', kort: true },
]

// Laver kravet til klatreren om til en sætning til "dig", så det ikke ligner banens egne tal.
// "Minimum 160 cm høj & 30 kg." → "Du skal være mindst 160 cm høj og veje mindst 30 kg."
// Kan teksten ikke læses, vises den, som den står i Firebase
export function kravTekst(bane) {
  const tekst = bane.requirements ?? ''
  const cm = tekst.match(/(\d+)\s*cm/i)?.[1]
  const kg = tekst.match(/(\d+)\s*kg/i)?.[1]
  if (!cm && !kg) return tekst

  const dele = []
  if (cm) dele.push(`være mindst ${cm} cm høj`)
  if (kg) dele.push(`veje mindst ${kg} kg`)
  return `Du skal ${dele.join(' og ')}.`
}

// Giver de fakta, banen har udfyldt. Med kunKort: true kun dem til popup'en
export function faktaFor(bane, { kunKort = false } = {}) {
  return FAKTA.filter((f) => bane[f.key] && (!kunKort || f.kort))
}
