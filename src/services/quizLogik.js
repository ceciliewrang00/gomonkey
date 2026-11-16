// QUIZLOGIK
// Alle regler for banevælgeren samlet ét sted, så QuizSide.vue kun skal vise dem.
//
// Målet er en FORSIGTIG anbefaling: hellere en bane for let end for svær.
// Man kan altid tage en sværere bane bagefter – men en for svær første bane
// kan ødelægge hele oplevelsen.
//
// Sådan regnes anbefalingen ud (beregnBane):
// 1. Under 110 cm: kun Bounce.
// 2. Ellers findes det højeste NIVEAU, man må starte på (1 = Let, 2 = Mellem, 3 = Svær).
//    Hvert svar sætter et loft, og det LAVESTE loft vinder:
//      - Højde: 110–139 cm → Let,  140–159 cm → Mellem,  160+ cm → Svær
//      - Alle andre svar har et felt "maksNiveau" i Firebase (1, 2 eller 3), som kan
//        rettes i admin. Fx erfaring "aldrig prøvet" = 1, tryghed "helt fint" = 3.
//    Der bruges ingen point.
// 3. Inden for niveauet anbefales den LETTESTE bane (fx Grøn frem for Gul),
//    og den næste bane nævnes som "næste skridt".
//
// Banerne (navn, beskrivelse, rækkefølge, sværhedsgrad) kommer fra de fælles banedata
// i Firebase (services/baner.js) – ikke fra tekster her. Så passer anbefalingen altid
// med forsiden og kortet, også hvis banerne skifter navn, farve eller rækkefølge.
//
// Filen importerer kun niveau.js (relativt og uden Firebase), så den kan testes
// direkte med node: node scripts/testQuiz.mjs

import { trinFor, harSvaerhedsgrad, NIVEAUER } from './niveau.js'

// Højdekrav pr. niveau (fra gomonkey.dk og banernes krav i Firebase).
// Ændrer GoMonkey kravene, skal tallene her også ændres
export const KRAV = {
  let: 110,
  mellem: 140,
  svaer: 160,
}

// Frit fald-banen (Sort). Den anbefales aldrig som startbane, men omtales for sig
const FRIT_FALD_ID = 'bane-7'

/* --- Små hjælpere --- */

// Er svaret på "Hvem skal klatre?" en gruppe?
export function erGruppe(svar) {
  const hvem = svar.hvem?.hvem
  return hvem === 'gruppeBoern' || hvem === 'gruppeVoksne'
}

// Er der børn med? (Bruges til reglerne om voksne.)
function boernMed(svar) {
  const hvem = svar.hvem?.hvem
  return hvem === 'barn' || hvem === 'gruppeBoern'
}

// Har gruppen svaret ja til, at der er børn under 110 cm med?
// De små kan ikke klatre, men resten af gruppen kan godt.
export function smaaIGruppen(svar) {
  return erGruppe(svar) && svar.smaaBoern?.smaaMed === true
}

// Højden på den laveste, der skal klatre.
function klatreHoejde(svar) {
  return svar.hoejde?.minimumHoejde
}

// Banerne på et niveau (1, 2 eller 3), fra letteste til sværeste.
// Sort (frit fald) er ikke med – den er ikke en startbane
function banerPaaNiveau(baner, niveau) {
  return baner.filter(
    (b) => harSvaerhedsgrad(b) && b.id !== FRIT_FALD_ID && trinFor(b) === niveau
  )
}

// Navne som tekst, fx "Blå, Lilla og Lyserød" – eller "Grøn eller Gul" med bindeord 'eller'
function navneliste(baner, bindeord = 'og') {
  const navne = baner.map((b) => b.name)
  if (navne.length <= 1) return navne[0] ?? ''
  return `${navne.slice(0, -1).join(', ')} ${bindeord} ${navne.at(-1)}`
}

/* --- Spørgsmålene --- */

// Vælger spørgsmålsteksten ud fra, hvem der skal klatre.
// Findes der ingen særlig tekst, bruges den almindelige "du"-tekst.
export function visTekst(sp, svar) {
  const hvem = svar.hvem?.hvem
  if (hvem === 'barn' && sp.tekstBarn) return sp.tekstBarn
  if (erGruppe(svar) && sp.tekstGruppe) return sp.tekstGruppe
  return sp.tekst
}

