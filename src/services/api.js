// Alle adresserne til databasen samlet ét sted, så de kun skal rettes her

// Login-forbindelsen fra src/firebase.js
import { auth } from '../firebase'

const BANER_DB = 'https://gomonkey-baner-default-rtdb.europe-west1.firebasedatabase.app'

// Databasens "mapper". ".json" sættes på, når adressen bruges
export const BANER_URL = `${BANER_DB}/baner`            // banerne: navn, beskrivelse, fakta
export const KORTBANER_URL = `${BANER_DB}/kortbaner`    // hvor banerne går på kortet
export const KORTFILTER_URL = `${BANER_DB}/mapfilter`   // teksterne i kortfiltret
export const SPOERGSMAAL_URL = `${BANER_DB}/spoergsmaal` // quizzens spørgsmål

// Linket til booking, som alle "Book"-knapper bruger
export const BOOK_URL = 'https://gomonkey.dk'

// Henter beviset (token) på, at man er logget ind. Det sendes med, når admin gemmer
export async function hentToken() {
  return await auth.currentUser.getIdToken()
}
