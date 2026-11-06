import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iguais, cronAutorizado, registrarEvento, TIPOS_EVENTO, ALERTA_ACIMA_DE } from '../src/lib/seguranca.js';
import { limiteExcedido, limitar } from '../src/lib/limite.js';

test('iguais compara segredos sem aceitar vazio', () => {
  assert.equal(iguais('abc123', 'abc123'), true);
  assert.equal(iguais('abc123', 'abc124'), false);
  assert.equal(iguais('', ''), false);
  assert.equal(iguais(undefined, 'x'), false);
});

test('rotina diária exige o CRON_SECRET', () => {
  process.env.CRON_SECRET = 'segredo-de-teste-com-40-caracteres-aaaaaa';
  const req = (h, q = '') => new Request('https://exemplo.com/api/backup' + q, { headers: h });
  assert.equal(cronAutorizado(req({ authorization: 'Bearer segredo-de-teste-com-40-caracteres-aaaaaa' })), true);
  assert.equal(cronAutorizado(req({ authorization: 'Bearer errado' })), false);
  assert.equal(cronAutorizado(req({})), false);
  assert.equal(cronAutorizado(req({}, '?chave=segredo-de-teste-com-40-caracteres-aaaaaa')), true);
  delete process.env.CRON_SECRET;
  assert.equal(cronAutorizado(req({ authorization: 'Bearer ' })), false, 'sem CRON_SECRET no servidor, ninguém passa');
});

test('todo tipo de evento tem limite de alerta', () => {
  for (const t of Object.keys(TIPOS_EVENTO)) assert.ok(ALERTA_ACIMA_DE[t] > 0, t);
  registrarEvento('tipo-inexistente'); // não quebra
  registrarEvento('tokenInvalido'); // sem banco, só soma na memória
});

test('limite de uso bloqueia depois do máximo', async () => {
  const chave = 'teste:' + Math.random();
  for (let i = 0; i < 3; i++) assert.equal(limiteExcedido(chave, 3), false);
  assert.equal(limiteExcedido(chave, 3), true);
  const outra = 'teste2:' + Math.random();
  assert.equal(await limitar(outra, 1), false);
  assert.equal(await limitar(outra, 1), true);
});
