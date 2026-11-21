// Henter banerne til det interaktive kort. Linjerne kommer fra Firebase "kortbaner",
// teksterne fra "baner", og de sættes sammen ud fra banens id

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

// Henter linjerne, tjekker dem, laver stregerne og sætter teksterne fra "baner" på.
// Det er den, InteraktivtKort.vue kalder
export async function hentKortbaner({ signal } = {}) {
  // Fejler Firebase, sendes fejlen videre, og kortet viser en fejlbesked
  const geometri = await hentKortbanerFraFirebase({ signal })

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
