// Teste de segurança do site no ar (ou de uma prévia): node scripts/teste-seguranca.mjs https://landimadvisory.com.br
// Confere os cabeçalhos de proteção e tenta abrir as rotas protegidas sem login, com login falso e com senha errada.
// Nada aqui grava dados: todas as chamadas devem ser recusadas. Saída 0 = tudo certo; 1 = algo falhou.
const base = (process.argv[2] || process.env.SITE || 'http://localhost:3000').replace(/\/$/, '');
const falhas = [];
const ok = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) falhas.push(msg); };

async function chamar(caminho, opcoes = {}) {
  try { return await fetch(base + caminho, { redirect: 'manual', ...opcoes }); }
  catch (e) { return { status: 0, headers: new Headers(), text: async () => String(e.message) }; }
}

console.log('Testando ' + base + '\n\nCabeçalhos de segurança');
const home = await chamar('/');
const h = (k) => home.headers.get(k) || '';
ok(home.status === 200, 'página inicial abre (' + home.status + ')');
ok(/default-src 'self'/.test(h('content-security-policy')), 'Content-Security-Policy presente');
ok(/object-src 'none'/.test(h('content-security-policy')), "CSP bloqueia plugins (object-src 'none')");
ok(h('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff');
ok(/SAMEORIGIN|DENY/i.test(h('x-frame-options')), 'X-Frame-Options (contra clickjacking)');
ok(Boolean(h('permissions-policy')), 'Permissions-Policy');
if (base.startsWith('https://')) ok(/max-age=\d{7,}/.test(h('strict-transport-security')), 'HSTS (força HTTPS)');

console.log('\nRotas protegidas sem login (devem recusar)');
const json = { 'content-type': 'application/json' };
const falso = { ...json, authorization: 'Bearer token-falso' };
const casos = [
  ['GET', '/api/subscription', {}],
  ['GET', '/api/assinatura', falso],
  ['POST', '/api/assinatura', falso, { acao: 'cancelar' }],
  ['POST', '/api/checkout', falso, { planId: 'basic' }],
  ['POST', '/api/conta', falso, { acao: 'excluir', confirmacao: 'EXCLUIR' }],
  ['GET', '/api/admin/resumo', falso],
  ['GET', '/api/admin/backup', falso],
  ['POST', '/api/admin/notas', falso, {}],
  ['POST', '/api/nfse', falso, { acao: 'emitir', wsId: 'x' }],
  ['POST', '/api/cobrancas', falso, { acao: 'gerar', wsId: 'x' }],
  ['GET', '/api/cobrancas/eventos?ws=x', falso],
  ['POST', '/api/indicacao', falso, { codigo: 'ABCDEF' }],
  ['POST', '/api/lembretes', falso, { wsId: 'x' }],
  ['GET', '/api/anexos?ws=empresa&f=1&t=x', {}],
];
for (const [metodo, caminho, headers, corpo] of casos) {
  const r = await chamar(caminho, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined });
  ok([400, 401, 403, 404, 405, 503].includes(r.status), `${metodo} ${caminho} → ${r.status}`);
}

console.log('\nRotina diária e webhooks com senha errada (devem recusar)');
for (const rota of ['/api/backup', '/api/lembretes', '/api/rotina', '/api/manutencao']) {
  const r = await chamar(rota, { headers: { authorization: 'Bearer senha-errada' } });
  ok([401, 503].includes(r.status), `GET ${rota} → ${r.status}`);
}
for (const rota of ['/api/asaas', '/api/cobrancas/webhook?ws=x']) {
  const r = await chamar(rota, { method: 'POST', headers: { ...json, 'asaas-access-token': 'errado' }, body: '{"event":"PAYMENT_CONFIRMED"}' });
  ok([401, 503].includes(r.status), `POST ${rota} → ${r.status}`);
}

console.log('\nArquivos que não podem estar públicos');
for (const caminho of ['/.env', '/.env.local', '/firestore.rules', '/package.json', '/backend/app/core/config.py', '/.git/config']) {
  const r = await chamar(caminho);
  ok(r.status !== 200, `${caminho} → ${r.status}`);
}

console.log(falhas.length ? `\n${falhas.length} problema(s) encontrado(s).` : '\nTudo certo.');
process.exit(falhas.length ? 1 : 0);
