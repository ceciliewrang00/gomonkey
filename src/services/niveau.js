// Reglerne for banernes sværhedsgrad. Bruger ikke Firebase,
// så testscriptet scripts/testQuiz.mjs også kan bruge filen

// De tre niveauer: navn, hvordan banerne er, og hvem de passer til
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

// Laver sværhedsgraden (fx "42.5%") om til et trin:
// under 35 % = 1 (Let), under 70 % = 2 (Mellem), ellers 3 (Svær)
export function trinFor(bane) {
  const procent = parseFloat(bane.difficulty)
  if (procent < 35) return 1
  if (procent < 70) return 2
  return 3
}

// Bounce er ikke en klatrebane og får mærket "For alle"
export const BOUNCE_ID = 'bounce'

// Giver true for alle baner undtagen Bounce
export function harSvaerhedsgrad(bane) {
  return bane.id !== BOUNCE_ID
}

// Giver niveauet som ord, fx "Mellem", eller "For alle" for Bounce
export function niveauFor(bane) {
  if (!harSvaerhedsgrad(bane)) return 'For alle'
  return NIVEAUER[trinFor(bane) - 1].navn
}
