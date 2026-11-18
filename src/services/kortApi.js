// KORT-API – henter banerne til det interaktive kort
//
// En bane på kortet skal bruge to slags oplysninger, og de ligger to forskellige steder:
//  1) HVOR banen går på kortet (dens linjer – i koden kaldet "segmenter").
//     Ligger i Firebase "kortbaner" og rettes i admin under fanen "Kort".
//     Er "kortbaner" tom, bruges den gamle fil public/popup.json i stedet.
//  2) HVAD der står om banen (navn, beskrivelse, sværhedsgrad, krav, fakta).
//     Ligger i Firebase "baner" – præcis det samme, som forsidens banekort viser.
// Til sidst sættes de to sammen, ved at vi parrer dem på banens id (fx 'bane-6').
// Så viser popup'en på kortet altid det samme som forsiden.

import { hentBaner } from '@/services/baner.js'
import { KORTBANER_URL } from '@/services/api.js'
import { lavStier, somListe } from '@/utils/kortStier.js'

// Henter banernes linjer fra Firebase "kortbaner". Giver en tom liste, hvis der intet ligger.
// signal = gør det muligt at afbryde hentningen (fx hvis man forlader siden)
// cache: 'no-store' = hent altid den nyeste udgave, ikke en gammel gemt kopi i browseren
export async function hentKortbanerFraFirebase({ signal } = {}) {
  const response = await fetch(`${KORTBANER_URL}.json`, { signal, cache: 'no-store' })
  if (!response.ok) throw new Error(`Fejl ${response.status}`)
  return somListe(await response.json())
}

// Reserven: henter de gamle, faste linjer fra filen public/popup.json
export async function hentKortbanerFraFil({ signal } = {}) {
  // no-store = hent altid den nyeste udgave af filen
  const response = await fetch('/popup.json', { signal, cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`Banedata kunne ikke hentes (HTTP ${response.status}).`)
  }

  const svar = await response.json()

  // Filen kan se ud på flere måder: en liste, { baner: [liste] } eller et objekt.
  // somListe laver det hele om til en almindelig liste
  return somListe(Array.isArray(svar?.baner) ? svar.baner : svar)
}

// HOVEDFUNKTIONEN, som InteraktivtKort.vue kalder. Den:
// 1. henter linjerne (Firebase – eller filen, hvis Firebase fejler eller er tom)
// 2. tjekker, at data ser rigtige ud
// 3. laver stregerne ud fra punkterne
// 4. henter teksterne fra "baner" og sætter dem sammen med linjerne
export async function hentKortbaner({ signal } = {}) {
  // 1. Prøv Firebase først. Fejler det (fx ingen forbindelse), skriver vi fejlen i konsollen
  // og går videre. AbortError = vi har selv afbrudt, så den sendes bare videre
  let geometri = []
  try {
    geometri = await hentKortbanerFraFirebase({ signal })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    console.error('Kortbanerne kunne ikke hentes fra Firebase – bruger popup.json', e)
  }
  // Fik vi ingenting fra Firebase, bruger vi filen
  if (geometri.length === 0) geometri = await hentKortbanerFraFil({ signal })

  if (geometri.length === 0) {
    throw new Error('Der er ingen baner til kortet.')
  }

  // 2. Tjek: hver bane skal have et id, og samme id må ikke findes to gange.
  // Et Set er en liste, hvor hver ting kun kan være én gang – nemt at spørge "har vi set den?"
  const idSet = new Set()
  for (const bane of geometri) {
    if (typeof bane?.id !== 'string') {
      throw new Error('En bane til kortet mangler id.')
    }
    if (idSet.has(bane.id)) throw new Error(`Banen ${bane.id} findes to gange.`)
    idSet.add(bane.id)
  }

  // 3. Lav stregerne. Hver linje tegnes som tre streger (kant, farve, reb – se kortStier.js).
  // Fra Firebase har vi kun de to punkter, så stregerne regnes ud med lavStier.
  // popup.json har stregerne færdige (paths) – så bruges de.
  // Linjer uden streger og uden præcis to punkter er i stykker, så de sorteres fra.
  // Aktiviteter (fx Free Fall og Bounce) har ingen linjer – deres liste er bare tom
  for (const bane of geometri) {
    bane.segmenter = somListe(bane.segmenter)
      .filter((seg) => seg.paths || (Array.isArray(seg.punkter) && seg.punkter.length === 2))
      .map((seg) => ({ ...seg, paths: seg.paths ?? lavStier(seg.punkter) }))
  }

  // 4. Hent teksterne fra Firebase "baner". Fejler det, virker kortet stadig –
  // banerne hedder så bare deres id, indtil siden genindlæses
  let firebaseBaner = []
  try {
    firebaseBaner = await hentBaner()
  } catch (e) {
    console.error('Banernes tekster kunne ikke hentes fra Firebase', e)
  }

  // Sæt linjer og tekster sammen for hver bane (... = kopiér alle felterne ind).
  // "navn" tages fra "baner" (fx "Rød"). Nye baner, der kun findes på kortet,
  // bruger navnet fra kort-admin – og ellers bare id'et
  const baner = geometri.map((geo) => {
    const data = firebaseBaner.find((b) => b.id === geo.id) ?? {}
    return { ...data, ...geo, navn: data.name ?? geo.navn ?? geo.id }
  })

  return { baner }
}
