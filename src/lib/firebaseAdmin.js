// Firebase no servidor (rotas /api). Usa a conta de serviço guardada na variável
// FIREBASE_SERVICE_ACCOUNT (o JSON baixado no console do Firebase, inteiro ou em base64).
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function lerContaDeServico() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const sa = JSON.parse(json);
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    return sa;
  } catch (e) {
    console.error('FIREBASE_SERVICE_ACCOUNT inválida:', e.message);
    return null;
  }
}

let adminApp = null;
const conta = lerContaDeServico();
if (conta) {
  adminApp = getApps().length ? getApps()[0] : initializeApp({ credential: cert(conta) });
}

export const adminConfigurado = Boolean(adminApp);
export const adminAuth = adminApp ? getAuth(adminApp) : null;
export const adminDb = adminApp ? getFirestore(adminApp) : null;

// Lê o "Authorization: Bearer <token>" e devolve o usuário do Firebase, ou null.
export async function usuarioDaRequisicao(req) {
  if (!adminAuth) return null;
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

export function emailsAdmin() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// Contas de cortesia: acesso completo (plano Escritório) sem pagar, sem acesso ao painel do administrador.
// CORTESIA_EMAILS = e-mails separados por vírgula
export function emailsCortesia() {
  return (process.env.CORTESIA_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
