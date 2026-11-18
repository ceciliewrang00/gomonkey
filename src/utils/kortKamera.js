// KORT-KAMERA – matematikken bag zoom og træk på det interaktive kort
//
// Tænk på det som et kamera, der filmer kort-tegningen:
// En SVG har en viewBox = "x y bredde højde". Den bestemmer, hvilket UDSNIT af tegningen
// der vises i boksen på skærmen. Vi flytter og zoomer altså ikke selve tegningen –
// vi ændrer bare, hvilket stykke vi kigger på.
//  - Mindre udsnit = zoomet ind (vi ser et mindre stykke, så det ser større ud)
//  - Flyt x/y      = træk kortet (kig på et andet sted)
// Ved zoom 1 kan man se HELE parken, med lidt luft rundt om.
//
// Filen har ingen Vue og ingen HTML – kun regning. InteraktivtKort.vue bruger funktionerne herfra.

// Størrelsen på kort-tegningen i dens egne enheder (fra viewBox i public/kort-base.svg)
export const KORT_BREDDE = 1683.78
export const KORT_HOEJDE = 1810.98

// Hvor langt man må zoome: 1 = hele parken, 6 = seks gange tættere på
export const MIN_ZOOM = 1
export const MAKS_ZOOM = 6

// Holder et tal mellem en mindste og en største værdi.
// Eksempel: begraens(8, 1, 6) giver 6, begraens(0, 1, 6) giver 1, begraens(3, 1, 6) giver 3
export const begraens = (værdi, minimum, maksimum) =>
  Math.max(minimum, Math.min(maksimum, værdi))

// Regner ud, hvor stort udsnittet skal være ved zoom 1.
// Udsnittet skal have samme form som boksen på skærmen (fx bred og lav),
// ellers ville kortet blive strakt ud.
// tilladFyld = false slår telefon-reglen herunder fra (bruges, når filteret dækker en del af kortet)
export function grundUdsnit(viewportWidth, viewportHeight, tilladFyld = true) {
  // Math.max(1, ...) sikrer, at tallet mindst er 1, så vi aldrig dividerer med 0
  const bredde = Math.max(1, viewportWidth)
  const højde = Math.max(1, viewportHeight)
  const forhold = bredde / højde // under 1 = boksen er højere end den er bred

  // TELEFON (smal og høj skærm): kortet fylder hele skærmen, og man trækker sidelæns
  // for at se resten. Math.min = vælg den mindste skalering, så der ikke er tom plads
  if (tilladFyld && bredde < 700 && forhold < 0.85) {
    const skalering = Math.min(KORT_BREDDE / bredde, KORT_HOEJDE / højde)
    return { width: bredde * skalering, height: højde * skalering }
  }

  // COMPUTER/TABLET: hele kortet skal kunne ses på én gang.
  // Math.max = vælg den største skalering, så hele kortet er med (evt. med tom plads ved siden af).
  // luft = 1.065 gør udsnittet 6,5 % større, så der er lidt plads rundt om kortet
  const luft = 1.065
  const skalering = Math.max(KORT_BREDDE / bredde, KORT_HOEJDE / højde) * luft
  return { width: bredde * skalering, height: højde * skalering }
}

// Sørger for, at man ikke kan trække kortet helt væk fra skærmen.
// center = det punkt på kortet, der skal stå midt i boksen.
// daekketVenstre = hvor meget af boksens venstre side filteret dækker (i kortets enheder).
// Kortet centreres i den frie del til højre for filteret
export function begraensCenter(center, synligBredde, synligHoejde, daekketVenstre = 0) {
  // Samme regel for begge retninger, så den er skrevet én gang og bruges to gange (x og y).
  // c = midten nu, synlig = hvor meget vi ser, hel = hele kortets størrelse, daekket = dækket del
  function akse(c, synlig, hel, daekket = 0) {
    // Kan man se hele kortet i den retning, står det bare i midten (af den frie del)
    if (synlig - daekket >= hel) return hel / 2 - daekket / 2
    // Ellers må midten flyttes, men kun så langt, at kortets kant når kanten af boksen
    // (i venstre side: kanten af filteret)
    return begraens(c, synlig / 2 - daekket, hel - synlig / 2)
  }
  return {
    x: akse(center.x, synligBredde, KORT_BREDDE, daekketVenstre),
    y: akse(center.y, synligHoejde, KORT_HOEJDE)
  }
}

// HOVEDFUNKTIONEN. Ud fra midten, zoom og boksens størrelse regnes udsnittet (viewBox) ud.
// InteraktivtKort.vue kalder den, hver gang man zoomer, trækker eller ændrer vinduet.
// venstreDaekket = antal pixels i venstre side, som filteret dækker (på computer).
// Kortet tilpasses den frie del til højre, men tegnes stadig bag filteret,
// så baggrunden går helt ud til kanten
export function beregnViewBox({ center, zoom, viewportWidth, viewportHeight, venstreDaekket = 0 }) {
  // Den frie bredde (ikke dækket af filteret) – men mindst halvdelen af boksen,
  // så kortet aldrig bliver alt for lille
  const friBredde = Math.max(viewportWidth - venstreDaekket, viewportWidth / 2)
  const daekketPx = viewportWidth - friBredde

  // 1. Find udsnittet ved zoom 1 for den frie del.
  // Gør det derefter bredere, så det også dækker området bag filteret.
  // (Er noget dækket, slås telefon-reglen fra, så hele kortet altid kan ses)
  const fri = grundUdsnit(friBredde, viewportHeight, daekketPx === 0)
  const enhederPrPixel = fri.width / Math.max(1, friBredde) // hvor mange kort-enheder 1 pixel er
  const basis = {
    width: fri.width + daekketPx * enhederPrPixel,
    height: fri.height
  }

  // 2. Zoom: del udsnittet med zoom. Zoom 2 = halvt så stort udsnit = kortet ser dobbelt så stort ud
  const faktor = begraens(zoom, MIN_ZOOM, MAKS_ZOOM)
  const width = basis.width / faktor
  const height = basis.height / faktor

  // Den dækkede del regnet om til kort-enheder ved den zoom, vi har nu
  const daekketEnheder = daekketPx * enhederPrPixel / faktor

  // 3. Er kortet trukket for langt ud mod en kant, flyttes midten tilbage
  const korrigeretCenter = begraensCenter(center, width, height, daekketEnheder)

  // 4. viewBox skal have øverste venstre hjørne – ikke midten.
  // Derfor trækkes en halv bredde og en halv højde fra midten
  return {
    x: korrigeretCenter.x - width / 2,
    y: korrigeretCenter.y - height / 2,
    width,
    height,
    center: korrigeretCenter
  }
}
