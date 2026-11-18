// API – alle adresser til databasen samlet ét sted
// Skal en adresse ændres, rettes den kun her – så følger alle filer, der bruger den, med.

// Login-forbindelsen fra vores egen fil (src/firebase.js)
import { auth } from '../firebase'

// Adressen på vores database i Firebase
const BANER_DB = 'https://gomonkey-baner-default-rtdb.europe-west1.firebasedatabase.app'

// De fire "mapper" i databasen. ".json" sættes på, når adressen bruges, fx `${BANER_URL}.json`
export const BANER_URL = `${BANER_DB}/baner`            // banerne: navn, beskrivelse, fakta
export const KORTBANER_URL = `${BANER_DB}/kortbaner`    // hvor banerne går på kortet
export const KORTFILTER_URL = `${BANER_DB}/mapfilter`   // teksterne i kortfiltret
export const SPOERGSMAAL_URL = `${BANER_DB}/spoergsmaal` // quizzens spørgsmål

// Linket til booking. Bruges af alle "Book"-knapper (hero, banner, header, quiz).
// Ret det her, når I får en rigtig bookingside – så skifter alle knapperne på én gang
export const BOOK_URL = 'https://gomonkey.dk'

// Henter "adgangskortet" (token): et bevis på, at man er logget ind.
// Det sendes med, når admin gemmer noget, og databasens regler tjekker det.
// Virker kun, når man er logget ind
export async function hentToken() {
  return await auth.currentUser.getIdToken()
}
