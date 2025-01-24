// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyB3hjxlqNBHfM88l9Twt7ovLhdIpkDOuOY",
    authDomain: "project-sia-43a92.firebaseapp.com",
    projectId: "project-sia-43a92",
    storageBucket: "project-sia-43a92.firebasestorage.app",
    messagingSenderId: "281570105099",
    appId: "1:281570105099:web:cda15a4d5b1e2a104c340e",
    measurementId: "G-NGTYZ27NF4"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);