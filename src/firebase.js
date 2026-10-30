// Importerer funktionen, der forbinder appen med Firebase.
import { initializeApp } from 'firebase/app'

// Importerer funktionen, der giver adgang til Firebase-login.
import { getAuth } from 'firebase/auth'

// Her skal indstillingerne fra din Firebase-webapp stå.
const firebaseConfig = {
  apiKey: "AIzaSyDMnisSSwIUsSZl6tXNM6bhFSZ2tdDP7JA",
  authDomain: "gomonkey-baner.firebaseapp.com",
  databaseURL: "https://gomonkey-baner-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gomonkey-baner",
  storageBucket: "gomonkey-baner.firebasestorage.app",
  messagingSenderId: "603732478138",
  appId: "1:603732478138:web:6acca55c1b663705b11a83",
};


// Starter forbindelsen med projektets indstillinger.
const firebaseApp = initializeApp(firebaseConfig)

// Gør loginfunktionen tilgængelig for vores andre filer.
export const auth = getAuth(firebaseApp)