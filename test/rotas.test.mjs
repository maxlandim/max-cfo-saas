import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.NODE_ENV = 'production'; // como no servidor: sem configuração, nada fica liberado

// Carrega todas as rotas da API (com o Firebase desligado) e confere que nenhuma entrega dados sem login ou segredo.
const pasta = fileURLToPath(new URL('../src/app/api/', import.meta.url));
const rotas = [];
(function andar(d) { for (const n of readdirSync(d)) { const f = join(d, n); if (statSync(f).isDirectory()) andar(f); else if (n === 'route.js') rotas.push(f); } })(pasta);

const PUBLICAS = ['chat', 'ler-documento', 'fundadores', 'saude', 'visita', 'erro', 'csp', 'emails/sair'];

for (const f of rotas) {
  const nome = f.slice(pasta.length).replace(/\/route\.js$/, '');
  test('rota /api/' + nome + ' carrega e não abre sem credencial', async () => {
    const m = await import(f);
    if (PUBLICAS.includes(nome)) return;
    for (const metodo of ['GET', 'POST', 'DELETE', 'PUT']) {
      if (typeof m[metodo] !== 'function') continue;
      const req = new Request('http://localhost/api/' + nome + '?ws=x&wsId=x', { method: metodo, headers: { 'content-type': 'application/json', authorization: 'Bearer token-falso' }, body: metodo === 'GET' ? undefined : '{}' });
      const r = await m[metodo](req);
      assert.ok([400, 401, 403, 404, 405, 410, 503].includes(r.status), `${metodo} /api/${nome} respondeu ${r.status} sem credencial`);
    }
  });
}
