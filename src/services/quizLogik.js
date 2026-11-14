// QUIZLOGIK
// Alle regler for banevælgeren samlet ét sted, så QuizSide.vue kun skal vise dem.
//
// Rækkefølgen i beregnBane:
// 1. Højden afgør, hvilke baner man må komme på.
// 2. Inden for de tilladte baner afgør tryghed, erfaring og point, hvor man skal starte.
//
// Krav fra gomonkey.dk/praktisk-info og gomonkey.dk/forest-odense (grafikken "Højdekrav"):
//   Bounce:                 ingen krav
//   Gul og Grøn:            min. 110 cm
//   Turkis, Blå og Lilla:   min. 140 cm
//   Rød:                    min. 160 cm
//   Sort:                   min. 30 kg (frit fald, kun med instruktør)
//   Alle:    ingen klatring over 120 kg
// Der er ingen alderskrav til banerne i Odense – alder har kun betydning for,
// hvor mange voksne der skal være med (se GODT_AT_VIDE nedenfor).
// Ændrer GoMonkey kravene, skal tallene her også ændres.

export const KRAV = {
  groen: 110,
  blaa: 140,
  roed: 160,
}

// Teksterne til hver mulig anbefaling.
// titel = overskrift, tekst = om banen, videre = næste skridt bagefter.
export const RESULTATER = {
  bounce: {
    titel: 'Start på Bounce',
    tekst:
      'Bounce er trampolinen mellem træerne, og her er der ingen krav til højde. Klatrebanerne kræver, at man er mindst 110 cm.',
    videre: 'Når man er 110 cm, er Gul det første skridt op i træerne.',
  },
  'bane-1': {
    titel: 'Start på Gul',
    tekst:
      'Gul er parkens laveste bane: 1,5 meter oppe, 30 meter lang, med 4 forhindringer og et kort svæv. Her kan man lære udstyret at kende i trygge rammer.',
    videre: 'Går det godt, er Grøn næste skridt.',
  },
  'bane-2': {
    titel: 'Start på Grøn',
    tekst:
      'Grøn går fra 1,5 op til 8 meters højde og har 8 forhindringer. Den er god, når man er klar til at komme lidt højere op i træerne.',
    videre: 'Tag gerne en tur på Gul først som opvarmning.',
  },
  'bane-3': {
    titel: 'Start på Turkis',
    tekst:
      'Turkis er 4–7 meter oppe, har 13 forhindringer og en svævebane på 96 meter. Der er sus i maven, mens man lærer udstyret at kende.',
    videre: 'Går det godt, er Blå og Lilla næste skridt.',
  },
  'bane-4': {
    titel: 'Start på Blå',
    tekst:
      'Blå kræver både styrke og balance: 11 forhindringer og tre svævebaner på op til 110 meter, 5–8 meter oppe.',
    videre: 'Har du mod på mere bagefter, venter Lilla og Rød.',
  },
  'bane-6': {
    titel: 'Start på Rød',
    tekst:
      'Rød går helt op i 16 meters højde og har 18 forhindringer og et svæv på 126 meter. Her får du både høj puls og flot udsigt.',
    videre: 'Er det første gang hos GoMonkey, så varm gerne op på Turkis, Blå eller Lilla først.',
  },
}

// Er svaret på "Hvem skal klatre?" en gruppe?
export function erGruppe(svar) {
  const hvem = svar.hvem?.hvem
  return hvem === 'gruppeBoern' || hvem === 'gruppeVoksne'
}

// Er der børn med? (Bruges til et lidt mere forsigtigt resultat og til reglerne om voksne.)
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
// For grupper handler højdespørgsmålet kun om dem, der skal klatre.
function klatreHoejde(svar) {
  return svar.hoejde?.minimumHoejde
}

