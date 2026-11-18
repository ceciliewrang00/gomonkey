// QUIZLOGIK – hjernen bag banevælgeren
// Her står ALLE reglerne for, hvilken bane quizzen anbefaler.
// QuizSide.vue viser bare spørgsmålene og resultatet – den regner ikke selv.
//
// Målet er en FORSIGTIG anbefaling: hellere en bane for let end for svær.
// Man kan altid tage en sværere bane bagefter – men en for svær første bane
// kan ødelægge hele oplevelsen.
//
// Sådan findes anbefalingen (i funktionen beregnBane):
// 1. Er man under 110 cm, kan man kun komme på Bounce (trampolinen).
// 2. Ellers finder vi det højeste NIVEAU, man må starte på (1 = Let, 2 = Mellem, 3 = Svær).
//    Tænk på hvert svar som et "loft" – et højeste niveau, svaret tillader.
//    Det LAVESTE loft bestemmer. Eksempel: højden tillader Svær (3), men man er utryg
//    ved højder (1) → så bliver det Let (1).
//      - Højden: det højeste niveau blandt de baner, man er høj nok til.
//        Hver banes højdekrav læses fra feltet "Krav" i Firebase (fx "Minimum 120 cm høj.").
//        Fx 120–139 cm → Mellem, men kun Blå og Lilla (Lyserød kræver 140 cm)
//      - Alle andre svar har et tal "maksNiveau" (1, 2 eller 3) i Firebase, som kan
//        rettes i admin. Fx "aldrig prøvet" = 1, "helt fint med højder" = 3.
//    Der gives ingen point.
// 3. På det niveau anbefales den LETTESTE bane, man er høj nok til (fx Grøn frem for Gul),
//    og den næste bane nævnes som "næste skridt".
//
// Banerne (navn, rækkefølge, sværhedsgrad) hentes fra Firebase via services/baner.js
// og står ikke her. Så passer anbefalingen altid med forsiden og kortet,
// også hvis en bane skifter navn.
//
// Filen bruger kun niveau.js (ingen Firebase), så reglerne kan testes uden browser:
// node scripts/testQuiz.mjs
//
// Ordet "svar" går igen i hele filen. Det er alle brugerens svar samlet i ét objekt:
// { hvem: {...}, hoejde: {...}, erfaring: {...}, ... } – ét felt pr. spørgsmål

import { trinFor, harSvaerhedsgrad, NIVEAUER } from './niveau.js'

// Reserve-krav (i cm) for hvert niveau. Det rigtige krav læses fra hver banes "Krav"-felt
// i Firebase (se kravFor). Tallene her bruges kun, hvis der ikke står et tal i feltet.
// KRAV.let er også grænsen for, om man kan klatre overhovedet (under 110 cm = kun Bounce)
export const KRAV = {
  let: 110,
  mellem: 140,
  svaer: 160,
}

// Hvor høj man mindst skal være (i cm) for at komme på en bestemt bane.
// Tallet læses fra banens "Krav" i Firebase, fx "Minimum 120 cm høj." → 120.
// /(\d+)\s*cm/ er et søgemønster: et tal efterfulgt af "cm".
// Bounce har ingen krav (0). Står der intet tal, bruges reserve-kravet for banens niveau
export function kravFor(bane) {
  if (!harSvaerhedsgrad(bane)) return 0
  const fundet = String(bane.requirements ?? '').match(/(\d+)\s*cm/)
  if (fundet) return Number(fundet[1])
  return [KRAV.let, KRAV.mellem, KRAV.svaer][trinFor(bane) - 1]
}

// Er man høj nok til banen?
function hoejNok(bane, hoejde) {
  return hoejde >= kravFor(bane)
}

// Frit fald-banen (Sort). Den anbefales aldrig som første bane, men får sin egen besked
const FRIT_FALD_ID = 'bane-7'

/* --- Små hjælpe-funktioner --- */
// svar.hvem?.hvem: ?. betyder "hvis svar.hvem findes" – ellers giver det undefined i stedet for en fejl

// Har man svaret, at man er en gruppe (med børn eller voksne)?
export function erGruppe(svar) {
  const hvem = svar.hvem?.hvem
  return hvem === 'gruppeBoern' || hvem === 'gruppeVoksne'
}

// Er der børn med? (Så skal reglerne om voksne med børn vises)
function boernMed(svar) {
  const hvem = svar.hvem?.hvem
  return hvem === 'barn' || hvem === 'gruppeBoern'
}

// Har gruppen svaret ja til, at der er børn under 110 cm med?
// De små kan ikke klatre, men resten af gruppen kan godt.
export function smaaIGruppen(svar) {
  return erGruppe(svar) && svar.smaaBoern?.smaaMed === true
}

// Højden (i cm) på den laveste person, der skal klatre
function klatreHoejde(svar) {
  return svar.hoejde?.minimumHoejde
}

// Alle startbaner: klatrebanerne uden Bounce og Sort (frit fald), fra letteste til sværeste.
// Med en højde fås kun dem, man er høj nok til
function startbaner(baner, hoejde) {
  return baner.filter(
    (b) => harSvaerhedsgrad(b) && b.id !== FRIT_FALD_ID && (hoejde === undefined || hoejNok(b, hoejde))
  )
}

// Alle startbaner på et bestemt niveau (1, 2 eller 3), fra letteste til sværeste.
// Med en højde fås kun dem, man er høj nok til (fx Blå og Lilla, men ikke Lyserød ved 125 cm)
function banerPaaNiveau(baner, niveau, hoejde) {
  return startbaner(baner, hoejde).filter((b) => trinFor(b) === niveau)
}

// Det højeste niveau, højden giver adgang til (1, 2 eller 3).
// Math.max(...) finder det største tal. Er man ikke høj nok til nogen bane, bliver det 1
function niveauForHoejde(baner, hoejde) {
  const mulige = startbaner(baner, hoejde).map(trinFor)
  return mulige.length ? Math.max(...mulige) : 1
}

// Laver en liste af baner om til en pæn sætning, fx "Blå, Lilla og Lyserød".
// Med bindeord 'eller' fås fx "Grøn eller Gul".
// slice(0, -1) = alle undtagen den sidste, at(-1) = den sidste
function navneliste(baner, bindeord = 'og') {
  const navne = baner.map((b) => b.name)
  if (navne.length <= 1) return navne[0] ?? ''
  return `${navne.slice(0, -1).join(', ')} ${bindeord} ${navne.at(-1)}`
}

/* --- Spørgsmålene --- */
// Et spørgsmål kan have tre udgaver af sin tekst i Firebase:
//   tekst       = til "du"          (fx "Hvor høj er du?")
//   tekstBarn   = til en forælder    (fx "Hvor højt er dit barn?")
//   tekstGruppe = til en gruppe      (fx "Hvor høj er den laveste?")
// Funktionerne herunder vælger den rigtige ud fra svaret på "Hvem skal klatre?"

// Vælger spørgsmålets tekst.
// Findes der ingen særlig tekst til barn/gruppe, bruges den almindelige "du"-tekst
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

// Det samme, men for tekster, der kan være enten bare én tekst
// eller et objekt med tre udgaver { mig, barn, gruppe }.
// Mangler barn- eller gruppe-udgaven, bruges "mig"
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

// Skal dette spørgsmål vises lige nu? Giver true eller false.
// Nogle spørgsmål har "visHvis" i Firebase: de vises KUN, hvis man har svaret
// noget bestemt på et andet spørgsmål. Fx vises "Hvor meget vejer du?" kun,
// hvis man har sagt ja til frit fald.
//   visHvis.spoergsmaalId = det spørgsmål, der skal kigges på
//   visHvis.svarId        = det ene svar, der får spørgsmålet frem
//   visHvis.svarIder      = eller: en liste af svar, der får det frem
export function skalVises(sp, svar) {
  // Er den laveste, der skal klatre, under 110 cm, kan man kun komme på Bounce.
  // Så springer vi resten af spørgsmålene over og går direkte til resultatet.
  const forLav = svar.hoejde && svar.hoejde.minimumHoejde < KRAV.let
  const foerHoejden = ['hvem', 'smaaBoern', 'hoejde']
  if (forLav && !foerHoejden.includes(sp.id)) {
    return false
  }

  // Ingen visHvis = spørgsmålet vises altid
  if (!sp.visHvis) {
    return true
  }
  // Hvad har man svaret på det andet spørgsmål – og er det et af de tilladte svar?
  const valgt = svar[sp.visHvis.spoergsmaalId]?.id
  const tilladte = sp.visHvis.svarIder ?? [sp.visHvis.svarId]
  return tilladte.includes(valgt)
}

/* --- Lofterne (det højeste niveau, hvert svar tillader) --- */

// Teksten, der forklarer, HVORFOR et svar holdt anbefalingen nede.
// Fx "Du har ikke klatret før, og ...". Der er særlige tekster til erfaring, tryghed og oplevelse.
// Nye spørgsmål, man har lavet i admin, får en generel tekst
function grundFor(id, niveau, svar) {
  const hvem = subjekt(svar, 'andet') // "Du", "Dit barn" eller "Nogle i gruppen"
  // Tilføjelsen "også selvom man er tryg ved højder" kommer kun med, hvis man faktisk ER tryg.
  // Ellers ville den sige det modsatte af en anden begrundelse
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
  // ?? = brug teksten til højre, hvis der ikke findes en til venstre
  return tekster[id] ?? 'Et af svarene peger på en lettere start.'
}

// Holder flere svar anbefalingen nede, vises begrundelserne i denne rækkefølge
// (vigtigste først). Spørgsmål, der ikke står her (fx nye fra admin), kommer sidst
const BEGRUNDELSE_PRIORITET = ['hoejde', 'tryghed', 'erfaring', 'oplevelse']

// Højdens loft. Den har ikke et maksNiveau i Firebase, så den regnes ud fra banernes krav:
// det højeste niveau blandt de baner, man er høj nok til.
// Grunden nævner det laveste krav, man ikke når, fx
// "Du er under 140 cm, så Lyserød, Rød og Sort er ikke mulige endnu."
function hoejdeLoft(svar, baner) {
  const hoejde = klatreHoejde(svar)
  const hvemHoejde = subjekt(svar, 'hoejde')
  const niveau = niveauForHoejde(baner, hoejde)

  // Klatrebanerne, man ikke er høj nok til endnu (Sort er med her, men ikke Bounce)
  const forHoeje = baner.filter((b) => harSvaerhedsgrad(b) && !hoejNok(b, hoejde))
  const naesteKrav = forHoeje.length ? Math.min(...forHoeje.map(kravFor)) : null

  let grund = ''
  if (naesteKrav !== null) {
    grund = niveau === 1
      ? `${hvemHoejde} er under ${naesteKrav} cm, så de lette baner er de eneste klatrebaner lige nu.`
      : `${hvemHoejde} er under ${naesteKrav} cm, så ${navneliste(forHoeje)} er ikke mulige endnu.`
  }
  return { kilde: 'hoejde', niveau, grund }
}

// Laver en liste med et loft for hvert svar. Ét loft ser sådan ud:
//   { kilde: 'tryghed', niveau: 1, grund: 'Du har det ikke helt godt med højder ...' }
// kilde  = hvilket spørgsmål loftet kommer fra
// niveau = det højeste niveau, svaret tillader (1, 2 eller 3)
// grund  = teksten, der vises, hvis netop dette loft er det, der bestemmer
function lofter(svar, baner) {
  const liste = [hoejdeLoft(svar, baner)]

  // Gå alle svar igennem. Har svaret et maksNiveau (1–3) fra Firebase, bliver det et loft
  for (const [id, valgt] of Object.entries(svar)) {
    const niveau = Number(valgt?.maksNiveau)
    if (niveau >= 1 && niveau <= 3) {
      liste.push({ kilde: id, niveau, grund: grundFor(id, niveau, svar) })
    }
  }
  return liste
}

// Hvilket niveau ville man få, hvis vi IKKE talte "har du klatret før?" med?
// Hvorfor: hos GoMonkey starter alle førstegangsklatrere på en let bane – men bagefter
// må de tage alle baner, de er høje nok til. Så kan vi fortælle, hvilken bane der passer
// BAGEFTER (fx Rød for en tryg voksen). Math.min(...) finder det laveste loft
export function niveauUdenErfaring(svar, baner) {
  const andre = lofter(svar, baner).filter((l) => l.kilde !== 'erfaring')
  return Math.min(...andre.map((l) => l.niveau))
}

// Er det KUN reglen om førstegangsklatrere, der gør anbefalingen let?
// Ja → giv det niveau, man ville have fået uden reglen. Nej → giv null (= intet)
function foerstegangUdenRegel(anbefaling, svar, baner) {
  if (!anbefaling || anbefaling.niveau < 1) return null
  if (Number(svar.erfaring?.maksNiveau) !== 1) return null
  const niveau = niveauUdenErfaring(svar, baner)
  return niveau > anbefaling.niveau ? niveau : null
}

// Den letteste bane på et niveau, man er høj nok til (uden Sort). Findes der ingen på niveauet,
// prøver løkken niveauet under (n-- = træk 1 fra), indtil den finder en
function lettesteBanePaa(baner, niveau, hoejde) {
  for (let n = niveau; n >= 1; n--) {
    const bane = banerPaaNiveau(baner, n, hoejde)[0]
    if (bane) return bane
  }
  return null
}

