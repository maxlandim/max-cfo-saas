// Anexos dos lançamentos (boleto, recibo, nota de outro sistema) guardados no próprio servidor.
// Pasta: ANEXOS_DIR (no Coolify, um volume persistente em /data/anexos). Cada empresa tem a sua subpasta.
// O link de cada arquivo leva uma assinatura (HMAC) que só o servidor sabe gerar: quem não tem o link não abre o arquivo.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export const LIMITE_ANEXO = 10 * 1024 * 1024;
const TIPOS = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  heic: 'image/heic', heif: 'image/heif', xml: 'application/xml', csv: 'text/csv', txt: 'text/plain', ofx: 'application/x-ofx',
};
// Só PDF e imagem abrem direto no navegador; o resto é baixado (evita conteúdo ativo no domínio do site).
const ABRE_NO_NAVEGADOR = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif']);

export class ErroAnexo extends Error {
  constructor(msg, status = 400) { super(msg); this.status = status; }
}

export function pastaDosAnexos() {
  return path.resolve(process.env.ANEXOS_DIR || '/data/anexos');
}

function segredo() {
  const base = process.env.CHAVE_CRIPTO || process.env.FIREBASE_SERVICE_ACCOUNT || '';
  if (!base) throw new ErroAnexo('Servidor sem segredo configurado para os anexos.', 503);
  return createHash('sha256').update('landim-anexos-v1|' + base).digest();
}

export function assinatura(wsId, arquivo) {
  return createHmac('sha256', segredo()).update(wsId + '/' + arquivo).digest('base64url').slice(0, 32);
}

function confere(wsId, arquivo, t) {
  const certo = Buffer.from(assinatura(wsId, arquivo));
  const veio = Buffer.from(String(t || ''));
  return certo.length === veio.length && timingSafeEqual(certo, veio);
}

const WS_OK = /^[\w-]{6,80}$/;
const ARQ_OK = /^\d{13}_[a-f0-9]{16}_[\w.-]{1,80}\.[a-z0-9]{2,5}$/;

export function extensao(nome) {
  const m = /\.([a-z0-9]{2,5})$/i.exec(String(nome || ''));
  return m ? m[1].toLowerCase() : '';
}

// Nome do arquivo sem acentos, espaços ou caracteres que mexam no caminho
export function nomeSeguro(nome) {
  const ext = extensao(nome);
  const base = String(nome || 'anexo').replace(/\.[^.]*$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.-]+/g, '-').replace(/^[.-]+|[.-]+$/g, '').slice(0, 80) || 'anexo';
  return base + '.' + ext;
}

export function urlDoAnexo(wsId, arquivo) {
  return '/api/anexos?ws=' + encodeURIComponent(wsId) + '&f=' + encodeURIComponent(arquivo) + '&t=' + assinatura(wsId, arquivo);
}

export async function salvarAnexo(wsId, nome, dados) {
  if (!WS_OK.test(wsId)) throw new ErroAnexo('Empresa inválida.');
  const ext = extensao(nome);
  if (!TIPOS[ext]) throw new ErroAnexo('Tipo de arquivo não aceito. Envie PDF, imagem, XML, CSV, OFX ou TXT.');
  if (!dados || !dados.length) throw new ErroAnexo('Arquivo vazio.');
  if (dados.length > LIMITE_ANEXO) throw new ErroAnexo('O anexo precisa ter até 10 MB.');
  const arquivo = Date.now() + '_' + randomBytes(8).toString('hex') + '_' + nomeSeguro(nome);
  const pasta = path.join(pastaDosAnexos(), wsId);
  try {
    await fs.mkdir(pasta, { recursive: true });
    await fs.writeFile(path.join(pasta, arquivo), dados, { flag: 'wx' });
  } catch (e) {
    console.error('Anexos: não consegui gravar em', pasta, e && e.code);
    throw new ErroAnexo('O servidor não conseguiu guardar o anexo agora.', 503);
  }
  return { arquivo, url: urlDoAnexo(wsId, arquivo), tamanho: dados.length };
}

export async function lerAnexo(wsId, arquivo, t) {
  if (!WS_OK.test(wsId) || !ARQ_OK.test(arquivo) || !confere(wsId, arquivo, t)) throw new ErroAnexo('Link de anexo inválido.', 404);
  const caminho = path.join(pastaDosAnexos(), wsId, arquivo);
  if (path.dirname(caminho) !== path.join(pastaDosAnexos(), wsId)) throw new ErroAnexo('Link de anexo inválido.', 404);
  let dados;
  try { dados = await fs.readFile(caminho); } catch { throw new ErroAnexo('Anexo não encontrado.', 404); }
  const ext = extensao(arquivo);
  return { dados, tipo: TIPOS[ext] || 'application/octet-stream', abre: ABRE_NO_NAVEGADOR.has(ext), nome: arquivo.replace(/^\d{13}_[a-f0-9]{16}_/, '') };
}

// Para a página de saúde: a pasta existe e aceita gravação?
export async function pastaGravavel() {
  const p = pastaDosAnexos();
  try {
    await fs.mkdir(p, { recursive: true });
    const teste = path.join(p, '.teste-' + process.pid);
    await fs.writeFile(teste, 'ok'); await fs.unlink(teste);
    return true;
  } catch { return false; }
}
