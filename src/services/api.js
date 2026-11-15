// Samlet sted for alle databaseadresser, så de kun står ét sted.
// Ændrer adressen sig (fx hvis databaserne samles), rettes det kun her.

// Firebase-loginforbindelsen fra vores egen fil
import { auth } from '../firebase'

const BANER_DB = 'https://gomonkey-baner-default-rtdb.europe-west1.firebasedatabase.app'

// ".json" sætter vi på, når adressen bruges
export const BANER_URL = `${BANER_DB}/baner`
export const KORTBANER_URL = `${BANER_DB}/kortbaner`
export const KORTFILTER_URL = `${BANER_DB}/mapfilter`
export const SPOERGSMAAL_URL = `${BANER_DB}/spoergsmaal`
export const GRAENSER_URL = `${BANER_DB}/baneGraenser`

// Link til booking. Bruges af alle "Book"-knapper (hero, banner, quiz).
// RET her, når I får en direkte bookingside – så skifter alle knapperne
export const BOOK_URL = 'https://gomonkey.dk'

// Henter loginbeviset (token), som databasen bruger til at tjekke reglerne.
// Kræver, at brugeren er logget ind
export async function hentToken() {
  return await auth.currentUser.getIdToken()
}