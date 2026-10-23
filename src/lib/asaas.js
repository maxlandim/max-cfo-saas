// Cliente da API do Asaas (pagamentos: cartão recorrente, Pix e boleto).
// Variáveis no servidor:
//   ASAAS_API_KEY        chave da API (produção começa com $aact_prod_, sandbox com $aact_hmlg_)
//   ASAAS_WEBHOOK_TOKEN  o mesmo "token de autenticação" cadastrado no webhook do Asaas
// O ambiente (sandbox ou produção) sai do prefixo da chave.

function chave() {
  let k = (process.env.ASAAS_API_KEY || '').trim();
  // Alguns painéis "comem" o $ do começo da chave; devolvemos ele
  if (k && k.startsWith('aact_')) k = '$' + k;
  return k;
}

export const asaasConfigurado = () => Boolean(chave());
export const asaasSandbox = () => chave().startsWith('$aact_hmlg_');
const base = () => (asaasSandbox() ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3');
export const linkCheckout = (id) => `${asaasSandbox() ? 'https://sandbox.asaas.com' : 'https://asaas.com'}/checkoutSession/show?id=${encodeURIComponent(id)}`;

export class ErroAsaas extends Error {
  constructor(status, corpo) {
    const msg = (corpo && corpo.errors && corpo.errors.map((e) => e.description).join(' ')) || `Asaas ${status}`;
    super(msg);
    this.status = status;
    this.corpo = corpo;
  }
}

export async function asaas(metodo, caminho, corpo) {
  const r = await fetch(base() + caminho, {
    method: metodo,
    headers: { access_token: chave(), 'Content-Type': 'application/json', 'User-Agent': 'LandimAdvisory/1.0' },
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: 'no-store',
  });
  const texto = await r.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = { texto }; }
  if (!r.ok) throw new ErroAsaas(r.status, dados);
  return dados;
}

// Referência gravada na assinatura do Asaas: "uid|plano|periodo|f" (f = 1 para preço de fundador)
export const montarRef = ({ uid, planId, periodo, fundador }) => [uid, planId, periodo, fundador ? '1' : '0'].join('|');
export function lerRef(ref) {
  const [uid, planId, periodo, f] = String(ref || '').split('|');
  if (!uid || !planId) return null;
  return { uid, planId, periodo: periodo === 'anual' ? 'anual' : 'mensal', fundador: f === '1' };
}

// Data no fuso de Brasília no formato que o Asaas usa (AAAA-MM-DD)
export const dataAsaas = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
// Meio-dia de Brasília da data AAAA-MM-DD (evita erro de fuso ao somar meses)
export const msDaData = (d) => Date.parse(String(d).slice(0, 10) + 'T12:00:00-03:00');

export function soDigitos(v) { return String(v || '').replace(/\D/g, ''); }

export function cpfValido(c) {
  c = soDigitos(c);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

export function cnpjValido(c) {
  c = soDigitos(c);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (n) => { const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * pesos[i]; const r = s % 11; return r < 2 ? 0 : 11 - r; };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

export const documentoValido = (d) => cpfValido(d) || cnpjValido(d);