// Vælger svarmulighedens tekst ud fra, hvem der skal klatre.
// Svar som "Det tør jeg ikke" er i jeg-form – når en forælder svarer for sit barn,
// bruges tekstBarn (fx "Det tør mit barn ikke"), og i en gruppe tekstGruppe.
// Findes der ingen særlig tekst, bruges den almindelige tekst.
export function visSvarTekst(svarItem, svar) {
  const hvem = svar.hvem?.hvem
  if (hvem === 'barn' && svarItem.tekstBarn) return svarItem.tekstBarn
  if (erGruppe(svar) && svarItem.tekstGruppe) return svarItem.tekstGruppe
  return svarItem.tekst
}

// Vælger en tekst, der enten er en streng eller et objekt { mig, barn, gruppe },
// ud fra hvem der skal klatre. Mangler barn- eller gruppe-teksten, bruges "mig"
function vaelgForHvem(tekst, svar) {
  if (!tekst) return ''
  if (typeof tekst === 'string') return tekst
  const hvem = svar.hvem?.hvem
  if (hvem === 'barn' && tekst.barn) return tekst.barn
  if (erGruppe(svar) && tekst.gruppe) return tekst.gruppe
  return tekst.mig ?? ''
}

// Vælger hjælpeteksten under spørgsmålet (kan være tom).
// Virker som visTekst: hjaelpBarn og hjaelpGruppe bruges, hvis de findes.
export function visHjaelp(sp, svar) {
  const hvem = svar.hvem?.hvem
  if (hvem === 'barn' && sp.hjaelpBarn) return sp.hjaelpBarn
  if (erGruppe(svar) && sp.hjaelpGruppe) return sp.hjaelpGruppe
  return sp.hjaelp ?? ''
}

// Afgør, om et spørgsmål skal vises lige nu.
// visHvis: spørgsmålet vises kun ved bestemte svar på et andet spørgsmål.
// svarId = ét bestemt svar, svarIder = en liste af svar.
export function skalVises(sp, svar) {
  // Er den laveste, der skal klatre, under 110 cm, kan man kun komme på Bounce.
  // Så springer vi resten af spørgsmålene over og går direkte til resultatet.
  const forLav = svar.hoejde && svar.hoejde.minimumHoejde < KRAV.let
  const foerHoejden = ['hvem', 'smaaBoern', 'hoejde']
  if (forLav && !foerHoejden.includes(sp.id)) {
    return false
  }

  if (!sp.visHvis) {
    return true
  }
  const valgt = svar[sp.visHvis.spoergsmaalId]?.id
  const tilladte = sp.visHvis.svarIder ?? [sp.visHvis.svarId]
  return tilladte.includes(valgt)
}

/* --- Lofterne (det højeste niveau hvert svar tillader) --- */

// Begrundelser til de faste spørgsmål, når netop det svar holder anbefalingen nede.
// Nye spørgsmål fra admin får den generelle tekst
function grundFor(id, niveau, svar) {
  const hvem = subjekt(svar, 'andet')
  // "også selvom man er tryg ved højder" kun, når brugeren faktisk er tryg (tryghed over niveau 1).
  // Ellers modsiger den linjen om, at man ikke har det godt med højder
  const trygTillaeg = svar.tryghed?.maksNiveau > 1 ? ' – også selvom man er tryg ved højder' : ''
  const tekster = {
    erfaring: niveau === 1
      ? `${hvem} har ikke klatret før, og hos GoMonkey starter alle førstegangsklatrere på en let bane og lærer udstyret at kende${trygTillaeg}.`
      : 'De svære baner anbefaler vi først, når man har klatret på høje baner før.',
    tryghed: niveau === 1
      ? `${hvem} har det ikke helt godt med højder, så en lav bane giver den bedste start.`
      : 'Lidt sus i maven er helt normalt – en mellembane giver plads til at vænne sig til højden.',
    oplevelse: niveau === 1
      ? 'Ønsket om en rolig og tryg tur passer bedst til de lette baner.'
      : 'Svarene peger på en mellembane frem for de sværeste baner.',
  }
  return tekster[id] ?? 'Et af svarene peger på en lettere start.'
}

