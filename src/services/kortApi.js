// KORT-API – banerne til det interaktive kort
//
// To kilder, der hver har sit ansvar:
//  1) Kortets geometri – hvor hver bane går på kortet (segmenter med to punkter hver) og
//     om det er en bane eller en aktivitet (type). Ingen tekster.
//     Hentes fra Firebase "kortbaner" (rettes i admin under fanen "Kort").
//     Er "kortbaner" tom, bruges public/popup.json, som er den gamle, faste udgave.
//  2) Firebase "baner" (via services/baner.js): navn, beskrivelse, sværhedsgrad, krav og
//     faktatal – præcis de samme data som banekortene på forsiden.
// De to slås sammen på banens id (fx 'bane-6'), så popup'en på kortet og forsiden altid
// viser det samme.

import { hentBaner } from '@/services/baner.js'
import { KORTBANER_URL } from '@/services/api.js'
import { lavStier, somListe } from '@/utils/kortStier.js'

// Henter geometrien fra Firebase. Giver en tom liste, hvis der ikke ligger noget
export async function hentKortbanerFraFirebase({ signal } = {}) {
  const response = await fetch(`${KORTBANER_URL}.json`, { signal, cache: 'no-store' })
  if (!response.ok) throw new Error(`Fejl ${response.status}`)
  return somListe(await response.json())
}

// Henter den gamle geometri fra public/popup.json
export async function hentKortbanerFraFil({ signal } = {}) {
  // no-store undgår gammel cache
  const response = await fetch('/popup.json', { signal, cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`Banedata kunne ikke hentes (HTTP ${response.status}).`)
  }

  const svar = await response.json()

  // Understøtter både [...], { baner: [...] } og objekt med ID-nøgler.
  return somListe(Array.isArray(svar?.baner) ? svar.baner : svar)
}

export async function hentKortbaner({ signal } = {}) {
  // Firebase først. Fejler det (fx ingen forbindelse), bruges filen i stedet
  let geometri = []
  try {
    geometri = await hentKortbanerFraFirebase({ signal })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    console.error('Kortbanerne kunne ikke hentes fra Firebase – bruger popup.json', e)
  }
  if (geometri.length === 0) geometri = await hentKortbanerFraFil({ signal })

  if (geometri.length === 0) {
    throw new Error('Der er ingen baner til kortet.')
  }

  // Tjekker, at hver bane har et id og gyldige segmenter, og at ingen id'er går igen
  const idSet = new Set()
  for (const bane of geometri) {
    if (typeof bane?.id !== 'string') {
      throw new Error('En bane til kortet mangler id.')
    }
    if (idSet.has(bane.id)) throw new Error(`Banen ${bane.id} findes to gange.`)
    idSet.add(bane.id)
  }

  // Aktiviteter (fx sort og bounce) har ingen segmenter.
  // Hvert segment får sine tre streger (paths). Fra Firebase er der kun punkter,
  // så stregerne tegnes ud fra dem. popup.json har dem allerede.
  for (const bane of geometri) {
    bane.segmenter = somListe(bane.segmenter)
      .filter((seg) => seg.paths || (Array.isArray(seg.punkter) && seg.punkter.length === 2))
      .map((seg) => ({ ...seg, paths: seg.paths ?? lavStier(seg.punkter) }))
  }

  // Tekster og tal fra Firebase. Kan de ikke hentes, virker kortet stadig –
  // banerne hedder så bare deres id, indtil siden genindlæses
  let firebaseBaner = []
  try {
    firebaseBaner = await hentBaner()
  } catch (e) {
    console.error('Banernes tekster kunne ikke hentes fra Firebase', e)
  }

  // Slår de to sammen. "navn" er banens navn fra Firebase "baner" (fx "Rød").
  // Nye baner, der kun findes på kortet, bruger navnet fra kort-admin
  const baner = geometri.map((geo) => {
    const data = firebaseBaner.find((b) => b.id === geo.id) ?? {}
    return { ...data, ...geo, navn: data.name ?? geo.navn ?? geo.id }
  })

  return { baner }
}
