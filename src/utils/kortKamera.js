// Regningen bag zoom og træk på det interaktive kort. Vi ændrer SVG'ens viewBox,
// altså hvilket udsnit af tegningen der vises – mindre udsnit = zoomet ind

// Kort-tegningens størrelse (fra viewBox i public/kort-base.svg)
export const KORT_BREDDE = 1683.78
export const KORT_HOEJDE = 1810.98

// 1 = hele parken, 6 = seks gange tættere på
export const MIN_ZOOM = 1
export const MAKS_ZOOM = 6

// Holder et tal mellem en mindste og en største værdi, fx begraens(8, 1, 6) = 6
export const begraens = (værdi, minimum, maksimum) =>
  Math.max(minimum, Math.min(maksimum, værdi))

// Regner udsnittets størrelse ud ved zoom 1, så det har samme form som boksen på skærmen.
// tilladFyld = false slår telefon-reglen fra
export function grundUdsnit(viewportWidth, viewportHeight, tilladFyld = true) {
  // Mindst 1, så vi aldrig dividerer med 0
  const bredde = Math.max(1, viewportWidth)
  const højde = Math.max(1, viewportHeight)
  const forhold = bredde / højde  // under 1 = boksen er højere end bred

  // Telefon: kortet fylder hele skærmen, og man trækker sidelæns for at se resten
  if (tilladFyld && bredde < 700 && forhold < 0.85) {
    const skalering = Math.min(KORT_BREDDE / bredde, KORT_HOEJDE / højde)
    return { width: bredde * skalering, height: højde * skalering }
  }

  // Computer: hele kortet kan ses på én gang, med 6,5 % luft rundt om
  const luft = 1.065
  const skalering = Math.max(KORT_BREDDE / bredde, KORT_HOEJDE / højde) * luft
  return { width: bredde * skalering, height: højde * skalering }
}

// Sørger for, at man ikke kan trække kortet væk fra skærmen.
// Kortet centreres i den del, filteret ikke dækker
export function begraensCenter(center, synligBredde, synligHoejde, daekketVenstre = 0) {
  // Samme regel for x og y, så den er skrevet én gang
  function akse(c, synlig, hel, daekket = 0) {
    // Kan man se hele kortet, står det i midten
    if (synlig - daekket >= hel) return hel / 2 - daekket / 2
    // Ellers må midten kun flyttes, til kortets kant når boksens kant
    return begraens(c, synlig / 2 - daekket, hel - synlig / 2)
  }
  return {
    x: akse(center.x, synligBredde, KORT_BREDDE, daekketVenstre),
    y: akse(center.y, synligHoejde, KORT_HOEJDE)
  }
}

// Regner udsnittet (viewBox) ud fra midten, zoom og boksens størrelse.
// Kortet tilpasses den del, filteret ikke dækker, men tegnes stadig bag filteret
export function beregnViewBox({ center, zoom, viewportWidth, viewportHeight, venstreDaekket = 0 }) {
  // Den bredde, filteret ikke dækker – men mindst halvdelen af boksen
  const friBredde = Math.max(viewportWidth - venstreDaekket, viewportWidth / 2)
  const daekketPx = viewportWidth - friBredde

  // Udsnittet ved zoom 1, gjort bredere, så det også dækker området bag filteret
  const fri = grundUdsnit(friBredde, viewportHeight, daekketPx === 0)
  const enhederPrPixel = fri.width / Math.max(1, friBredde)  // kort-enheder pr. pixel
  const basis = {
    width: fri.width + daekketPx * enhederPrPixel,
    height: fri.height
  }

  // Zoom 2 = halvt så stort udsnit = kortet ser dobbelt så stort ud
  const faktor = begraens(zoom, MIN_ZOOM, MAKS_ZOOM)
  const width = basis.width / faktor
  const height = basis.height / faktor

  const daekketEnheder = daekketPx * enhederPrPixel / faktor

  // Er kortet trukket for langt ud, flyttes midten tilbage
  const korrigeretCenter = begraensCenter(center, width, height, daekketEnheder)

  // viewBox starter i øverste venstre hjørne, så vi trækker en halv bredde og højde fra midten
  return {
    x: korrigeretCenter.x - width / 2,
    y: korrigeretCenter.y - height / 2,
    width,
    height,
    center: korrigeretCenter
  }
}
