// Forbinder hjemmesiden med vores Firebase-projekt. Bruges kun til login i admin

import { initializeApp } from 'firebase/app'

import { getAuth } from 'firebase/auth'

// Projektets indstillinger fra Firebase. Det er ikke en hemmelig kode –
// det er databasens regler, der bestemmer, hvem der må gemme
const firebaseConfig = {
  apiKey: "AIzaSyDMnisSSwIUsSZl6tXNM6bhFSZ2tdDP7JA",
  authDomain: "gomonkey-baner.firebaseapp.com",
  databaseURL: "https://gomonkey-baner-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gomonkey-baner",
  storageBucket: "gomonkey-baner.firebasestorage.app",
  messagingSenderId: "603732478138",
  appId: "1:603732478138:web:6acca55c1b663705b11a83",
};


// Starter forbindelsen
const firebaseApp = initializeApp(firebaseConfig)

// Login-delen, som AdminView og api.js bruger
export const auth = getAuth(firebaseApp)