// Vælger spørgsmålsteksten ud fra, hvem der skal klatre.
// Findes der ingen særlig tekst, bruges den almindelige "du"-tekst.
export function visTekst(sp, svar) {
  const hvem = svar.hvem?.hvem
  if (hvem === 'barn' && sp.tekstBarn) return sp.tekstBarn
  if (erGruppe(svar) && sp.tekstGruppe) return sp.tekstGruppe
  return sp.tekst
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
  // (Grupper med små børn får et ja/nej-spørgsmål om dem før højden,
  //  så her handler højden altid om dem, der skal klatre.)
  const forLav = svar.hoejde && svar.hoejde.minimumHoejde < KRAV.groen
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

// Beregner den anbefalede startbane.
// svar = brugerens svar, point = samlede point, graenser = { blaaFra, roedFra } fra admin.
// Returnerer en nøgle fra RESULTATER, fx 'bane-3', eller null hvis svar mangler.
export function beregnBane(svar, point, graenser) {
  // Højden på den laveste, der skal klatre (se klatreHoejde ovenfor).
  const hoejde = klatreHoejde(svar)
  const tryghed = svar.tryghed?.point
  const erfaring = svar.erfaring?.point

  // Uden højde kan vi ikke anbefale noget.
  if (hoejde === undefined) {
    return null
  }

  // TRIN 1: Under 110 cm – kun Bounce.
  // Tjekkes før de andre svar, fordi quizzen stopper efter højden for dem under 110 cm.
  if (hoejde < KRAV.groen) {
    return 'bounce'
  }

  // Mangler et af de andre vigtige svar, kan vi ikke anbefale noget.
  if (tryghed === undefined || erfaring === undefined) {
    return null
  }

  // TRIN 2: 110–139 cm – kun Gul og Grøn.
  if (hoejde < KRAV.blaa) {
    // Første gang eller utryg: start på den laveste bane.
    if (erfaring === 0 || tryghed <= 1) {
      return 'bane-1'
    }
    return 'bane-2'
  }

  // TRIN 3: 140 cm og derover – Turkis, Blå og Lilla er mulige.
  // Et barn, der er meget utrygt ved højder, starter på Grøn.
  if (boernMed(svar) && tryghed === 0) {
    return 'bane-2'
  }

  // Utryg ved højder eller få point: rolig start på Turkis.
  if (tryghed <= 1 || point < graenser.blaaFra) {
    return 'bane-3'
  }

  // Rød kræver 160 cm, mange point, tryghed og at man har klatret flere gange.
  if (
    hoejde >= KRAV.roed &&
    point >= graenser.roedFra &&
    tryghed >= 2 &&
    erfaring >= 2
  ) {
    return 'bane-6'
  }

  return 'bane-4'
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

// Laver en kort liste med grundene til anbefalingen.
export function lavBegrundelse(bane, svar, point, graenser) {
  const grunde = []
  const hoejde = klatreHoejde(svar)
  const tryghed = svar.tryghed?.point
  const erfaring = svar.erfaring?.point

  // Forklarer, hvorfor de højere baner ikke er mulige endnu.
  if (bane === 'bounce') {
    grunde.push(`${subjekt(svar, 'hoejde')} er under 110 cm, som klatrebanerne kræver.`)
    return grunde
  }
  if ((bane === 'bane-1' || bane === 'bane-2') && hoejde < KRAV.blaa) {
    grunde.push(`${subjekt(svar, 'hoejde')} er under 140 cm, så Turkis, Blå og Lilla er ikke mulige endnu.`)
  }
  if ((bane === 'bane-3' || bane === 'bane-4') && hoejde < KRAV.roed) {
    grunde.push(`${subjekt(svar, 'hoejde')} er under 160 cm, så Rød er ikke mulig endnu.`)
  }

  // Forklarer, hvorfor vi anbefaler en rolig start.
  if (bane === 'bane-1' || bane === 'bane-2' || bane === 'bane-3') {
    if (erfaring === 0) {
      grunde.push(`${subjekt(svar, 'andet')} har ikke prøvet en klatrepark før.`)
    }
    if (tryghed <= 1) {
      grunde.push(`${subjekt(svar, 'andet')} har det ikke helt godt med højder.`)
    }
    if (bane === 'bane-3' && tryghed > 1 && erfaring > 0 && point < graenser.blaaFra) {
      grunde.push('Svarene peger på en rolig start frem for de sværeste baner.')
    }
  }

  if (bane === 'bane-4') {
    grunde.push('Svarene viser, at man er tryg ved højder og gerne vil udfordres.')
    if (erfaring < 2 && hoejde >= KRAV.roed) {
      grunde.push('Rød anbefaler vi først, når man har klatret flere gange.')
    }
  }

  if (bane === 'bane-6') {
    grunde.push('Svarene viser erfaring, tryghed ved højder og lyst til en stor udfordring.')
  }

  return grunde
}

// Næste skridt efter startbanen. Rød nævnes kun, hvis man er høj nok til den.
export function lavVidere(bane, svar) {
  if (bane === 'bane-4' && (klatreHoejde(svar) ?? 0) < KRAV.roed) {
    return 'Har du mod på mere bagefter, venter Lilla.'
  }
  return RESULTATER[bane]?.videre ?? ''
}

// Ekstra linjer til grupper.
// 1. Er nogen under 110 cm, kan de ikke klatre – men de kan hoppe på Bounce.
// 2. I grupper med børn kan de større fortsætte på sværere baner.
export function lavGruppeBesked(bane, svar) {
  const linjer = []

  if (smaaIGruppen(svar)) {
    linjer.push(
      'Børnene under 110 cm kan ikke klatre på banerne endnu. Til gengæld er der ingen krav på Bounce – trampolinen mellem træerne – så de små kan hoppe, mens resten klatrer.'
    )
  }

  if (
    svar.hvem?.hvem === 'gruppeBoern' &&
    (bane === 'bane-1' || bane === 'bane-2' || bane === 'bane-3')
  ) {
    linjer.push(
      'Anbefalingen passer til den laveste og mest utrygge, der skal klatre. De større i gruppen kan fortsætte på Turkis, Blå og Lilla (fra 140 cm) og Rød (fra 160 cm).'
    )
  }

  return linjer
}

// Ekstra besked om Sort bane / frit fald.
// Vises kun, hvis spørgsmålet om frit fald er blevet vist og besvaret.
export function lavFritfaldBesked(bane, svar) {
  const fritfald = svar.fritfald?.id

  // Nej eller ikke spurgt: ingen besked.
  if (!fritfald || fritfald === 'ff1') return ''

  if (fritfald === 'ff2') {
    return 'Sort bane slutter med et frit fald fra op til 16 meters højde, altid sammen med en instruktør. Spørg os, hvis du vil vide mere.'
  }

  // Svaret er ja (ff3).
  if (erGruppe(svar)) {
    return 'Sort bane med frit fald kræver, at man vejer mindst 30 kg, og springet sker altid sammen med en instruktør.'
  }

  // "Du" eller "Dit barn" i beskederne nedenfor.
  const hvem = subjekt(svar, 'andet')

  if (svar.vaegt?.opfylderMinimum !== true) {
    return 'Frit fald kræver, at man vejer mindst 30 kg. Spørg en instruktør, hvis du er i tvivl.'
  }

  if ((svar.tryghed?.point ?? 0) <= 1) {
    return `${hvem} har lyst til frit fald, men har det ikke helt godt med højder. Tag en snak med en instruktør først.`
  }

  if (bane === 'bane-6') {
    return 'Er der mod på mere efter Rød, slutter Sort bane med et frit fald fra op til 16 meters højde – altid sammen med en instruktør.'
  }

  return `${hvem} kan prøve Sort bane med frit fald fra op til 16 meters højde – altid sammen med en instruktør. Start gerne på en af de andre baner først for at lære udstyret at kende.`
}

// Regler, som er gode at kende før besøget (fra gomonkey.dk/praktisk-info).
export function lavGodtAtVide(svar) {
  const linjer = []
  if (boernMed(svar)) {
    linjer.push('Børn 6–10 år: 1 voksen pr. 4 børn.')
    linjer.push('Børn 11–16 år: en voksen skal være med i parken.')
  }
  linjer.push('Ingen klatring for personer over 120 kg.')
  return linjer
}