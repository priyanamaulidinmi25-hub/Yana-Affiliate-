/**
 * YANA AFFILIATE - FIREBASE CONFIGURATION & INITIALIZATION
 * Firebase Web SDK v10 (Modular - Firestore & Auth Only)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Konfigurasi Firebase Proyek Yana Affiliate
export const firebaseConfig = {
  apiKey: "AIzaSyAayVc5fKFiQZ8rReIMxw9ippVcZmq0dAk",
  authDomain: "yana-affiliate.firebaseapp.com",
  projectId: "yana-affiliate",
  storageBucket: "yana-affiliate.firebasestorage.app",
  messagingSenderId: "513101788336",
  appId: "1:513101788336:web:e4d6f784c23490cf40f775",
  measurementId: "G-GPZZR2G9YY"
};

export const isFirebasePlaceholder = false;

// Inisialisasi Firebase App, Firestore, & Auth
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
