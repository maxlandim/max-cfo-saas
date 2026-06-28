import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// As chaves Web do Firebase são públicas e projetadas para ficar no código do cliente
const firebaseConfig = {
  apiKey: "AIzaSyAsQS2b0oYMHJ_BExiXH0xgD49j68pwZ6M",
  authDomain: "max-cfo-saas.firebaseapp.com",
  projectId: "max-cfo-saas",
  storageBucket: "max-cfo-saas.firebasestorage.app",
  messagingSenderId: "540842208218",
  appId: "1:540842208218:web:f932a5696b41450d322ee3"
};

// Evita crash durante o SSR ou no Cliente se as variáveis estiverem vazias
let app;
try {
  if (!getApps().length) {
    if (firebaseConfig.apiKey) {
      app = initializeApp(firebaseConfig);
    }
  } else {
    app = getApp();
  }
} catch (error) {
  console.error("Erro ao inicializar Firebase:", error);
}

export const auth = app ? getAuth(app) : null;
export const googleProvider = (app && typeof window !== 'undefined') ? new GoogleAuthProvider() : null;
