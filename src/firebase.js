// FIREBASE – forbindelsen til vores Firebase-projekt
// Firebase er den online tjeneste, hvor vores database og login ligger.
// Filen bruges KUN til login (i admin). Data hentes med almindelig fetch (se services/api.js).

// Funktionen, der forbinder appen med Firebase
import { initializeApp } from 'firebase/app'

// Funktionen, der giver adgang til Firebase-login
import { getAuth } from 'firebase/auth'

// Projektets indstillinger, kopieret fra Firebase-hjemmesiden.
// Det er IKKE en hemmelig kode – den fortæller bare, hvilket projekt vi forbinder til.
// Det er reglerne i databasen, der bestemmer, hvem der må gemme noget
const firebaseConfig = {
  apiKey: "AIzaSyDMnisSSwIUsSZl6tXNM6bhFSZ2tdDP7JA",
  authDomain: "gomonkey-baner.firebaseapp.com",
  databaseURL: "https://gomonkey-baner-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gomonkey-baner",
  storageBucket: "gomonkey-baner.firebasestorage.app",
  messagingSenderId: "603732478138",
  appId: "1:603732478138:web:6acca55c1b663705b11a83",
};


// Start forbindelsen med indstillingerne ovenfor
const firebaseApp = initializeApp(firebaseConfig)

// "auth" er login-delen. Den eksporteres, så AdminView kan logge ind,
// og api.js kan hente beviset (token) på, at man er logget ind
export const auth = getAuth(firebaseApp)
