// Firebase no navegador: login e banco (Firestore). O Storage (anexos) é carregado só quando usado.
// As chaves Web do Firebase são públicas por natureza; a proteção dos dados vem das
// regras em firestore.rules e storage.rules.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
// Firestore "lite": cada leitura/gravação é uma chamada HTTPS comum. A versão completa abre um canal
// de streaming que antivírus e proxies costumam travar (o painel ficava minutos carregando).
import { getFirestore } from 'firebase/firestore/lite';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAsQS2b0oYMHJ_BExiXH0xgD49j68pwZ6M',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'max-cfo-saas.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'max-cfo-saas',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'max-cfo-saas.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '540842208218',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:540842208218:web:f932a5696b41450d322ee3',
};

let app = null;
try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
} catch (error) {
  console.error('Erro ao inicializar o Firebase:', error);
}

export { app };
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const googleProvider = app && typeof window !== 'undefined' ? new GoogleAuthProvider() : null;

// Token de sessão para chamar as rotas /api do próprio site.
export async function getIdToken() {
  const u = auth?.currentUser;
  return u ? u.getIdToken() : null;
}

export async function authFetch(url, options = {}) {
  const token = await getIdToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}
