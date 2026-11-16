// KORT-API – banerne til det interaktive kort
//
// To kilder, der hver har sit ansvar:
//  1) public/popup.json: KUN kortets geometri – hvor hver bane går på kortet (segmenter) og
//     om det er en bane eller en aktivitet (type). Ingen tekster.
//  2) Firebase "baner" (via services/baner.js): navn, beskrivelse, sværhedsgrad, krav og
//     faktatal – præcis de samme data som banekortene på forsiden.
// De to slås sammen på banens id (fx 'bane-6'), så popup'en på kortet og forsiden altid
// viser det samme.

import { hentBaner } from '@/services/baner.js'

export async function hentKortbaner({ signal } = {}) {
  // Henter direkte fra public/popup.json. no-store undgår gammel cache.
  const response = await fetch('/popup.json', { signal, cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`Banedata kunne ikke hentes (HTTP ${response.status}).`)
  }

  const svar = await response.json()

  // Understøtter både [...], { baner: [...] } og objekt med ID-nøgler.
  const geometri = Array.isArray(svar)
    ? svar
    : Array.isArray(svar?.baner)
      ? svar.baner
      : svar && typeof svar === 'object'
        ? Object.values(svar)
        : null

  if (!Array.isArray(geometri) || geometri.length === 0) {
    throw new Error('popup.json indeholder ingen baner.')
  }

  // Tjekker, at hver bane har et id og gyldige segmenter, og at ingen id'er går igen
  const idSet = new Set()
  for (const bane of geometri) {
    // Aktiviteter (fx sort og bounce) har ingen segmenter, så den må mangle.
    const segmenterFejl = bane?.segmenter !== undefined && !Array.isArray(bane.segmenter)

    if (typeof bane?.id !== 'string' || segmenterFejl) {
      throw new Error('En bane i popup.json mangler id eller har ugyldige segmenter.')
    }
    if (idSet.has(bane.id)) throw new Error(`Banen ${bane.id} findes to gange i popup.json.`)
    idSet.add(bane.id)
  }

  // Tekster og tal fra Firebase. Kan de ikke hentes, virker kortet stadig –
  // banerne hedder så bare deres id, indtil siden genindlæses
  let firebaseBaner = []
  try {
    firebaseBaner = await hentBaner()
  } catch (e) {
    console.error('Banernes tekster kunne ikke hentes fra Firebase', e)
  }

  // Slår de to sammen. "navn" er banens navn fra Firebase (fx "Rød")
  const baner = geometri.map((geo) => {
    const data = firebaseBaner.find((b) => b.id === geo.id) ?? {}
    return { ...data, ...geo, navn: data.name ?? geo.id }
  })

  return { baner }
}
