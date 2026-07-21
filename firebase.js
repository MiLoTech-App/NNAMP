import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCudTauzK8qEJyLUp2yNiwBKevqAADxS1c",
  authDomain: "milotech-app.firebaseapp.com",
  projectId: "milotech-app",
  storageBucket: "milotech-app.firebasestorage.app",
  messagingSenderId: "951244965800",
  appId: "1:951244965800:web:d8fca124df09754af37f9d"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("Firebase initialized successfully");