// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDgpI9Qn8Z_gvz9lruhq5VmZ8frEUlNKN4",
  authDomain: "disaster-map-platform.firebaseapp.com",
  projectId: "disaster-map-platform",
  storageBucket: "disaster-map-platform.firebasestorage.app",
  messagingSenderId: "741032743359",
  appId: "1:741032743359:web:bbe517d850e766e6ed910a",
};

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);