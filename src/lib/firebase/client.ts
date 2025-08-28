
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "sativar-ai-chat",
  appId: "1:169108867546:web:1e2e54d521d5c61c9b18e3",
  storageBucket: "sativar-ai-chat.firebasestorage.app",
  apiKey: "AIzaSyAzS1jRU9Sus8d0DHskwhPhd4rSS-HUqtE",
  authDomain: "sativar-ai-chat.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "169108867546"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { app, db, storage, auth };
