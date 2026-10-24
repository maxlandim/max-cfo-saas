// Leitura do certificado digital A1 (.pfx/.p12, PKCS#12) só com o módulo crypto do Node.
// Aceita os formatos modernos (PBES2 com AES) e os antigos ainda comuns em certificados ICP-Brasil
// (3DES e RC2 com a derivação de chave do PKCS#12), que o OpenSSL 3 não abre sem o provedor "legacy".
// Devolve a chave privada e o certificado em PEM (para assinar e para o TLS mútuo) e os dados do titular.
import crypto from 'crypto';

// ---------- ASN.1 (DER, aceitando também o comprimento indefinido do BER) ----------
function lerNo(buf, pos) {
  const inicio = pos;
  const tag = buf[pos++];
  let len = buf[pos++];
  let indefinido = false;
  if (len === 0x80) { indefinido = true; len = -1; }
  else if (len & 0x80) {
    const n = len & 0x7f;
    if (n > 4) throw new Error('ASN.1 inválido');
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + buf[pos++];
  }
  const construido = (tag & 0x20) !== 0;
  const no = { tag, classe: tag >> 6, numero: tag & 0x1f, construido, filhos: [], inicio };
  if (indefinido) {
    if (!construido) throw new Error('ASN.1 inválido');
    while (!(buf[pos] === 0 && buf[pos + 1] === 0)) {
      const f = lerNo(buf, pos);
      no.filhos.push(f);
      pos = f.fim;
    }
    no.fim = pos + 2;
    no.valor = null;
    return no;
  }
  const fimConteudo = pos + len;
  if (fimConteudo > buf.length) throw new Error('ASN.1 truncado');
  no.valor = buf.subarray(pos, fimConteudo);
  no.fim = fimConteudo;
  no.der = buf.subarray(inicio, fimConteudo);
  if (construido) {
    let p = pos;
    while (p < fimConteudo) {
      const f = lerNo(buf, p);
      no.filhos.push(f);
      p = f.fim;
    }
  }
  return no;
}
export const asn1 = (buf) => lerNo(buf, 0);

function oid(no) {
  const b = no.valor;
  const partes = [Math.floor(b[0] / 40), b[0] % 40];
  let v = 0;
  for (let i = 1; i < b.length; i++) {
    v = v * 128 + (b[i] & 0x7f);
    if (!(b[i] & 0x80)) { partes.push(v); v = 0; }
  }
  return partes.join('.');
}
// OCTET STRING primitiva ou construída (BER): junta os pedaços
function octetos(no) {
  if (!no.construido) return Buffer.from(no.valor);
  return Buffer.concat(no.filhos.map(octetos));
}
function inteiro(no) {
  let v = 0;
  for (const x of no.valor) v = v * 256 + x;
  return v;
}
const explicito = (no) => no.filhos[0]; // [0] EXPLICIT

// ---------- Derivação de chave do PKCS#12 (RFC 7292, apêndice B) ----------
function senhaBMP(senha) {
  if (senha == null) return Buffer.alloc(0);
  const b = Buffer.alloc((senha.length + 1) * 2);
  for (let i = 0; i < senha.length; i++) b.writeUInt16BE(senha.charCodeAt(i), i * 2);
  return b; // termina com dois bytes zero
}
function kdfPkcs12(senha, sal, iteracoes, id, n, hash = 'sha1') {
  const u = crypto.createHash(hash).digest().length;
  const v = hash === 'sha512' || hash === 'sha384' ? 128 : 64;
  const P0 = senhaBMP(senha);
  const repetir = (b) => {
    if (!b.length) return Buffer.alloc(0);
    const t = v * Math.ceil(b.length / v);
    const r = Buffer.alloc(t);
    for (let i = 0; i < t; i++) r[i] = b[i % b.length];
    return r;
  };
  const D = Buffer.alloc(v, id);
  const I = Buffer.concat([repetir(sal), repetir(P0)]);
  const saida = [];
  let total = 0;
  while (total < n) {
    let A = crypto.createHash(hash).update(D).update(I).digest();
    for (let i = 1; i < iteracoes; i++) A = crypto.createHash(hash).update(A).digest();
    saida.push(A);
    total += A.length;
    if (total >= n) break;
    const B = Buffer.alloc(v);
    for (let i = 0; i < v; i++) B[i] = A[i % u];
    for (let j = 0; j < I.length; j += v) {
      let carry = 1;
      for (let k = v - 1; k >= 0; k--) {
        const s = I[j + k] + B[k] + carry;
        I[j + k] = s & 0xff;
        carry = s >> 8;
      }
    }
  }
  return Buffer.concat(saida).subarray(0, n);
}