// Rækkefølgen, begrundelserne vises i, når flere lofter holder anbefalingen nede.
// Spørgsmål, der ikke står her (fx nye fra admin), kommer sidst
const BEGRUNDELSE_PRIORITET = ['hoejde', 'tryghed', 'erfaring', 'oplevelse']

// Hvert loft er 1 (Let), 2 (Mellem) eller 3 (Svær) med en begrundelse,
// som vises, hvis netop det loft er det, der bestemmer anbefalingen.
// kilde = hvilket spørgsmål loftet kommer fra (bruges til prioriteten ovenfor)
function lofter(svar) {
  const hoejde = klatreHoejde(svar)
  const hvemHoejde = subjekt(svar, 'hoejde')

  const liste = [
    {
      kilde: 'hoejde',
      niveau: hoejde < KRAV.mellem ? 1 : hoejde < KRAV.svaer ? 2 : 3,
      grund: hoejde < KRAV.mellem
        ? `${hvemHoejde} er under ${KRAV.mellem} cm, så de lette baner er de eneste klatrebaner lige nu.`
        : `${hvemHoejde} er under ${KRAV.svaer} cm, så de svære baner er ikke mulige endnu.`,
    },
  ]

  // Alle besvarede spørgsmål, hvor svaret har et maksNiveau (fra Firebase)
  for (const [id, valgt] of Object.entries(svar)) {
    const niveau = Number(valgt?.maksNiveau)
    if (niveau >= 1 && niveau <= 3) {
      liste.push({ kilde: id, niveau, grund: grundFor(id, niveau, svar) })
    }
  }
  return liste
}

// Det niveau, svarene peger på, hvis man ser bort fra erfaring.
// Bruges til førstegangsklatrere: hos GoMonkey starter alle, der ikke har klatret før,
// på en let bane – men bagefter må man tage alle baner, man er høj nok til.
// Så kan vi fortælle, hvilken bane der passer bagefter (fx Rød for en tryg voksen)
export function niveauUdenErfaring(svar) {
  const andre = lofter(svar).filter((l) => l.kilde !== 'erfaring')
  return Math.min(...andre.map((l) => l.niveau))
}

// Er det kun GoMonkeys regel om førstegangsklatrere, der holder anbefalingen nede?
// Giver niveauet uden erfaring, hvis det er højere end anbefalingen – ellers null
function foerstegangUdenRegel(anbefaling, svar) {
  if (!anbefaling || anbefaling.niveau < 1) return null
  if (Number(svar.erfaring?.maksNiveau) !== 1) return null
  const niveau = niveauUdenErfaring(svar)
  return niveau > anbefaling.niveau ? niveau : null
}

// Den letteste bane på et niveau (uden Sort). Findes der ingen, prøves niveauet under
function lettesteBanePaa(baner, niveau) {
  for (let n = niveau; n >= 1; n--) {
    const bane = banerPaaNiveau(baner, n)[0]
    if (bane) return bane
  }
  return null
}

// Ordene i sætninger om førstegangsklatrere, så de passer til "Hvem skal klatre?"
function former(svar) {
  const hvem = svar.hvem?.hvem
  if (hvem === 'barn') return { subj: 'dit barn', igen: 'det', hoej: 'højt', dine: 'svarene' }
  if (erGruppe(svar)) return { subj: 'I', igen: 'I', hoej: 'høje', dine: 'jeres svar' }
  return { subj: 'du', igen: 'du', hoej: 'høj', dine: 'dine svar' }
}

/* --- Anbefalingen --- */

