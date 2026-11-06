// Monitoramento de segurança: conta, por dia, os eventos suspeitos (sem guardar IP, e-mail nem dados da empresa)
// em seguranca/{AAAA-MM-DD}. O painel do administrador mostra os últimos dias e a rotina diária manda um alerta
// por e-mail quando algum número passa do normal (src/app/api/seguranca/route.js).
import { createHash, timingSafeEqual } from 'crypto';
import { getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Não importa firebaseAdmin.js para não criar dependência circular (firebaseAdmin usa este arquivo).
const banco = () => (getApps().length ? getFirestore(getApps()[0]) : null);

export const TIPOS_EVENTO = {
  tokenInvalido: 'Login inválido ou vencido nas rotas da API',
  adminNegado: 'Tentativa de abrir a área do administrador sem ser administrador',
  cronNegado: 'Chamada da rotina diária sem a senha (CRON_SECRET)',
  webhookNegado: 'Webhook de pagamento com token errado',
  limite: 'Limite de uso atingido (muitas chamadas seguidas)',
  acessoNegado: 'Tentativa de mexer em empresa de outra conta',
  contaExcluida: 'Conta excluída pelo próprio cliente',
};

// Quantas vezes por dia cada tipo pode acontecer antes de virar alerta
export const ALERTA_ACIMA_DE = {
  tokenInvalido: 200, adminNegado: 5, cronNegado: 5, webhookNegado: 5, limite: 50, acessoNegado: 20, contaExcluida: 10,
};

function hoje() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// Em um ataque, milhares de eventos viram poucas gravações: soma na memória e grava a cada 5 s.
const pendentes = {};
let ultimaGravacao = 0;

export function registrarEvento(tipo) {
  if (!TIPOS_EVENTO[tipo]) return;
  pendentes[tipo] = (pendentes[tipo] || 0) + 1;
  if (Date.now() - ultimaGravacao < 5000) return;
  ultimaGravacao = Date.now();
  const db = banco();
  if (!db) return;
  const somas = {};
  let total = 0;
  for (const [k, n] of Object.entries(pendentes)) { somas[k] = FieldValue.increment(n); total += n; delete pendentes[k]; }
  db.collection('seguranca').doc(hoje()).set({ dia: hoje(), tipos: somas, total: FieldValue.increment(total), ultimaVez: new Date().toISOString() }, { merge: true })
    .catch((e) => console.warn('Registro de segurança:', e.message));
}

// Compara segredos em tempo constante (não deixa descobrir o segredo pelo tempo de resposta)
export function iguais(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

// Rotas da rotina diária: "Authorization: Bearer <CRON_SECRET>" (a Vercel manda assim) ou ?chave= (Coolify antigo)
export function cronAutorizado(req) {
  const segredo = process.env.CRON_SECRET || '';
  const h = req.headers.get('authorization') || '';
  const dado = h.startsWith('Bearer ') ? h.slice(7) : new URL(req.url).searchParams.get('chave') || '';
  const ok = iguais(dado, segredo);
  if (!ok) registrarEvento('cronNegado');
  return ok;
}
