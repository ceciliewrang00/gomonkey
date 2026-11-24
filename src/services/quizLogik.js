// Alle reglerne for, hvilken bane quizzen anbefaler. Hvert svar giver et "loft" (højeste niveau),
// og det laveste loft bestemmer – så hellere en bane for let end for svær

import { trinFor, harSvaerhedsgrad, NIVEAUER } from './niveau.js'

// Reserve-krav i cm for hvert niveau, hvis banens "Krav"-felt ikke har et tal.
// Under 110 cm kan man kun komme på Bounce
export const KRAV = {
  let: 110,
  mellem: 140,
  svaer: 160,
}

// Hvor høj man mindst skal være til banen. Tallet læses fra "Krav", fx "Minimum 120 cm høj." → 120
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

// Frit fald-banen (Sort). Den anbefales aldrig som første bane
const FRIT_FALD_ID = 'bane-7'

/* --- Små hjælpe-funktioner --- */

// Er man en gruppe?
export function erGruppe(svar) {
  const hvem = svar.hvem?.hvem
  return hvem === 'gruppeBoern' || hvem === 'gruppeVoksne'
}

// Er der børn med?
function boernMed(svar) {
  const hvem = svar.hvem?.hvem
  return hvem === 'barn' || hvem === 'gruppeBoern'
}

// Er der børn under 110 cm med i gruppen?
export function smaaIGruppen(svar) {
  return erGruppe(svar) && svar.smaaBoern?.smaaMed === true
}

// Højden på den laveste, der skal klatre
function klatreHoejde(svar) {
  return svar.hoejde?.minimumHoejde
}

// Klatrebanerne uden Bounce og Sort. Med en højde kun dem, man er høj nok til
function startbaner(baner, hoejde) {
  return baner.filter(
    (b) => harSvaerhedsgrad(b) && b.id !== FRIT_FALD_ID && (hoejde === undefined || hoejNok(b, hoejde))
  )
}

// Startbanerne på et bestemt niveau (1, 2 eller 3)
function banerPaaNiveau(baner, niveau, hoejde) {
  return startbaner(baner, hoejde).filter((b) => trinFor(b) === niveau)
}

// Det højeste niveau, højden giver adgang til. Er man ikke høj nok til nogen, bliver det 1
function niveauForHoejde(baner, hoejde) {
  const mulige = startbaner(baner, hoejde).map(trinFor)
  return mulige.length ? Math.max(...mulige) : 1
}

// Laver en liste af baner om til en sætning, fx "Blå, Lilla og Lyserød"
function navneliste(baner, bindeord = 'og') {
  const navne = baner.map((b) => b.name)
  if (navne.length <= 1) return navne[0] ?? ''
  return `${navne.slice(0, -1).join(', ')} ${bindeord} ${navne.at(-1)}`
}

/* --- Spørgsmålene --- */
// Et spørgsmål kan have en tekst til "du", til en forælder (tekstBarn) og til en gruppe (tekstGruppe).
// Funktionerne herunder vælger den rigtige ud fra "Hvem skal klatre?"

// Vælger spørgsmålets tekst
export function visTekst(sp, svar) {
  const hvem = svar.hvem?.hvem
  if (hvem === 'barn' && sp.tekstBarn) return sp.tekstBarn
  if (erGruppe(svar) && sp.tekstGruppe) return sp.tekstGruppe
  return sp.tekst
}

// Vælger svarets tekst, fx "Det tør mit barn ikke", når en forælder svarer
export function visSvarTekst(svarItem, svar) {
  const hvem = svar.hvem?.hvem
  if (hvem === 'barn' && svarItem.tekstBarn) return svarItem.tekstBarn
  if (erGruppe(svar) && svarItem.tekstGruppe) return svarItem.tekstGruppe
  return svarItem.tekst
}

// Det samme for tekster, der enten er én tekst eller { mig, barn, gruppe }
function vaelgForHvem(tekst, svar) {
  if (!tekst) return ''
  if (typeof tekst === 'string') return tekst
  const hvem = svar.hvem?.hvem
  if (hvem === 'barn' && tekst.barn) return tekst.barn
  if (erGruppe(svar) && tekst.gruppe) return tekst.gruppe
  return tekst.mig ?? ''
}

// Vælger hjælpeteksten under spørgsmålet
export function visHjaelp(sp, svar) {
  const hvem = svar.hvem?.hvem
  if (hvem === 'barn' && sp.hjaelpBarn) return sp.hjaelpBarn
  if (erGruppe(svar) && sp.hjaelpGruppe) return sp.hjaelpGruppe
  return sp.hjaelp ?? ''
}

// Skal spørgsmålet vises? Spørgsmål med "visHvis" vises kun ved bestemte svar
// på et andet spørgsmål, fx vægt kun ved ja til frit fald
export function skalVises(sp, svar) {
  // Er den laveste under 110 cm, springes resten over, og man går direkte til resultatet
  const forLav = svar.hoejde && svar.hoejde.minimumHoejde < KRAV.let
  const foerHoejden = ['hvem', 'smaaBoern', 'hoejde']
  if (forLav && !foerHoejden.includes(sp.id)) {
    return false
  }

  if (!sp.visHvis) {
    return true
  }
  // Er svaret på det andet spørgsmål et af de tilladte?
  const valgt = svar[sp.visHvis.spoergsmaalId]?.id
  const tilladte = sp.visHvis.svarIder ?? [sp.visHvis.svarId]
  return tilladte.includes(valgt)
}

/* --- Lofterne (det højeste niveau, hvert svar tillader) --- */

// Teksten, der forklarer, hvorfor et svar holdt anbefalingen nede
function grundFor(id, niveau, svar) {
  const hvem = subjekt(svar, 'andet')  // "Du", "Dit barn" eller "Nogle i gruppen"
  // Tilføjelsen kommer kun med, hvis man faktisk er tryg ved højder
  const trygTillaeg = svar.tryghed?.maksNiveau > 1 ? ', også selvom man er tryg ved højder' : ''
  const tekster = {
    erfaring: niveau === 1
      ? `${hvem} har ikke klatret før, og hos GoMonkey starter alle førstegangsklatrere på en let bane og lærer udstyret at kende${trygTillaeg}.`
      : 'De svære baner anbefaler vi først, når man har klatret på høje baner før.',
    tryghed: niveau === 1
      ? `${hvem} har det ikke helt godt med højder, så en lav bane giver den bedste start.`
      : 'Lidt sus i maven er helt normalt. En mellembane giver plads til at vænne sig til højden.',
    oplevelse: niveau === 1
      ? 'Ønsket om en rolig og tryg tur passer bedst til de lette baner.'
      : 'Svarene peger på en mellembane frem for de sværeste baner.',
  }
  return tekster[id] ?? 'Et af svarene peger på en lettere start.'
}

// Rækkefølgen, begrundelserne vises i (vigtigste først)
const BEGRUNDELSE_PRIORITET = ['hoejde', 'tryghed', 'erfaring', 'oplevelse']