// ---------- RC2 (RFC 2268), só a decifragem em CBC ----------
// Tabela PITABLE do RFC 2268
const PI = Uint8Array.from([
  0xd9, 0x78, 0xf9, 0xc4, 0x19, 0xdd, 0xb5, 0xed, 0x28, 0xe9, 0xfd, 0x79, 0x4a, 0xa0, 0xd8, 0x9d,
  0xc6, 0x7e, 0x37, 0x83, 0x2b, 0x76, 0x53, 0x8e, 0x62, 0x4c, 0x64, 0x88, 0x44, 0x8b, 0xfb, 0xa2,
  0x17, 0x9a, 0x59, 0xf5, 0x87, 0xb3, 0x4f, 0x13, 0x61, 0x45, 0x6d, 0x8d, 0x09, 0x81, 0x7d, 0x32,
  0xbd, 0x8f, 0x40, 0xeb, 0x86, 0xb7, 0x7b, 0x0b, 0xf0, 0x95, 0x21, 0x22, 0x5c, 0x6b, 0x4e, 0x82,
  0x54, 0xd6, 0x65, 0x93, 0xce, 0x60, 0xb2, 0x1c, 0x73, 0x56, 0xc0, 0x14, 0xa7, 0x8c, 0xf1, 0xdc,
  0x12, 0x75, 0xca, 0x1f, 0x3b, 0xbe, 0xe4, 0xd1, 0x42, 0x3d, 0xd4, 0x30, 0xa3, 0x3c, 0xb6, 0x26,
  0x6f, 0xbf, 0x0e, 0xda, 0x46, 0x69, 0x07, 0x57, 0x27, 0xf2, 0x1d, 0x9b, 0xbc, 0x94, 0x43, 0x03,
  0xf8, 0x11, 0xc7, 0xf6, 0x90, 0xef, 0x3e, 0xe7, 0x06, 0xc3, 0xd5, 0x2f, 0xc8, 0x66, 0x1e, 0xd7,
  0x08, 0xe8, 0xea, 0xde, 0x80, 0x52, 0xee, 0xf7, 0x84, 0xaa, 0x72, 0xac, 0x35, 0x4d, 0x6a, 0x2a,
  0x96, 0x1a, 0xd2, 0x71, 0x5a, 0x15, 0x49, 0x74, 0x4b, 0x9f, 0xd0, 0x5e, 0x04, 0x18, 0xa4, 0xec,
  0xc2, 0xe0, 0x41, 0x6e, 0x0f, 0x51, 0xcb, 0xcc, 0x24, 0x91, 0xaf, 0x50, 0xa1, 0xf4, 0x70, 0x39,
  0x99, 0x7c, 0x3a, 0x85, 0x23, 0xb8, 0xb4, 0x7a, 0xfc, 0x02, 0x36, 0x5b, 0x25, 0x55, 0x97, 0x31,
  0x2d, 0x5d, 0xfa, 0x98, 0xe3, 0x8a, 0x92, 0xae, 0x05, 0xdf, 0x29, 0x10, 0x67, 0x6c, 0xba, 0xc9,
  0xd3, 0x00, 0xe6, 0xcf, 0xe1, 0x9e, 0xa8, 0x2c, 0x63, 0x16, 0x01, 0x3f, 0x58, 0xe2, 0x89, 0xa9,
  0x0d, 0x38, 0x34, 0x1b, 0xab, 0x33, 0xff, 0xb0, 0xbb, 0x48, 0x0c, 0x5f, 0xb9, 0xb1, 0xcd, 0x2e,
  0xc5, 0xf3, 0xdb, 0x47, 0xe5, 0xa5, 0x9c, 0x77, 0x0a, 0xa6, 0x20, 0x68, 0xfe, 0x7f, 0xc1, 0xad,
]);

