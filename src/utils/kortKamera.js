/**
 * Interaktivt kort – kamera, uden DOM-afhængigheder.
 * SVG'en beholder sine originale koordinater; kun viewBox ændrer sig.
 * Zoom=1 viser HELE parken på desktop, med lidt luft ved kanterne.
 */
export const KORT_BREDDE = 1683.78
export const KORT_HOEJDE = 1810.98
export const MIN_ZOOM = 1
export const MAKS_ZOOM = 6

export const begraens = (værdi, minimum, maksimum) =>
  Math.max(minimum, Math.min(maksimum, værdi))

/** Basen for 1× zoom. Vælg 'contain' på desktop, så ingen del klippes af. */
export function grundUdsnit(viewportWidth, viewportHeight) {
  const bredde = Math.max(1, viewportWidth)
  const højde = Math.max(1, viewportHeight)
  const forhold = bredde / højde

  // På små, smalle telefoner må kortet fylde skærmen og panoreres sideværts.
  if (bredde < 700 && forhold < 0.85) {
    const skalering = Math.min(KORT_BREDDE / bredde, KORT_HOEJDE / højde)
    return { width: bredde * skalering, height: højde * skalering }
  }

  // Desktop/tablet: fit/contain – bevar SAMTLIGE baner i billedet.
  const luft = 1.065
  const skalering = Math.max(KORT_BREDDE / bredde, KORT_HOEJDE / højde) * luft
  return { width: bredde * skalering, height: højde * skalering }
}

/**
 * Når billedet kan være helt i viewporten på én akse, hold det centreret.
 * Når brugeren har zoomet ind, tillad pan hen til alle kanter, med lidt luft.
 */
export function begraensCenter(center, synligBredde, synligHoejde) {
  function akse(c, synlig, hel) {
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
export function beregnViewBox({ center, zoom, viewportWidth, viewportHeight }) {
  const basis = grundUdsnit(viewportWidth, viewportHeight)
  const faktor = begraens(zoom, MIN_ZOOM, MAKS_ZOOM)
  const width = basis.width / faktor
  const height = basis.height / faktor
  const korrigeretCenter = begraensCenter(center, width, height)
  return {
    x: korrigeretCenter.x - width / 2,
    y: korrigeretCenter.y - height / 2,
    width,
    height,
    center: korrigeretCenter
  }
}