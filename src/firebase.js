// Importerer funktionen, der forbinder appen med Firebase.
import { initializeApp } from 'firebase/app'

// Importerer funktionen, der giver adgang til Firebase-login.
import { getAuth } from 'firebase/auth'

// Her skal indstillingerne fra din Firebase-webapp stå.
const firebaseConfig = {
  apiKey: "AIzaSyB65DfKsafhswz0Rv8YFRnR8HUYb_6gcCI",
  authDomain: "gomonkey-quiz.firebaseapp.com",
  databaseURL: "https://gomonkey-quiz-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gomonkey-quiz",
  storageBucket: "gomonkey-quiz.firebasestorage.app",
  messagingSenderId: "73714530074",
  appId: "1:73714530074:web:225881332b1de528d7dea3"
};


// Starter forbindelsen med projektets indstillinger.
const firebaseApp = initializeApp(firebaseConfig)

// Gør loginfunktionen tilgængelig for vores andre filer.
export const auth = getAuth(firebaseApp)