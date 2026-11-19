// Henter banerne til det interaktive kort. Linjerne kommer fra Firebase "kortbaner"
// (eller public/popup.json), teksterne fra "baner", og de sættes sammen ud fra banens id

import { hentBaner } from '@/services/baner.js'

import { KORTBANER_URL } from '@/services/api.js'

import { lavStier, somListe } from '@/utils/kortStier.js'

// Henter banernes linjer fra Firebase "kortbaner". signal kan afbryde hentningen,
// og no-store gør, at vi altid får den nyeste udgave
export async function hentKortbanerFraFirebase({ signal } = {}) {
  const response = await fetch(`${KORTBANER_URL}.json`, { signal, cache: 'no-store' })
  if (!response.ok) throw new Error(`Fejl ${response.status}`)
  return somListe(await response.json())
}

// Reserven: henter de gamle linjer fra public/popup.json
export async function hentKortbanerFraFil({ signal } = {}) {
  const response = await fetch('/popup.json', { signal, cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`Banedata kunne ikke hentes (HTTP ${response.status}).`)
  }

  const svar = await response.json()

  // Filen kan være en liste, { baner: [...] } eller et objekt – det bliver altid til en liste
  return somListe(Array.isArray(svar?.baner) ? svar.baner : svar)
}

// Henter linjerne, tjekker dem, laver stregerne og sætter teksterne fra "baner" på.
// Det er den, InteraktivtKort.vue kalder
export async function hentKortbaner({ signal } = {}) {
  // Prøver Firebase først. Fejler det, skrives fejlen i konsollen, og vi bruger filen i stedet
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

  // Hver bane skal have et id, og samme id må ikke findes to gange
  const idSet = new Set()
  for (const bane of geometri) {
    if (typeof bane?.id !== 'string') {
      throw new Error('En bane til kortet mangler id.')
    }
    if (idSet.has(bane.id)) throw new Error(`Banen ${bane.id} findes to gange.`)
    idSet.add(bane.id)
  }

  // Laver de tre streger (kant, farve, reb) ud fra punkterne, hvis de ikke findes i forvejen.
  // Linjer uden streger og uden to punkter er i stykker og fjernes
  for (const bane of geometri) {
    bane.segmenter = somListe(bane.segmenter)
      .filter((seg) => seg.paths || (Array.isArray(seg.punkter) && seg.punkter.length === 2))
      .map((seg) => ({ ...seg, paths: seg.paths ?? lavStier(seg.punkter) }))
  }

  // Henter teksterne fra "baner". Fejler det, virker kortet stadig, men banerne hedder deres id
  let firebaseBaner = []
  try {
    firebaseBaner = await hentBaner()
  } catch (e) {
    console.error('Banernes tekster kunne ikke hentes fra Firebase', e)
  }

  // Sætter linjer og tekster sammen for hver bane. Navnet tages fra "baner",
  // ellers fra kort-admin, ellers bruges id'et
  const baner = geometri.map((geo) => {
    const data = firebaseBaner.find((b) => b.id === geo.id) ?? {}
    return { ...data, ...geo, navn: data.name ?? geo.navn ?? geo.id }
  })

  return { baner }
}
