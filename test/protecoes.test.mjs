import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cifrar, decifrar } from '../src/lib/cripto.js';
import { nomeSeguro, assinatura } from '../src/lib/anexos.js';

const raiz = new URL('../', import.meta.url);
const ler = (f) => readFileSync(new URL(f, raiz), 'utf8');

test('criptografia AES-GCM abre o que fechou e recusa conteúdo alterado', () => {
  process.env.CHAVE_CRIPTO = 'chave-de-teste';
  const pacote = cifrar('$aact_prod_chave-do-cliente');
  assert.notEqual(pacote.includes('chave-do-cliente'), true);
  assert.equal(decifrar(pacote), '$aact_prod_chave-do-cliente');
  const [iv, tag, dados] = pacote.split('.');
  const alterado = [iv, tag, Buffer.from('outra coisa').toString('base64')].join('.');
  assert.throws(() => decifrar(alterado));
  process.env.CHAVE_CRIPTO = 'outra-chave';
  assert.throws(() => decifrar(pacote), 'outra chave não abre');
  delete process.env.CHAVE_CRIPTO;
});

test('nome de anexo não escapa da pasta da empresa', () => {
  for (const n of ['../../etc/passwd.pdf', '..\\..\\x.pdf', '/abs/x.png', 'a/../../b.jpg']) {
    const s = nomeSeguro(n);
    assert.ok(!s.includes('/') && !s.includes('\\') && !s.startsWith('.'), s);
  }
});

test('link de anexo depende da empresa e do arquivo', () => {
  process.env.CHAVE_CRIPTO = 'chave-de-teste';
  assert.notEqual(assinatura('empresaA', 'x.pdf'), assinatura('empresaB', 'x.pdf'));
  assert.notEqual(assinatura('empresaA', 'x.pdf'), assinatura('empresaA', 'y.pdf'));
  delete process.env.CHAVE_CRIPTO;
});

test('regras do Firestore: espaço antigo só com e-mail confirmado e o resto fechado', () => {
  const r = ler('firestore.rules');
  assert.match(r, /emailConfirmado\(\) && request\.auth\.token\.email\.lower\(\) == wsId/);
  assert.doesNotMatch(r, /request\.auth != null && request\.auth\.token\.email != null && request\.auth\.token\.email\.lower\(\) == wsId/);
  assert.match(r, /match \/subscriptions\/\{uid\}[\s\S]*?allow write: if false;/);
  assert.match(r, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
  assert.match(ler('storage.rules'), /match \/\{allPaths=\*\*\} \{\s*allow read, write: if false;/);
});

test('cabeçalhos de segurança configurados', async () => {
  const { default: config } = await import('../next.config.mjs');
  const todos = (await config.headers()).find((h) => h.source === '/(.*)').headers;
  const valor = (k) => (todos.find((h) => h.key === k) || {}).value || '';
  const csp = valor('Content-Security-Policy');
  for (const d of ["object-src 'none'", "base-uri 'self'", "frame-ancestors 'self'", "default-src 'self'", 'report-uri /api/csp']) assert.ok(csp.includes(d), d);
  assert.equal(valor('X-Content-Type-Options'), 'nosniff');
  assert.equal(valor('X-Frame-Options'), 'SAMEORIGIN');
  assert.ok(valor('Permissions-Policy').includes('geolocation=()'));
});

test('acesso de administrador e cortesia só com e-mail confirmado', () => {
  assert.match(ler('src/lib/assinatura.js'), /decoded\.email_verified === false \? ''/);
  assert.match(ler('src/lib/firebaseAdmin.js'), /usuario\.email_verified !== false/);
});

test('rotas da API exigem login, segredo ou token (lista de rotas públicas conhecida)', () => {
  const { readdirSync, statSync } = require_fs();
  const pasta = new URL('src/app/api/', raiz);
  const rotas = [];
  const andar = (u, rel) => { for (const n of readdirSync(u)) { const f = new URL(n + (statSync(new URL(n, u)).isDirectory() ? '/' : ''), u); if (n === 'route.js') rotas.push(rel); else if (f.href.endsWith('/')) andar(f, rel + n + '/'); } };
  andar(pasta, '');
  // Rotas abertas de propósito: sem dados de cliente
  const publicas = new Set(['chat/', 'ler-documento/', 'fundadores/', 'saude/', 'visita/', 'erro/', 'csp/', 'emails/sair/']);
  for (const r of rotas) {
    if (publicas.has(r)) continue;
    const codigo = ler('src/app/api/' + r + 'route.js');
    assert.match(codigo, /usuarioDaRequisicao|cronAutorizado|iguais\(/, 'rota sem verificação: /api/' + r);
  }
});

function require_fs() { return { readdirSync: (u) => readdirSyncFs(u), statSync: (u) => statSyncFs(u) }; }
import { readdirSync as readdirSyncFs, statSync as statSyncFs } from 'node:fs';