// Højdens loft: det højeste niveau blandt de baner, man er høj nok til,
// med en tekst om de baner, man ikke er høj nok til endnu
function hoejdeLoft(svar, baner) {
  const hoejde = klatreHoejde(svar)
  const hvemHoejde = subjekt(svar, 'hoejde')
  const niveau = niveauForHoejde(baner, hoejde)

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

// Laver et loft for hvert svar: { kilde, niveau, grund }
function lofter(svar, baner) {
  const liste = [hoejdeLoft(svar, baner)]

  // Svar med et maksNiveau fra Firebase bliver til et loft
  for (const [id, valgt] of Object.entries(svar)) {
    const niveau = Number(valgt?.maksNiveau)
    if (niveau >= 1 && niveau <= 3) {
      liste.push({ kilde: id, niveau, grund: grundFor(id, niveau, svar) })
    }
  }
  return liste
}

// Det niveau, man ville få uden "har du klatret før?".
// Førstegangsklatrere starter på en let bane, men må bagefter tage sværere baner
export function niveauUdenErfaring(svar, baner) {
  const andre = lofter(svar, baner).filter((l) => l.kilde !== 'erfaring')
  return Math.min(...andre.map((l) => l.niveau))
}

// Er det kun reglen om førstegangsklatrere, der gør anbefalingen let? Ellers null
function foerstegangUdenRegel(anbefaling, svar, baner) {
  if (!anbefaling || anbefaling.niveau < 1) return null
  if (Number(svar.erfaring?.maksNiveau) !== 1) return null
  const niveau = niveauUdenErfaring(svar, baner)
  return niveau > anbefaling.niveau ? niveau : null
}

// Den letteste bane på niveauet, man er høj nok til. Findes der ingen, prøves niveauet under
function lettesteBanePaa(baner, niveau, hoejde) {
  for (let n = niveau; n >= 1; n--) {
    const bane = banerPaaNiveau(baner, n, hoejde)[0]
    if (bane) return bane
  }
  return null
}

// Små ord, der skifter efter "Hvem skal klatre?", fx "du", "dit barn" eller "I"
function former(svar) {
  const hvem = svar.hvem?.hvem
  if (hvem === 'barn') return { subj: 'dit barn', igen: 'det', hoej: 'højt', dine: 'svarene' }
  if (erGruppe(svar)) return { subj: 'I', igen: 'I', hoej: 'høje', dine: 'jeres svar' }
  return { subj: 'du', igen: 'du', hoej: 'høj', dine: 'dine svar' }
}

/* --- Anbefalingen --- */

// Finder den anbefalede første bane. Giver { bane, niveau, begraensninger },
// eller null, hvis der mangler svar
export function beregnBane(svar, baner) {
  const hoejde = klatreHoejde(svar)
  if (hoejde === undefined || !baner?.length) return null

  // Trin 1: under 110 cm – kun Bounce
  if (hoejde < KRAV.let) {
    const bounce = baner.find((b) => !harSvaerhedsgrad(b))
    return bounce ? { bane: bounce, niveau: 0, begraensninger: [] } : null
  }

  if (svar.erfaring === undefined || svar.tryghed === undefined) return null

  // Trin 2: det laveste loft bestemmer niveauet
  const alleLofter = lofter(svar, baner)
  const niveau = Math.min(...alleLofter.map((l) => l.niveau))

  // Trin 3: den letteste bane på niveauet, man er høj nok til
  for (let n = niveau; n >= 1; n--) {
    const muligheder = banerPaaNiveau(baner, n, hoejde)
    if (muligheder.length) {
      return {
        bane: muligheder[0],
        niveau: n,
        // De lofter, der holdt anbefalingen nede. Ved Svær er der ingen
        begraensninger: alleLofter.filter((l) => l.niveau === niveau && niveau < 3),
      }
    }
  }
  return null
}

// En kort, neutral sætning om niveauet, som passer til både voksne, børn og grupper
const NIVEAU_TEKST = {
  1: 'En god første bane, hvor man lærer udstyret at kende i trygge rammer.',
  2: 'Her er der mere højde og længere svæv. Den passer, når man er klar til lidt sus i maven.',
  3: 'En af parkens mest udfordrende baner med høj puls og flot udsigt.',
}

// Gør et faktatal pænt, fx "1,5 - 8 m." → "1,5–8 m" og "4 stk" → "4"
function pyntTal(tekst) {
  return String(tekst ?? '').trim()
    .replace(/\.$/, '')
    .replace(/\s*-\s*/g, '–')
    .replace(/\s*stk$/, '')
}

// Bygger en sætning af banens fakta. Fakta, banen ikke har, springes over
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

// Overskrift og tekst til resultatet, fx "Vi anbefaler: Start på Grøn". Banens quizTekst bruges, hvis den findes,
// ellers en fast tekst for Bounce eller en tekst bygget af banens fakta
export function lavResultat(anbefaling, svar = {}) {
  if (!anbefaling) return null
  const { bane, niveau } = anbefaling

  const quizTekst = vaelgForHvem(bane.quizTekst, svar)
  if (quizTekst) {
    return { titel: `Vi anbefaler: Start på ${bane.name}`, tekst: quizTekst }
  }

  if (niveau === 0) {
    return {
      titel: `Vi anbefaler: Start på ${bane.name}`,
      tekst: `${bane.name} er trampolinen mellem træerne. Her er der ingen krav til højde, så alle kan være med.`,
    }
  }

  return {
    titel: `Vi anbefaler: Start på ${bane.name}`,
    tekst: [faktaSaetning(bane), NIVEAU_TEKST[niveau]].filter(Boolean).join(' '),
  }
}

// Giver "Du", "Dit barn" eller noget om gruppen, så teksten passer til, hvem der klatrer
function subjekt(svar, emne) {
  const hvem = svar.hvem?.hvem
  if (hvem === 'barn') return 'Dit barn'
  if (erGruppe(svar)) {
    if (emne === 'hoejde') return 'Den laveste af dem, der skal klatre,'
    return 'Nogle i gruppen'
  }
  return 'Du'
}

// Listen "Derfor anbefaler vi ..." (højst 2 grunde + en fast sidste linje)
export function lavBegrundelse(anbefaling, svar) {
  if (!anbefaling) return []
  const { niveau, begraensninger } = anbefaling

  if (niveau === 0) {
    return [`${subjekt(svar, 'hoejde')} er under ${KRAV.let} cm, som klatrebanerne kræver.`]
  }

  if (niveau === 3) {
    return ['Svarene viser erfaring fra høje baner, tryghed ved højder og lyst til udfordring højt oppe.']
  }

  // Sorterer grundene efter vigtighed, fjerner dobbelte og tager de 2 første
  const prioritet = (l) => {
    const i = BEGRUNDELSE_PRIORITET.indexOf(l.kilde)
    return i === -1 ? BEGRUNDELSE_PRIORITET.length : i
  }
  const grunde = [...begraensninger]
    .sort((a, b) => prioritet(a) - prioritet(b))
    .map((l) => l.grund)
  const unikke = [...new Set(grunde)].slice(0, 2)

  unikke.push('Vi anbefaler altid den letteste bane på niveauet, så der er noget at glæde sig til bagefter.')
  return unikke
}

// Sætningen om "næste skridt": den næste bane, hvis man er høj nok til den
export function lavVidere(anbefaling, svar, baner) {
  if (!anbefaling) return ''
  const { bane, niveau } = anbefaling
  const hoejde = klatreHoejde(svar) ?? 0

  // Førstegangsklatrere må bagefter tage alle baner, de er høje nok til
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

  // Den bane, der kommer lige efter den anbefalede
  const mulige = startbaner(baner, hoejde)
  const naeste = mulige[mulige.findIndex((b) => b.id === bane.id) + 1]
  if (!naeste) return ''

  const tid = trinFor(naeste) > niveau ? 'Når du er klar til mere' : 'Går det godt'
  return `${tid}, er ${naeste.name} næste skridt.`
}

// Forklaring af GoMonkeys regel om, at førstegangsklatrere starter på en let bane.
// Giver { titel, tekst } eller null
export function lavFoerstegangsInfo(anbefaling, svar, baner) {
  if (!anbefaling || anbefaling.niveau < 1) return null
  if (Number(svar.erfaring?.maksNiveau) !== 1) return null

  const lette = navneliste(banerPaaNiveau(baner, 1), 'eller') || 'en let bane'
  const f = former(svar)
  const Subj = f.subj.charAt(0).toUpperCase() + f.subj.slice(1)

  return {
    titel: 'Første gang i GoMonkey?',
    tekst: `Alle, der ikke har klatret før, starter på ${lette}, uanset alder, mod og lyst. Her lærer man udstyret og sikkerheden at kende sammen med vores instruktører. ${Subj} vælger selv, hvilken af dem ${f.igen} starter på, og bagefter må ${f.igen} klatre på alle de baner, ${f.igen} er ${f.hoej} nok til.`,
  }
}

// Kort forklaring af den voksnes rolle, når svaret er "Mit barn".
// Den lange version står på forsiden i "Sådan følger du dit barn"
export function lavVoksenInfo(svar) {
  if (svar.hvem?.hvem !== 'barn') return null

  return {
    titel: 'Sådan følger du dit barn',
    tekst: 'Du kan klatre med (kræver selv udstyr og billet), gå med på jorden og heppe eller vente ved start eller mål. Man kan ikke holde sit barn i hånden på banen.',
  }
}

// Ekstra linjer til grupper: børn under 110 cm kan hoppe på Bounce,
// og de større børn kan fortsætte på sværere baner
export function lavGruppeBesked(anbefaling, svar, baner) {
  const linjer = []

  if (smaaIGruppen(svar)) {
    linjer.push(
      `Børnene under ${KRAV.let} cm kan ikke klatre på banerne endnu. Til gengæld er der ingen krav på Bounce, trampolinen mellem træerne, så de små kan hoppe, mens resten klatrer.`
    )
  }

  if (svar.hvem?.hvem === 'gruppeBoern' && anbefaling && anbefaling.niveau < 3) {
    // Banerne samlet efter højdekrav, fx "Blå og Lilla (fra 120 cm), Lyserød (fra 140 cm)"
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

// Ekstra besked om frit fald (Sort). ff1 = nej, ff2 = måske, ff3 = ja.
// Kun dem, der får en svær bane, opfordres til at prøve Sort
export function lavFritfaldBesked(anbefaling, svar, baner) {
  const fritfald = svar.fritfald?.id
  const sort = baner?.find((b) => b.id === FRIT_FALD_ID)
  const navn = sort?.name ?? 'Frit fald-banen'

  // Nej eller ikke spurgt: ingen besked
  if (!fritfald || fritfald === 'ff1') return ''

  if (fritfald === 'ff2') {
    return `${navn} er parkens sværeste bane og slutter med et frit fald fra op til 16 meters højde, altid sammen med en instruktør. Spørg os, hvis du vil vide mere.`
  }

  // Svaret er ja. Kravene tjekkes først
  if (svar.vaegt?.opfylderMinimum !== true) {
    return 'Frit fald kræver, at man vejer mindst 30 kg. Spørg en instruktør, hvis du er i tvivl.'
  }

  if ((svar.tryghed?.maksNiveau ?? 1) <= 1) {
    return `${subjekt(svar, 'andet')} har lyst til frit fald, men har det ikke helt godt med højder. Tag en snak med en instruktør først.`
  }

  if (anbefaling?.niveau === 3) {
    return `Er der mod på mere efter ${anbefaling.bane.name}, slutter ${navn} med et frit fald fra op til 16 meters højde, altid sammen med en instruktør.`
  }

  // Førstegangsklatrere kan prøve Sort efter den lette startbane
  if (foerstegangUdenRegel(anbefaling, svar, baner) === 3) {
    const f = former(svar)
    return `${navn} er en mulighed, når ${f.subj} har prøvet ${anbefaling.bane.name} først. Den slutter med et frit fald fra 16 meter, altid sammen med en instruktør.`
  }

  return `${navn} er parkens sværeste bane og slutter med et frit fald fra 16 meter. Prøv de andre baner først, og tal med en instruktør, når du er klar.`
}

// Regler, der er gode at kende før besøget (fra gomonkey.dk/praktisk-info)
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

// Navnene på niveauerne: ['Let', 'Mellem', 'Svær']
export const NIVEAU_NAVNE = NIVEAUER.map((n) => n.navn)
