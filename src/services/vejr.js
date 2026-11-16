// VEJR – det aktuelle vejr ved parken
// Hentes fra Open-Meteo (open-meteo.com): en gratis vejrtjeneste, der ikke kræver konto eller nøgle.
// Bruges i hero, hvor badgen på wiren viser fx "☀️ 18° i skoven lige nu".

// Parkens placering: Stærmosegårdsvej 57, Odense (ved Rosengårdscentret)
const BREDDEGRAD = 55.37
const LAENGDEGRAD = 10.43

const VEJR_URL =
  'https://api.open-meteo.com/v1/forecast' +
  `?latitude=${BREDDEGRAD}&longitude=${LAENGDEGRAD}` +
  '&current=temperature_2m,weather_code,is_day&timezone=Europe%2FCopenhagen'

// Oversætter vejrkoden (WMO-kode) til et ikon.
// Koderne er beskrevet på open-meteo.com/en/docs under "Weather variable documentation"
function ikonFor(kode, erDag) {
  if (kode === 0) return erDag ? '☀️' : '🌙' // Klart
  if (kode <= 2) return erDag ? '🌤️' : '☁️' // Let skyet
  if (kode === 3) return '☁️' // Overskyet
  if (kode <= 48) return '🌫️' // Tåge
  if (kode <= 67 || (kode >= 80 && kode <= 82)) return '🌧️' // Støvregn og regn
  if (kode <= 77 || kode === 85 || kode === 86) return '❄️' // Sne
  return '⛈️' // Torden
}

// Henter vejret lige nu. Giver fx { ikon: '☀️', grader: 18 }.
// Fejler noget (fx ingen internet), gives null – så viser badgen bare sin almindelige tekst
export async function hentVejr() {
  try {
    const res = await fetch(VEJR_URL)
    if (!res.ok) throw new Error(`Fejl ${res.status}`)
    const data = await res.json()
    const nu = data.current

    return {
      ikon: ikonFor(nu.weather_code, nu.is_day === 1),
      grader: Math.round(nu.temperature_2m),
    }
  } catch (e) {
    console.error('Vejret kunne ikke hentes', e)
    return null
  }
}
