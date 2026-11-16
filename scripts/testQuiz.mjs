// TEST AF BANEVÆLGEREN
// Gennemløber alle kombinationer af hvem × højde × erfaring × tryghed × oplevelse
// og tjekker, at quizzen er forsigtig ("hellere for let end for svær").
//
// Kør med:  node scripts/testQuiz.mjs
// Scriptet stopper med fejlkode 1, hvis et tjek fejler.

import {
  beregnBane,
  lavBegrundelse,
  lavFritfaldBesked,
  lavVidere,
  niveauUdenErfaring,
} from '../src/services/quizLogik.js'

/* --- Mock-data, der svarer til Firebase --- */

// Banerne under /baner (kun de felter, quizzen bruger). Sorteret fra let til svær som hentBaner()
const BANER = [
  { id: 'bounce', name: 'Bounce', difficulty: '5%' },
  { id: 'bane-1', name: 'Grøn', difficulty: '17.5%' },
  { id: 'bane-2', name: 'Gul', difficulty: '30%' },
  { id: 'bane-3', name: 'Blå', difficulty: '42.5%' },
  { id: 'bane-4', name: 'Lilla', difficulty: '55%' },
  { id: 'bane-5', name: 'Lyserød', difficulty: '67.5%' },
  { id: 'bane-6', name: 'Rød', difficulty: '80%' },
  { id: 'bane-7', name: 'Sort', difficulty: '92.5%' },
]

// Svarmulighederne under /spoergsmaal med deres maksNiveau
const HVEM = ['mig', 'barn', 'gruppeBoern', 'gruppeVoksne']
const HOEJDER = [110, 140, 160]
const ERFARING = [
  { id: 'e1', maksNiveau: 1 },
  { id: 'e2', maksNiveau: 2 },
  { id: 'e3', maksNiveau: 2 },
  { id: 'e4', maksNiveau: 3 },
]
const TRYGHED = [
  { id: 't1', maksNiveau: 1 },
  { id: 't2', maksNiveau: 1 },
  { id: 't3', maksNiveau: 2 },
  { id: 't4', maksNiveau: 3 },
]
const OPLEVELSE = [
  { id: 'o1', maksNiveau: 1 },
  { id: 'o2', maksNiveau: 2 },
  { id: 'o3', maksNiveau: 3 },
  { id: 'o4', maksNiveau: 3 },
]

// Sætningen, der opfordrer til Sort – må kun vises ved niveau 3
const OPFORDRING = 'Er der mod på mere'
// Sætningen til førstegangsklatrere om Sort – må kun vises, når erfaring er det eneste,
// der holder dem nede, og niveauet uden erfaring er 3
const SORT_SENERE = 'er en mulighed, når'

/* --- Kør alle kombinationer --- */

const fejl = []
const fordeling = {}
let antal = 0

function tjek(betingelse, besked) {
  if (!betingelse) fejl.push(besked)
}

for (const hvem of HVEM) {
  for (const hoejde of HOEJDER) {
    for (const e of ERFARING) {
      for (const t of TRYGHED) {
        for (const o of OPLEVELSE) {
          antal++
          const svar = {
            hvem: { hvem },
            hoejde: { minimumHoejde: hoejde },
            erfaring: e,
            tryghed: t,
            oplevelse: o,
            // Alle siger ja til frit fald og opfylder vægtkravet – det sværeste tilfælde
            fritfald: { id: 'ff3' },
            vaegt: { opfylderMinimum: true },
          }
          const navn = `${hvem}, ${hoejde} cm, ${e.id}, ${t.id}, ${o.id}`

          const a = beregnBane(svar, BANER)
          tjek(a, `${navn}: ingen anbefaling`)
          if (!a) continue

          fordeling[a.bane.name] = (fordeling[a.bane.name] ?? 0) + 1

          // Lofterne
          if (t.id === 't1' || t.id === 't2') tjek(a.niveau === 1, `${navn}: tryghed ${t.id} gav niveau ${a.niveau}`)
          if (e.id === 'e1') tjek(a.niveau === 1, `${navn}: aldrig prøvet gav niveau ${a.niveau}`)
          if (o.id === 'o1') tjek(a.niveau === 1, `${navn}: rolig tur gav niveau ${a.niveau}`)
          if (hoejde < 140) tjek(a.niveau <= 1, `${navn}: under 140 cm gav niveau ${a.niveau}`)
          if (hoejde < 160) tjek(a.niveau <= 2, `${navn}: under 160 cm gav niveau ${a.niveau}`)

          // Frit fald: ingen opfordring under niveau 3
          const ff = lavFritfaldBesked(a, svar, BANER)
          if (a.niveau < 3) tjek(!ff.includes(OPFORDRING), `${navn}: opfordrer til Sort på niveau ${a.niveau}`)
          const maaNaevneSortSenere = e.id === 'e1' && niveauUdenErfaring(svar) === 3
          tjek(ff.includes(SORT_SENERE) === maaNaevneSortSenere, `${navn}: forkert frit fald-tekst for førstegangsklatrer: "${ff}"`)

          // Erfarne og trygge klatrere skal kunne få Rød
          if (hoejde === 160 && e.id === 'e4' && t.id === 't4' && (o.id === 'o3' || o.id === 'o4')) {
            tjek(a.bane.name === 'Rød', `${navn}: fik ${a.bane.name} i stedet for Rød`)
          }

          // Højst 3 linjer i begrundelsen
          const grunde = lavBegrundelse(a, svar)
          tjek(grunde.length <= 3, `${navn}: ${grunde.length} linjer i begrundelsen`)

          // Ingen "tryg ved højder", når brugeren har svaret, at de ikke er trygge (t1/t2)
          if (t.id === 't1' || t.id === 't2') {
            tjek(!grunde.some((g) => g.includes('tryg ved højder')), `${navn}: begrundelsen siger "tryg ved højder" ved ${t.id}`)
          }
        }
      }
    }
  }
}

