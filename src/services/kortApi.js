// Henter banerne til kortet fra den lokale popup.json fil
export async function hentKortbaner({ signal } = {}) {
  // Henter direkte fra public/popup.json. no-store undgår gammel cache.
  const response = await fetch('/popup.json', { signal, cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`Banedata kunne ikke hentes (HTTP ${response.status}).`)
  }

  const svar = await response.json()

  // Understøtter både [...], { baner: [...] } og objekt med ID-nøgler.
  const data = Array.isArray(svar)
    ? svar
    : Array.isArray(svar?.baner)
      ? svar.baner
      : svar && typeof svar === 'object'
        ? Object.values(svar)
        : null

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('API-responsen indeholder ingen baner.')
  }

  // Tjekker, at hver bane har det, kortet skal bruge, og at ingen id'er går igen
  const idSet = new Set()
  for (const bane of data) {
    // Aktiviteter (fx sort og bounce) har ingen segmenter, så den må mangle.
    const segmenterFejl = bane?.segmenter !== undefined && !Array.isArray(bane.segmenter)

    if (typeof bane?.id !== 'string' || typeof bane?.navn !== 'string' || segmenterFejl) {
      throw new Error('En bane mangler id eller navn, eller har ugyldige segmenter i API-data.')
    }
    if (idSet.has(bane.id)) throw new Error(`Banen ${bane.id} findes to gange i API-data.`)
    idSet.add(bane.id)
  }

  return { baner: data }
}