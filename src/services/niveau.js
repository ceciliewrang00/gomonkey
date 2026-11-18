// NIVEAU – reglerne for banernes sværhedsgrad (Let, Mellem, Svær)
// Filen bruger hverken Firebase eller Vue. Derfor kan den bruges både på siden
// (via baner.js) og i testscriptet scripts/testQuiz.mjs, som køres uden browser.

// De tre niveauer.
// tekst = hvordan banerne er, passer = hvem de passer til
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

// Laver banens sværhedsgrad fra databasen (fx "42.5%") om til et trin: 1, 2 eller 3.
//   under 35 %  → 1 (Let)
//   under 70 %  → 2 (Mellem)
//   ellers      → 3 (Svær)
// Ændrer man en banes procent i admin, skifter den automatisk niveau
export function trinFor(bane) {
  const procent = parseFloat(bane.difficulty) // "42.5%" → 42.5
  if (procent < 35) return 1
  if (procent < 70) return 2
  return 3
}

// Bounce (trampolinen) er ikke en klatrebane og har ingen sværhedsgrad.
// Den får i stedet mærket "For alle"
export const BOUNCE_ID = 'bounce'

// true = banen har en sværhedsgrad (alle baner undtagen Bounce)
export function harSvaerhedsgrad(bane) {
  return bane.id !== BOUNCE_ID
}

// Niveauet som ord, fx "Mellem" – eller "For alle" for Bounce.
// trinFor giver 1–3, men listen starter på plads 0, derfor "- 1"
export function niveauFor(bane) {
  if (!harSvaerhedsgrad(bane)) return 'For alle'
  return NIVEAUER[trinFor(bane) - 1].navn
}