/* --- Førstegangsklatrere: start let, men "næste skridt" må pege højere op --- */

// Hjælper til de konkrete scenarier
function scenarie(hoejde, e, t, o) {
  const find = (liste, id) => liste.find((x) => x.id === id)
  const svar = {
    hvem: { hvem: 'mig' },
    hoejde: { minimumHoejde: hoejde },
    erfaring: find(ERFARING, e),
    tryghed: find(TRYGHED, t),
    oplevelse: find(OPLEVELSE, o),
  }
  const a = beregnBane(svar, BANER)
  return { bane: a?.bane.name, videre: lavVidere(a, svar, BANER) }
}

const SCENARIER = [
  { navn: 'mig, 160 cm, e1, t4, o4', args: [160, 'e1', 't4', 'o4'], bane: 'Grøn', videre: 'Rød' },
  { navn: 'mig, 140 cm, e1, t4, o3', args: [140, 'e1', 't4', 'o3'], bane: 'Grøn', videre: 'Blå' },
  { navn: 'mig, 160 cm, e1, t3, o4', args: [160, 'e1', 't3', 'o4'], bane: 'Grøn', videre: 'Blå' },
  { navn: 'mig, 160 cm, e1, t1, o2', args: [160, 'e1', 't1', 'o2'], bane: 'Grøn', videre: 'Gul' },
]

console.log('\nFørstegangsklatrere:')
for (const s of SCENARIER) {
  const r = scenarie(...s.args)
  const ok = r.bane === s.bane && r.videre.includes(s.videre)
  tjek(ok, `${s.navn}: fik ${r.bane} / "${r.videre}"`)
  console.log(`  ${ok ? '✓' : '✗'} ${s.navn.padEnd(26)} → ${r.bane} | ${r.videre}`)
}

/* --- Trygge førstegangsklatrere får stadig "også selvom man er tryg ved højder" --- */

{
  const svar = {
    hvem: { hvem: 'mig' },
    hoejde: { minimumHoejde: 160 },
    erfaring: ERFARING.find((x) => x.id === 'e1'),
    tryghed: TRYGHED.find((x) => x.id === 't4'),
    oplevelse: OPLEVELSE.find((x) => x.id === 'o4'),
  }
  const grunde = lavBegrundelse(beregnBane(svar, BANER), svar)
  const ok = grunde.some((g) => g.includes('også selvom man er tryg ved højder'))
  tjek(ok, 'mig, 160 cm, e1, t4, o4: mangler "også selvom man er tryg ved højder"')
  console.log(`\n${ok ? '✓' : '✗'} mig, 160 cm, e1, t4, o4 → "${grunde.find((g) => g.includes('klatret før'))}"`)
}

/* --- Udskriv resultatet --- */

const tjekListe = [
  'Tryghed t1 eller t2 → altid niveau 1',
  'Erfaring e1 (aldrig prøvet) → altid niveau 1',
  'Oplevelse o1 → altid niveau 1',
  'Under 140 cm → aldrig over niveau 1, under 160 cm → aldrig niveau 3',
  'Ingen opfordring til Sort under niveau 3',
  'Sort nævnes kun som "senere mulighed" for førstegangsklatrere, der ellers ville få niveau 3',
  'e4 + t4 + o3/o4 ved 160 cm → Rød',
  'Højst 3 linjer i begrundelsen',
  'Ingen "tryg ved højder" i begrundelsen ved tryghed t1/t2',
  'mig + 160 cm + e1 + t4 + o4 → "også selvom man er tryg ved højder"',
]

console.log(`\nKombinationer gennemløbet: ${antal}\n`)
for (const linje of tjekListe) console.log(`  ${fejl.length ? '•' : '✓'} ${linje}`)

console.log('\nFordeling af anbefalinger:')
for (const bane of BANER) {
  const n = fordeling[bane.name] ?? 0
  console.log(`  ${bane.name.padEnd(8)} ${String(n).padStart(4)}  (${((n / antal) * 100).toFixed(1)} %)`)
}

if (fejl.length) {
  console.log(`\n✗ ${fejl.length} fejl:`)
  for (const f of fejl.slice(0, 20)) console.log(`  - ${f}`)
  process.exit(1)
}
console.log('\n✓ Alle tjek bestået\n')
