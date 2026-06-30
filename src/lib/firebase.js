import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAsQS2b0oYMHJ_BExiXH0xgD49j68pwZ6M",
  authDomain: "max-cfo-saas.firebaseapp.com",
  projectId: "max-cfo-saas",
  storageBucket: "max-cfo-saas.firebasestorage.app",
  messagingSenderId: "540842208218",
  appId: "1:540842208218:web:f932a5696b41450d322ee3"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };
