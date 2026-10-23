// Criptografia simétrica (AES-256-GCM) para guardar chaves de API de clientes no Firestore.
// A chave sai de CHAVE_CRIPTO ou, se não existir, da conta de serviço do Firebase (segredo que só o servidor tem).
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function chave() {
  const base = process.env.CHAVE_CRIPTO || process.env.FIREBASE_SERVICE_ACCOUNT || '';
  if (!base) throw new Error('Sem segredo para criptografia');
  return createHash('sha256').update('landim-cripto-v1|' + base).digest();
}

export function cifrar(texto) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chave(), iv);
  const dados = Buffer.concat([c.update(String(texto), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), dados].map((b) => b.toString('base64')).join('.');
}

export function decifrar(pacote) {
  const [iv, tag, dados] = String(pacote || '').split('.').map((p) => Buffer.from(p, 'base64'));
  const d = createDecipheriv('aes-256-gcm', chave(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dados), d.final()]).toString('utf8');
}