// Små ord, der skifter efter "Hvem skal klatre?", så sætningerne lyder rigtigt.
// Fx "når DU har prøvet ..." / "når DIT BARN har prøvet ..." / "når I har prøvet ..."
function former(svar) {
  const hvem = svar.hvem?.hvem
  if (hvem === 'barn') return { subj: 'dit barn', igen: 'det', hoej: 'højt', dine: 'svarene' }
  if (erGruppe(svar)) return { subj: 'I', igen: 'I', hoej: 'høje', dine: 'jeres svar' }
  return { subj: 'du', igen: 'du', hoej: 'høj', dine: 'dine svar' }
}

/* --- Anbefalingen --- */

// HOVEDFUNKTIONEN: finder den anbefalede første bane.
// Får: svar = alle brugerens svar, baner = banerne fra Firebase (sorteret fra let til svær).
// Giver: { bane, niveau, begraensninger } – eller null, hvis der mangler svar.
//   bane           = den anbefalede bane
//   niveau         = 0 (Bounce), 1, 2 eller 3
//   begraensninger = de lofter, der holdt anbefalingen nede (bruges til "hvorfor"-teksten)
export function beregnBane(svar, baner) {
  const hoejde = klatreHoejde(svar)
  if (hoejde === undefined || !baner?.length) return null

  // TRIN 1: Under 110 cm – kun Bounce (den eneste bane uden sværhedsgrad)
  if (hoejde < KRAV.let) {
    const bounce = baner.find((b) => !harSvaerhedsgrad(b))
    return bounce ? { bane: bounce, niveau: 0, begraensninger: [] } : null
  }

  // Mangler et af de vigtige svar, kan vi ikke anbefale noget
  if (svar.erfaring === undefined || svar.tryghed === undefined) return null

  // TRIN 2: Det laveste loft bestemmer niveauet.
  // Math.min(...liste) = det mindste tal i listen
  const alleLofter = lofter(svar, baner)
  const niveau = Math.min(...alleLofter.map((l) => l.niveau))

  // TRIN 3: Den letteste bane på niveauet, man er høj nok til. Findes der ingen, går vi et niveau ned
  for (let n = niveau; n >= 1; n--) {
    const muligheder = banerPaaNiveau(baner, n, hoejde)
    if (muligheder.length) {
      return {
        bane: muligheder[0],
        niveau: n,
        // De lofter, der holdt anbefalingen nede (vises som begrundelse).
        // Ved Svær (3) blev man ikke holdt nede, så der er ingen
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

// Gør et faktatal fra Firebase pænt, fx "1,5 - 8 m." → "1,5–8 m" og "4 stk" → "4".
// Hver .replace fjerner/bytter noget (det mellem / / er et regex – et søgemønster):
//   /\.$/       = et punktum til sidst → fjernes
//   /\s*-\s*/g  = en bindestreg med mellemrum omkring → bliver til en tankestreg "–"
//   /\s*stk$/   = "stk" til sidst → fjernes
function pyntTal(tekst) {
  return String(tekst ?? '').trim()
    .replace(/\.$/, '')
    .replace(/\s*-\s*/g, '–')
    .replace(/\s*stk$/, '')
}

// Bygger en sætning af banens fakta, fx "Grøn er 1,5 m oppe og 30 m lang, med 4 forhindringer og 1 svæv."
// Fakta, som banen ikke har (tom eller 0), springes over
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

// Overskrift og tekst til resultatet, fx "Start på Grøn".
// Teksten vælges sådan:
//  1. Har banen en "quizTekst" i Firebase (rettes i admin), bruges den.
//     Den kan have tre udgaver { mig, barn, gruppe }, så den passer til, hvem der klatrer.
//  2. Er det Bounce (niveau 0), bruges en fast tekst om trampolinen.
//  3. Ellers bygges teksten af banens fakta + en sætning om niveauet.
// (Banens almindelige beskrivelse bruges ikke – den er ofte skrevet til børn,
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

// Hvem handler sætningen om? Giver "Du", "Dit barn" eller noget om gruppen,
// så teksten passer til svaret på "Hvem skal klatre?".
// emne = 'hoejde' (så handler det om den laveste i gruppen) eller 'andet'
function subjekt(svar, emne) {
  const hvem = svar.hvem?.hvem
  if (hvem === 'barn') return 'Dit barn'
  if (erGruppe(svar)) {
    if (emne === 'hoejde') return 'Den laveste af dem, der skal klatre,'
    return 'Nogle i gruppen'
  }
  return 'Du'
}

// Listen "Derfor anbefaler vi ..." i resultatet (højst 2 grunde + en fast sidste linje)
export function lavBegrundelse(anbefaling, svar) {
  if (!anbefaling) return []
  const { niveau, begraensninger } = anbefaling

  if (niveau === 0) {
    return [`${subjekt(svar, 'hoejde')} er under ${KRAV.let} cm, som klatrebanerne kræver.`]
  }

  if (niveau === 3) {
    return ['Svarene viser erfaring fra høje baner, tryghed ved højder og lyst til udfordring højt oppe.']
  }

  // Sortér grundene efter BEGRUNDELSE_PRIORITET (højde > tryghed > erfaring > oplevelse).
  // prioritet giver et lofts plads i den liste. Står det ikke i listen (-1), kommer det sidst.
  // new Set fjerner tekster, der står to gange, og slice(0, 2) tager kun de 2 første
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

// Sætningen om "næste skridt": hvilken bane man kan prøve efter den første.
// Det er den næste bane i rækkefølgen – men kun, hvis man er høj nok til den.
// Giver en tom tekst '', hvis der ingen næste bane er
export function lavVidere(anbefaling, svar, baner) {
  if (!anbefaling) return ''
  const { bane, niveau } = anbefaling
  const hoejde = klatreHoejde(svar) ?? 0

  // Førstegangsklatrere, der ellers ville passe til en sværere bane:
  // efter den lette startbane må man tage alle baner, man er høj nok til
  const udenErfaring = foerstegangUdenRegel(anbefaling, svar, baner)
  if (udenErfaring) {
    const senere = lettesteBanePaa(baner, udenErfaring, hoejde)
    if (senere && senere.id !== bane.id) {
      const f = former(svar)
      return `Når ${f.subj} har prøvet ${bane.name}, må ${f.igen} tage alle baner, ${f.igen} er ${f.hoej} nok til. Ud fra ${f.dine} passer ${senere.name} godt bagefter.`
    }
  }

  if (niveau === 0) {
    const foerste = banerPaaNiveau(baner, 1)[0]
    return foerste ? `Når man er ${kravFor(foerste)} cm, er ${foerste.name} det første skridt op i træerne.` : ''
  }

  // Find de baner, man er høj nok til, og tag den, der kommer lige efter den anbefalede
  // (findIndex finder den anbefalede banes plads i listen, + 1 = den næste)
  const mulige = startbaner(baner, hoejde)
  const naeste = mulige[mulige.findIndex((b) => b.id === bane.id) + 1]
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
  // Samme ord med stort forbogstav, fordi det står først i en sætning ("du" → "Du")
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
    // Mellem- og svære startbaner samlet efter højdekrav,
    // fx "Blå og Lilla (fra 120 cm), Lyserød (fra 140 cm) og Rød (fra 160 cm)"
    const grupper = []
    for (const b of startbaner(baner).filter((b) => trinFor(b) >= 2)) {
      const krav = kravFor(b)
      const gruppe = grupper.find((g) => g.krav === krav)
      if (gruppe) gruppe.baner.push(b)
      else grupper.push({ krav, baner: [b] })
    }
    const dele = grupper.map((g) => `${navneliste(g.baner)} (fra ${g.krav} cm)`)
    const tekst = dele.length <= 1 ? (dele[0] ?? '') : `${dele.slice(0, -1).join(', ')} og ${dele.at(-1)}`
    if (tekst) {
      linjer.push(
        `Anbefalingen passer til den laveste og mest utrygge, der skal klatre. De større og mere erfarne i gruppen kan fortsætte på ${tekst}.`
      )
    }
  }

  return linjer
}

// Ekstra besked om frit fald (Sort).
// Vises kun, hvis man har fået og svaret på spørgsmålet om frit fald.
// Svarenes id'er i Firebase: ff1 = nej, ff3 = ja, ff2 = det mellemste svar (se teksten i admin).
// Vigtigt: kun dem, der får en svær bane (niveau 3), opfordres til at prøve Sort.
// Alle andre får en neutral besked, så begyndere ikke føler sig presset til parkens sværeste bane
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
  if (foerstegangUdenRegel(anbefaling, svar, baner) === 3) {
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

// Bare navnene på niveauerne: ['Let', 'Mellem', 'Svær'] – bruges fx i admin
export const NIVEAU_NAVNE = NIVEAUER.map((n) => n.navn)
