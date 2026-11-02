/**
 * Interaktivt kort – kamera, uden DOM-afhængigheder.
 * SVG'en beholder sine originale koordinater; kun viewBox ændrer sig.
 * Zoom=1 viser HELE parken på desktop, med lidt luft ved kanterne.
 *
 * Sådan virker "kameraet":
 * En SVG har en viewBox = "x y bredde højde". Den bestemmer, hvilket udsnit af
 * tegningen der vises i boksen på skærmen. Vi flytter og zoomer altså ikke selve
 * tegningen – vi ændrer bare, hvilket udsnit vi kigger på.
 * - Mindre viewBox = zoomet ind (vi ser et mindre stykke, så det ser større ud)
 * - Flyt x/y = panorér (kig på et andet sted på kortet)
 *
 * Filen har ingen Vue og ingen HTML – kun ren matematik. Det gør den nem at
 * teste og genbruge. InteraktivtKort.vue kalder funktionerne herfra.
 */

// Størrelsen på tegningen i SVG-filen (fra viewBox i public/kort-base.svg)
export const KORT_BREDDE = 1683.78
export const KORT_HOEJDE = 1810.98

// Hvor langt man må zoome ud (1 = hele parken) og ind (6 gange)
export const MIN_ZOOM = 1
export const MAKS_ZOOM = 6

// Holder en værdi inden for et minimum og et maksimum.
// Eksempel: begraens(8, 1, 6) giver 6, begraens(0, 1, 6) giver 1
export const begraens = (værdi, minimum, maksimum) =>
  Math.max(minimum, Math.min(maksimum, værdi))

/** Basen for 1× zoom. Vælg 'contain' på desktop, så ingen del klippes af. */
// Regner ud, hvor stort udsnittet af kortet skal være ved zoom 1.
// Udsnittet får samme form (forhold mellem bredde og højde) som boksen på skærmen,
// ellers ville kortet blive strakt.
export function grundUdsnit(viewportWidth, viewportHeight) {
  // Math.max(1, ...) sikrer, at vi aldrig dividerer med 0
  const bredde = Math.max(1, viewportWidth)
  const højde = Math.max(1, viewportHeight)
  const forhold = bredde / højde

  // På små, smalle telefoner må kortet fylde skærmen og panoreres sideværts.
  // Math.min = "cover": kortet fylder hele boksen, og noget skæres af i siderne
  if (bredde < 700 && forhold < 0.85) {
    const skalering = Math.min(KORT_BREDDE / bredde, KORT_HOEJDE / højde)
    return { width: bredde * skalering, height: højde * skalering }
  }

  // Desktop/tablet: fit/contain – bevar SAMTLIGE baner i billedet.
  // Math.max = "contain": hele kortet kan være i boksen, evt. med tom plads ved siden af.
  // luft gør udsnittet 6,5 % større, så der er lidt plads rundt om kortet
  const luft = 1.065
  const skalering = Math.max(KORT_BREDDE / bredde, KORT_HOEJDE / højde) * luft
  return { width: bredde * skalering, height: højde * skalering }
}

/**
 * Når billedet kan være helt i viewporten på én akse, hold det centreret.
 * Når brugeren har zoomet ind, tillad pan hen til alle kanter, med lidt luft.
 */
// Sørger for, at man ikke kan trække kortet helt væk fra skærmen.
// center er det punkt på kortet, som skal stå midt i boksen.
export function begraensCenter(center, synligBredde, synligHoejde) {
  // Gør det samme for én akse ad gangen (først x, så y)
  function akse(c, synlig, hel) {
    // Kan hele kortet ses på denne akse, står det bare i midten
    if (synlig >= hel) return hel / 2
    // Ingen luft: når man har zoomet ind, stopper kortet præcis ved SVG'ens kant
    return begraens(c, synlig / 2, hel - synlig / 2)
  }
  return {
    x: akse(center.x, synligBredde, KORT_BREDDE),
    y: akse(center.y, synligHoejde, KORT_HOEJDE)
  }
}

/** Responsiv viewBox; bevar forholdet mellem X og Y og undgå stræk. */
// Hovedfunktionen: ud fra center, zoom og boksens størrelse regnes den viewBox ud,
// som SVG'en skal have. InteraktivtKort.vue kalder den, hver gang noget ændrer sig.
export function beregnViewBox({ center, zoom, viewportWidth, viewportHeight }) {
  // 1. Udsnittet ved zoom 1
  const basis = grundUdsnit(viewportWidth, viewportHeight)

  // 2. Zoom deler udsnittet: zoom 2 = halvt så stort udsnit = dobbelt så stort kort
  const faktor = begraens(zoom, MIN_ZOOM, MAKS_ZOOM)
  const width = basis.width / faktor
  const height = basis.height / faktor

  // 3. Flyt centeret, hvis det er trukket for langt ud mod en kant
  const korrigeretCenter = begraensCenter(center, width, height)

  // 4. viewBox angives fra øverste venstre hjørne, så vi trækker halvdelen fra centeret
  return {
    x: korrigeretCenter.x - width / 2,
    y: korrigeretCenter.y - height / 2,
    width,
    height,
    center: korrigeretCenter
  }
}