// Beregner den anbefalede startbane.
// svar = brugerens svar, baner = banerne fra Firebase (hentBaner), sorteret fra let til svær.
// Returnerer et objekt { bane, niveau, begraensninger } eller null, hvis noget mangler.
export function beregnBane(svar, baner) {
  const hoejde = klatreHoejde(svar)
  if (hoejde === undefined || !baner?.length) return null

  // TRIN 1: Under 110 cm – kun Bounce
  if (hoejde < KRAV.let) {
    const bounce = baner.find((b) => !harSvaerhedsgrad(b))
    return bounce ? { bane: bounce, niveau: 0, begraensninger: [] } : null
  }

  // Mangler et af de vigtige svar, kan vi ikke anbefale noget
  if (svar.erfaring === undefined || svar.tryghed === undefined) return null

  // TRIN 2: Det laveste loft bestemmer niveauet
  const alleLofter = lofter(svar)
  const niveau = Math.min(...alleLofter.map((l) => l.niveau))

  // TRIN 3: Den letteste bane på niveauet. Findes der ingen, går vi et niveau ned
  for (let n = niveau; n >= 1; n--) {
    const muligheder = banerPaaNiveau(baner, n)
    if (muligheder.length) {
      return {
        bane: muligheder[0],
        niveau: n,
        // De lofter, der holdt anbefalingen nede (vises som begrundelse)
        begraensninger: alleLofter.filter((l) => l.niveau === niveau && niveau < 3),
      }
    }
  }
  return null
}

// En kort, neutral sætning om niveauet. Den passer, uanset om det er en voksen,
// et barn eller en gruppe, der skal klatre (banens egen beskrivelse er ofte skrevet til børn)
const NIVEAU_TEKST = {
  1: 'En god første bane, hvor man lærer udstyret at kende i trygge rammer.',
  2: 'Her er der mere højde og længere svæv – den passer, når man er klar til lidt sus i maven.',
  3: 'En af parkens mest udfordrende baner med høj puls og flot udsigt.',
}

// Gør et faktatal fra Firebase pænt, fx "1,5 - 8 m." → "1,5–8 m" og "4 stk" → "4"
function pyntTal(tekst) {
  return String(tekst ?? '').trim()
    .replace(/\.$/, '')
    .replace(/\s*-\s*/g, '–')
    .replace(/\s*stk$/, '')
}

// En sætning med banens fakta, fx "Grøn er 1,5 m oppe og 30 m lang, med 4 forhindringer og 1 svæv."
function faktaSaetning(bane) {
  const hoejde = pyntTal(bane.trackHeight)
  const laengde = pyntTal(bane.trackLength)
  const forhindringer = pyntTal(bane.obstacles)
  const svaev = pyntTal(bane.glideAmount)

  const dele = []
  if (hoejde) dele.push(`${hoejde} oppe`)
  if (laengde && laengde !== '0 m') dele.push(`${laengde} lang`)
  const start = dele.length ? `${bane.name} er ${dele.join(' og ')}` : ''

  const ekstra = []
  if (forhindringer && forhindringer !== '0') ekstra.push(`${forhindringer} forhindringer`)
  if (svaev && svaev !== '0') ekstra.push(`${svaev} svæv`)

  if (!start && !ekstra.length) return ''
  if (!start) return `${bane.name} har ${ekstra.join(' og ')}.`
  return ekstra.length ? `${start}, med ${ekstra.join(' og ')}.` : `${start}.`
}

// Titel og tekst til resultatet.
// Har banen en "quizTekst" i Firebase (rettes i admin), bruges den. Den kan være en
// streng eller et objekt { mig, barn, gruppe }, så teksten passer til, hvem der klatrer.
// Ellers bygges en neutral tekst af banens fakta + en sætning om niveauet.
// (Banens almindelige beskrivelse bruges ikke her – den er ofte skrevet til børn,
//  og voksne, der føler sig talt ned til, vælger en sværere bane alligevel)
export function lavResultat(anbefaling, svar = {}) {
  if (!anbefaling) return null
  const { bane, niveau } = anbefaling

  const quizTekst = vaelgForHvem(bane.quizTekst, svar)
  if (quizTekst) {
    return { titel: `Start på ${bane.name}`, tekst: quizTekst }
  }

  if (niveau === 0) {
    return {
      titel: `Start på ${bane.name}`,
      tekst: `${bane.name} er trampolinen mellem træerne. Her er der ingen krav til højde, så alle kan være med.`,
    }
  }

  return {
    titel: `Start på ${bane.name}`,
    tekst: [faktaSaetning(bane), NIVEAU_TEKST[niveau]].filter(Boolean).join(' '),
  }
}

// Finder, hvem en begrundelse handler om, så sætningen passer til svaret på "Hvem skal klatre?".
// emne = 'hoejde' eller 'andet'.
function subjekt(svar, emne) {
  const hvem = svar.hvem?.hvem
  if (hvem === 'barn') return 'Dit barn'
  if (erGruppe(svar)) {
    if (emne === 'hoejde') return 'Den laveste af dem, der skal klatre,'
    return 'Nogle i gruppen'
  }
  return 'Du'
}

