// VEJR – vejret lige nu ved parken
// Hentes fra Open-Meteo (open-meteo.com): en gratis vejrtjeneste, der ikke kræver login eller nøgle.
// Bruges i hero på forsiden, hvor en badge på wiren viser fx "☀️ 18° i skoven lige nu".

// Parkens placering på kortet (Stærmosegårdsvej 57, Odense)
const BREDDEGRAD = 55.37
const LAENGDEGRAD = 10.43

// Adressen, vi spørger om vejret på. Vi beder om: temperatur, vejrkode, og om det er dag
const VEJR_URL =
  'https://api.open-meteo.com/v1/forecast' +
  `?latitude=${BREDDEGRAD}&longitude=${LAENGDEGRAD}` +
  '&current=temperature_2m,weather_code,is_day&timezone=Europe%2FCopenhagen'

// Vejrtjenesten svarer med et tal (en vejrkode), fx 0 = klart vejr, 61 = regn.
// Her oversættes tallet til et ikon. Om natten vises måne/sky i stedet for sol.
// Listen over koder står på open-meteo.com/en/docs under "Weather variable documentation"
function ikonFor(kode, erDag) {
  if (kode === 0) return erDag ? '☀️' : '🌙' // Klart
  if (kode <= 2) return erDag ? '🌤️' : '☁️' // Let skyet
  if (kode === 3) return '☁️' // Overskyet
  if (kode <= 48) return '🌫️' // Tåge
  if (kode <= 67 || (kode >= 80 && kode <= 82)) return '🌧️' // Støvregn og regn
  if (kode <= 77 || kode === 85 || kode === 86) return '❄️' // Sne
  return '⛈️' // Torden
}

// Henter vejret lige nu og giver fx { ikon: '☀️', grader: 18 }.
// Går noget galt (fx intet internet), gives null – så viser hero bare ikke vejr-badgen
export async function hentVejr() {
  try {
    const res = await fetch(VEJR_URL)
    if (!res.ok) throw new Error(`Fejl ${res.status}`)
    const data = await res.json()
    const nu = data.current // vejret lige nu

    return {
      ikon: ikonFor(nu.weather_code, nu.is_day === 1),
      grader: Math.round(nu.temperature_2m), // rundet til hele grader
    }
  } catch (e) {
    console.error('Vejret kunne ikke hentes', e)
    return null
  }
}
