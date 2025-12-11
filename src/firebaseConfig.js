// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
const firebaseConfig = {
  apiKey: "AIzaSyDEttheiXvrEntggpCq60VosPzsoJ3CyI0",
  authDomain: "valdicass-estimates-69b4d.firebaseapp.com",
  projectId: "valdicass-estimates-69b4d",
  storageBucket: "valdicass-estimates-69b4d.firebasestorage.app",
  messagingSenderId: "719999568330",
  appId: "1:719999568330:web:dd328bbf3976076db7a733"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