// Kort liste med grundene til anbefalingen
export function lavBegrundelse(anbefaling, svar) {
  if (!anbefaling) return []
  const { niveau, begraensninger } = anbefaling

  if (niveau === 0) {
    return [`${subjekt(svar, 'hoejde')} er under ${KRAV.let} cm, som klatrebanerne kræver.`]
  }

  if (niveau === 3) {
    return ['Svarene viser erfaring fra høje baner, tryghed ved højder og lyst til udfordring højt oppe.']
  }

  // Kun de lofter, der faktisk holder anbefalingen nede – højst 2,
  // i prioriteten højde > tryghed > erfaring > oplevelse
  const prioritet = (l) => {
    const i = BEGRUNDELSE_PRIORITET.indexOf(l.kilde)
    return i === -1 ? BEGRUNDELSE_PRIORITET.length : i
  }
  const grunde = [...begraensninger]
    .sort((a, b) => prioritet(a) - prioritet(b))
    .map((l) => l.grund)
  const unikke = [...new Set(grunde)].slice(0, 2)

  unikke.push('Vi anbefaler altid den letteste bane på niveauet – så er der noget at glæde sig til bagefter.')
  return unikke
}

// Næste skridt efter startbanen: den næste bane i rækkefølgen, hvis man er høj nok til den
export function lavVidere(anbefaling, svar, baner) {
  if (!anbefaling) return ''
  const { bane, niveau } = anbefaling
  const hoejde = klatreHoejde(svar) ?? 0

  // Førstegangsklatrere, der ellers ville passe til en sværere bane:
  // efter den lette startbane må man tage alle baner, man er høj nok til
  const udenErfaring = foerstegangUdenRegel(anbefaling, svar)
  if (udenErfaring) {
    const senere = lettesteBanePaa(baner, udenErfaring)
    if (senere && senere.id !== bane.id) {
      const f = former(svar)
      return `Når ${f.subj} har prøvet ${bane.name}, må ${f.igen} tage alle baner, ${f.igen} er ${f.hoej} nok til. Ud fra ${f.dine} passer ${senere.name} godt bagefter.`
    }
  }

  if (niveau === 0) {
    const foerste = banerPaaNiveau(baner, 1)[0]
    return foerste ? `Når man er ${KRAV.let} cm, er ${foerste.name} det første skridt op i træerne.` : ''
  }

  const maksNiveau = hoejde < KRAV.mellem ? 1 : hoejde < KRAV.svaer ? 2 : 3
  const startbaner = baner.filter(
    (b) => harSvaerhedsgrad(b) && b.id !== FRIT_FALD_ID && trinFor(b) <= maksNiveau
  )
  const naeste = startbaner[startbaner.findIndex((b) => b.id === bane.id) + 1]
  if (!naeste) return ''

  const tid = trinFor(naeste) > niveau ? 'Når du er klar til mere' : 'Går det godt'
  return `${tid}, er ${naeste.name} næste skridt.`
}

// Forklaring til førstegangsklatrere: GoMonkeys regel om at starte på en let bane.
// Vises tydeligt i resultatet, så det er klart, at det er en regel for alle – ikke en
// vurdering af personens mod, lyst eller alder. Giver { titel, tekst } eller null
export function lavFoerstegangsInfo(anbefaling, svar, baner) {
  if (!anbefaling || anbefaling.niveau < 1) return null
  if (Number(svar.erfaring?.maksNiveau) !== 1) return null

  const lette = navneliste(banerPaaNiveau(baner, 1), 'eller') || 'en let bane'
  const f = former(svar)
  const Subj = f.subj.charAt(0).toUpperCase() + f.subj.slice(1)

  return {
    titel: 'Første gang i GoMonkey?',
    tekst: `Alle, der ikke har klatret før, starter på ${lette} – uanset alder, mod og lyst. Her lærer man udstyret og sikkerheden at kende sammen med vores instruktører. ${Subj} vælger selv, hvilken af dem ${f.igen} starter på, og bagefter må ${f.igen} klatre på alle de baner, ${f.igen} er ${f.hoej} nok til.`,
  }
}

