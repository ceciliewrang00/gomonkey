// NIVEAU – sværhedsgrad for banerne
// Rene regler uden Firebase eller andre afhængigheder, så de kan bruges både i appen
// (via baner.js) og i testscriptet (scripts/testQuiz.mjs), der kører med node.

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