function rc2Chave(chave, bitsEfetivos) {
  const L = new Uint8Array(128);
  const T = chave.length;
  for (let i = 0; i < T; i++) L[i] = chave[i];
  for (let i = T; i < 128; i++) L[i] = PI[(L[i - 1] + L[i - T]) & 0xff];
  const T8 = (bitsEfetivos + 7) >> 3;
  const TM = 0xff >> (8 * T8 - bitsEfetivos);
  L[128 - T8] = PI[L[128 - T8] & TM];
  for (let i = 127 - T8; i >= 0; i--) L[i] = PI[L[i + 1] ^ L[i + T8]];
  const K = new Uint16Array(64);
  for (let i = 0; i < 64; i++) K[i] = L[2 * i] | (L[2 * i + 1] << 8);
  return K;
}
const rotr = (x, s) => ((x >> s) | (x << (16 - s))) & 0xffff;
function rc2Bloco(K, b) {
  const R = [b[0] | (b[1] << 8), b[2] | (b[3] << 8), b[4] | (b[5] << 8), b[6] | (b[7] << 8)];
  const S = [1, 2, 3, 5];
  let j = 63;
  const mixR = () => {
    for (let i = 3; i >= 0; i--) {
      R[i] = rotr(R[i], S[i]);
      R[i] = (R[i] - K[j--] - (R[(i + 3) & 3] & R[(i + 2) & 3]) - (~R[(i + 3) & 3] & R[(i + 1) & 3])) & 0xffff;
    }
  };
  const mashR = () => { for (let i = 3; i >= 0; i--) R[i] = (R[i] - K[R[(i + 3) & 3] & 63]) & 0xffff; };
  for (let r = 0; r < 5; r++) mixR();
  mashR();
  for (let r = 0; r < 6; r++) mixR();
  mashR();
  for (let r = 0; r < 5; r++) mixR();
  const out = Buffer.alloc(8);
  for (let i = 0; i < 4; i++) { out[2 * i] = R[i] & 0xff; out[2 * i + 1] = R[i] >> 8; }
  return out;
}
function rc2CbcDecifrar(chave, iv, dados, bits) {
  if (dados.length % 8) throw new Error('Dados RC2 inválidos');
  const K = rc2Chave(chave, bits);
  const saida = Buffer.alloc(dados.length);
  let anterior = iv;
  for (let p = 0; p < dados.length; p += 8) {
    const bloco = dados.subarray(p, p + 8);
    const d = rc2Bloco(K, bloco);
    for (let i = 0; i < 8; i++) saida[p + i] = d[i] ^ anterior[i];
    anterior = bloco;
  }
  return tirarPadding(saida);
}
function tirarPadding(b) {
  const n = b[b.length - 1];
  if (!n || n > 16 || n > b.length) throw new Error('senha');
  for (let i = b.length - n; i < b.length; i++) if (b[i] !== n) throw new Error('senha');
  return b.subarray(0, b.length - n);
}

// ---------- Algoritmos de cifragem usados no PKCS#12 ----------
const PBE_PKCS12 = {
  '1.2.840.113549.1.12.1.3': { cifra: 'des-ede3-cbc', chave: 24, iv: 8 }, // pbeWithSHAAnd3-KeyTripleDES-CBC
  '1.2.840.113549.1.12.1.4': { cifra: 'des-ede-cbc', chave: 16, iv: 8 },
  '1.2.840.113549.1.12.1.5': { rc2: 128, chave: 16, iv: 8 }, // pbeWithSHAAnd128BitRC2-CBC
  '1.2.840.113549.1.12.1.6': { rc2: 40, chave: 5, iv: 8 }, // pbeWithSHAAnd40BitRC2-CBC
};
const CIFRAS_PBES2 = {
  '2.16.840.1.101.3.4.1.2': ['aes-128-cbc', 16],
  '2.16.840.1.101.3.4.1.22': ['aes-192-cbc', 24],
  '2.16.840.1.101.3.4.1.42': ['aes-256-cbc', 32],
  '1.2.840.113549.3.7': ['des-ede3-cbc', 24],
};
const PRF = { '1.2.840.113549.2.7': 'sha1', '1.2.840.113549.2.9': 'sha256', '1.2.840.113549.2.10': 'sha384', '1.2.840.113549.2.11': 'sha512' };

function decifrar(algNo, dados, senha) {
  const alg = oid(algNo.filhos[0]);
  const params = algNo.filhos[1];
  if (PBE_PKCS12[alg]) {
    const p = PBE_PKCS12[alg];
    const sal = octetos(params.filhos[0]);
    const it = inteiro(params.filhos[1]);
    const chave = kdfPkcs12(senha, sal, it, 1, p.chave);
    const iv = kdfPkcs12(senha, sal, it, 2, p.iv);
    if (p.rc2) return rc2CbcDecifrar(chave, iv, dados, p.rc2);
    const d = crypto.createDecipheriv(p.cifra, chave, iv);
    return Buffer.concat([d.update(dados), d.final()]);
  }
  if (alg === '1.2.840.113549.1.5.13') { // PBES2
    const kdf = params.filhos[0];
    const esquema = params.filhos[1];
    if (oid(kdf.filhos[0]) !== '1.2.840.113549.1.5.12') throw new Error('Derivação de chave não suportada');
    const kp = kdf.filhos[1].filhos;
    const sal = octetos(kp[0]);
    const it = inteiro(kp[1]);
    let prf = 'sha1';
    for (const x of kp.slice(2)) if (x.tag === 0x30) prf = PRF[oid(x.filhos[0])] || 'sha1';
    const [cifra, tam] = CIFRAS_PBES2[oid(esquema.filhos[0])] || [];
    if (!cifra) throw new Error('Cifra do certificado não suportada');
    const iv = octetos(esquema.filhos[1]);
    const chave = crypto.pbkdf2Sync(Buffer.from(senha || '', 'utf8'), sal, it, tam, prf);
    const d = crypto.createDecipheriv(cifra, chave, iv);
    return Buffer.concat([d.update(dados), d.final()]);
  }
  throw new Error('Formato de certificado não suportado (' + alg + ')');
}

// ---------- Leitura do arquivo ----------
const OID_DATA = '1.2.840.113549.1.7.1';
const OID_CIFRADO = '1.2.840.113549.1.7.6';
const BAG_CHAVE = '1.2.840.113549.1.12.10.1.1';
const BAG_CHAVE_CIFRADA = '1.2.840.113549.1.12.10.1.2';
const BAG_CERT = '1.2.840.113549.1.12.10.1.3';
const OID_X509 = '1.2.840.113549.1.9.22.1';

export class ErroCertificado extends Error {}

function bagsDe(safeContents, senha, chaves, certs) {
  for (const bag of asn1(safeContents).filhos) {
    const tipo = oid(bag.filhos[0]);
    const valor = explicito(bag.filhos[1]);
    if (tipo === BAG_CHAVE) chaves.push(Buffer.from(valor.der));
    else if (tipo === BAG_CHAVE_CIFRADA) chaves.push(decifrar(valor.filhos[0], octetos(valor.filhos[1]), senha));
    else if (tipo === BAG_CERT && oid(valor.filhos[0]) === OID_X509) certs.push(octetos(explicito(valor.filhos[1])));
  }
}

const HASH_OID = { '1.3.14.3.2.26': 'sha1', '2.16.840.1.101.3.4.2.1': 'sha256', '2.16.840.1.101.3.4.2.2': 'sha384', '2.16.840.1.101.3.4.2.3': 'sha512' };
// Confere o MAC do arquivo: é o jeito seguro de saber se a senha está certa antes de decifrar
function macConfere(raiz, conteudo, senha) {
  const mac = raiz.filhos[2];
  if (!mac) return true;
  const hash = HASH_OID[oid(mac.filhos[0].filhos[0].filhos[0])];
  if (!hash) return true; // algoritmo desconhecido: a decifragem vai dizer
  const esperado = octetos(mac.filhos[0].filhos[1]);
  const sal = octetos(mac.filhos[1]);
  const it = mac.filhos[2] ? inteiro(mac.filhos[2]) : 1;
  const tentativas = senha ? [senha] : ['', null];
  return tentativas.some((s) => {
    const k = kdfPkcs12(s, sal, it, 3, esperado.length, hash);
    const h = crypto.createHmac(hash, k).update(conteudo).digest();
    return h.length === esperado.length && crypto.timingSafeEqual(h, esperado);
  });
}