// Ekstra linjer til grupper.
// 1. Er nogen under 110 cm, kan de ikke klatre – men de kan hoppe på Bounce.
// 2. I grupper med børn kan de større fortsætte på sværere baner.
export function lavGruppeBesked(anbefaling, svar, baner) {
  const linjer = []

  if (smaaIGruppen(svar)) {
    linjer.push(
      `Børnene under ${KRAV.let} cm kan ikke klatre på banerne endnu. Til gengæld er der ingen krav på Bounce – trampolinen mellem træerne – så de små kan hoppe, mens resten klatrer.`
    )
  }

  if (svar.hvem?.hvem === 'gruppeBoern' && anbefaling && anbefaling.niveau < 3) {
    const mellem = navneliste(banerPaaNiveau(baner, 2))
    const svaer = navneliste(banerPaaNiveau(baner, 3))
    linjer.push(
      `Anbefalingen passer til den laveste og mest utrygge, der skal klatre. De større og mere erfarne i gruppen kan fortsætte på ${mellem} (fra ${KRAV.mellem} cm) og ${svaer} (fra ${KRAV.svaer} cm).`
    )
  }

  return linjer
}

// Ekstra besked om frit fald (Sort).
// Vises kun, hvis spørgsmålet om frit fald er blevet vist og besvaret.
// Vigtigt: kun dem, der får en svær bane (niveau 3), opfordres til at prøve Sort.
// Alle andre får en neutral besked, så begyndere ikke føler sig opfordret til parkens sværeste bane
export function lavFritfaldBesked(anbefaling, svar, baner) {
  const fritfald = svar.fritfald?.id
  const sort = baner?.find((b) => b.id === FRIT_FALD_ID)
  const navn = sort?.name ?? 'Frit fald-banen'

  // Nej eller ikke spurgt: ingen besked.
  if (!fritfald || fritfald === 'ff1') return ''

  if (fritfald === 'ff2') {
    return `${navn} er parkens sværeste bane og slutter med et frit fald fra op til 16 meters højde, altid sammen med en instruktør. Spørg os, hvis du vil vide mere.`
  }

  // Svaret er ja (ff3). Kravene tjekkes først
  if (svar.vaegt?.opfylderMinimum !== true) {
    return 'Frit fald kræver, at man vejer mindst 30 kg. Spørg en instruktør, hvis du er i tvivl.'
  }

  if ((svar.tryghed?.maksNiveau ?? 1) <= 1) {
    return `${subjekt(svar, 'andet')} har lyst til frit fald, men har det ikke helt godt med højder. Tag en snak med en instruktør først.`
  }

  // Kun ved en svær bane opfordres der til frit fald
  if (anbefaling?.niveau === 3) {
    return `Er der mod på mere efter ${anbefaling.bane.name}, slutter ${navn} med et frit fald fra op til 16 meters højde – altid sammen med en instruktør.`
  }

  // Førstegangsklatrere, der ellers ville passe til de svære baner:
  // Sort er en mulighed, når de har prøvet den lette startbane
  if (foerstegangUdenRegel(anbefaling, svar) === 3) {
    const f = former(svar)
    return `${navn} er en mulighed, når ${f.subj} har prøvet ${anbefaling.bane.name} først. Den slutter med et frit fald fra 16 meter – altid sammen med en instruktør.`
  }

  // Niveau 1 og 2: neutral besked
  return `${navn} er parkens sværeste bane og slutter med et frit fald fra 16 meter. Prøv de andre baner først, og tal med en instruktør, når du er klar.`
}

// Regler, som er gode at kende før besøget (fra gomonkey.dk/praktisk-info).
export function lavGodtAtVide(svar) {
  const linjer = []
  if (boernMed(svar)) {
    linjer.push('Børn 6–10 år: 1 voksen pr. 4 børn.')
    linjer.push('Børn 11–16 år: en voksen skal være med i parken.')
  }
  linjer.push('Alle starter med instruktion og en prøvebane, før de kommer op i træerne.')
  linjer.push('Ingen klatring for personer over 120 kg.')
  return linjer
}

// Niveauernes navne (Let, Mellem, Svær) – fx til admin
export const NIVEAU_NAVNE = NIVEAUER.map((n) => n.navn)