// Abre o .pfx com a senha. Erro de senha vira ErroCertificado com mensagem clara.
export function abrirPfx(pfx, senha) {
  let raiz;
  try { raiz = asn1(Buffer.from(pfx)); } catch { throw new ErroCertificado('Arquivo inválido: envie o certificado A1 no formato .pfx ou .p12.'); }
  const chaves = [];
  const certs = [];
  try {
    const authSafe = raiz.filhos[1];
    if (oid(authSafe.filhos[0]) !== OID_DATA) throw new ErroCertificado('Certificado com formato não suportado (assinado por chave pública).');
    const bruto = octetos(explicito(authSafe.filhos[1]));
    if (!macConfere(raiz, bruto, senha)) throw new ErroCertificado('Senha do certificado incorreta.');
    const conteudos = asn1(bruto);
    for (const ci of conteudos.filhos) {
      const tipo = oid(ci.filhos[0]);
      if (tipo === OID_DATA) bagsDe(octetos(explicito(ci.filhos[1])), senha, chaves, certs);
      else if (tipo === OID_CIFRADO) {
        const enc = explicito(ci.filhos[1]).filhos[1]; // EncryptedContentInfo
        const dados = octetos(enc.filhos[2]);
        bagsDe(decifrar(enc.filhos[1], dados, senha), senha, chaves, certs);
      }
    }
  } catch (e) {
    if (e instanceof ErroCertificado) throw e;
    if (/senha|bad decrypt|wrong final block|Invalid|ASN|offset|range/i.test(e.message || '')) throw new ErroCertificado('Senha do certificado incorreta.');
    throw new ErroCertificado('Não foi possível abrir o certificado: ' + e.message);
  }
  let chave = null;
  for (const der of chaves) {
    try { chave = crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' }); break; } catch { /* tenta a próxima */ }
  }
  if (!chave) throw new ErroCertificado(chaves.length ? 'Senha do certificado incorreta.' : 'O arquivo não tem a chave privada. Exporte o certificado A1 com a chave privada (.pfx).');
  const x509s = certs.map((d) => new crypto.X509Certificate(d));
  const doTitular = x509s.find((c) => { try { return c.checkPrivateKey(chave); } catch { return false; } });
  if (!doTitular) throw new ErroCertificado('O arquivo não tem o certificado da chave privada.');
  const cadeia = x509s.filter((c) => c !== doTitular);
  return { chave, cert: doTitular, cadeia };
}

// CNPJ (e-CNPJ) ou CPF (e-CPF) gravado nas extensões ICP-Brasil do certificado
const OID_CNPJ = '2.16.76.1.3.3';
const OID_CPF = '2.16.76.1.3.1';
function textoDe(no) {
  if (!no.construido) return Buffer.from(no.valor).toString('latin1');
  return no.filhos.map(textoDe).join('');
}
function procurarOid(no, alvo) {
  if (!no.construido) return null;
  for (let i = 0; i < no.filhos.length; i++) {
    const f = no.filhos[i];
    if (f.tag === 0x06 && oid(f) === alvo && no.filhos[i + 1]) return textoDe(no.filhos[i + 1]);
    const r = procurarOid(f, alvo);
    if (r != null) return r;
  }
  return null;
}
export function documentoDoCertificado(cert) {
  try {
    const raiz = asn1(cert.raw);
    const cnpj = procurarOid(raiz, OID_CNPJ);
    if (cnpj) { const d = cnpj.replace(/\D/g, ''); if (d.length >= 14) return d.slice(-14); }
    const cpf = procurarOid(raiz, OID_CPF);
    if (cpf) { const d = cpf.replace(/\D/g, ''); if (d.length >= 19) return d.slice(8, 19); }
  } catch { /* cai para o nome */ }
  const cn = /CN=([^\n]+)/.exec(cert.subject || '');
  const m = cn && /:(\d{14}|\d{11})\s*$/.exec(cn[1]);
  return m ? m[1] : '';
}

export function infoDoCertificado(c) {
  const cn = /CN=([^\n]+)/.exec(c.cert.subject || '');
  const emissor = /CN=([^\n]+)/.exec(c.cert.issuer || '');
  const validade = new Date(c.cert.validTo);
  return {
    titular: cn ? cn[1].split(':')[0].trim() : '',
    documento: documentoDoCertificado(c.cert),
    validade: validade.toISOString(),
    emissor: emissor ? emissor[1].trim() : '',
    vencido: validade.getTime() < Date.now(),
  };
}

export const pemDaChave = (c) => c.chave.export({ type: 'pkcs8', format: 'pem' });
export const pemDosCertificados = (c) => [c.cert, ...c.cadeia].map((x) => x.toString()).join('\n');
