process.env.CHAVE_CRIPTO = 'teste-local-123';
import fs from 'fs';
import zlib from 'zlib';
import { fakeDb } from './fakedb.mjs';
const E = await import(process.env.APP + '/src/lib/nfse/emissor.js');
const { ErroSefin } = await import(process.env.APP + '/src/lib/nfse/sefin.js');
const falhas = []; const ok = (c, n, x = '') => { console.log(c ? 'OK   ' : 'FALHA', n, c ? '' : JSON.stringify(x)); if (!c) falhas.push(n); };
const db = fakeDb(); const ws = 'uidTeste123';
const pfx = fs.readFileSync('legado.pfx');
// certificado com senha errada
try { await E.salvarCertificado(db, ws, ws, pfx, 'errada'); ok(false, 'senha errada recusada'); } catch (e) { ok(/Senha/.test(e.message), 'senha errada recusada', e.message); }
// config com outro CNPJ antes do certificado e depois troca
let r = await E.salvarCertificado(db, ws, ws, pfx, 'Senh@123');
ok(r.certificado && r.certificado.documento === '98765432000198' && r.config.documento === '98765432000198', 'certificado salvo e CNPJ preenchido', r);
const bruto = JSON.stringify(db.dados.get('nfseEmissor/' + ws));
ok(!bruto.includes('Senh@123') && !bruto.includes(pfx.toString('base64').slice(0, 40)), 'pfx e senha guardados cifrados');
ok(!r.pronto && r.falta.includes('município (código IBGE)'), 'aponta o que falta', r.falta);
try { await E.salvarConfig(db, ws, ws, { documento: '11.222.333/0001-81' }); ok(false, 'CNPJ diferente do certificado recusado'); } catch (e) { ok(/não é o do certificado/.test(e.message), 'CNPJ diferente do certificado recusado', e.message); }
r = await E.salvarConfig(db, ws, ws, { cMun: '5300108', municipio: 'Brasília', im: '0712345', opSimpNac: '3', regApTribSN: '1', cTribNac: '17.01.01', pTotTribSN: '6,5', email: 'contato@padaria.com.br', ambiente: '2' });
ok(r.pronto && r.config.pTotTribSN === 6.5 && r.config.cTribNac === '170101', 'configuração completa', r);
// Sefin falsa
const chamadas = []; let modo = 'ok'; let seq = 0;
const NFSE = (dpsXml, chave) => `<?xml version="1.0" encoding="UTF-8"?><NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01"><infNFSe Id="NFS${chave}"><xLocEmi>Brasília</xLocEmi><xLocPrestacao>Brasília</xLocPrestacao><nNFSe>${++seq}</nNFSe><xTribNac>Assessoria ou consultoria de qualquer natureza</xTribNac><verAplic>SefinNac</verAplic><ambGer>2</ambGer><tpEmis>1</tpEmis><cStat>100</cStat><dhProc>2026-10-24T09:00:00-03:00</dhProc><nDFSe>123</nDFSe><emit><CNPJ>98765432000198</CNPJ><xNome>PADARIA PAO DOURADO LTDA</xNome><enderNac><xLgr>Rua A</xLgr><nro>1</nro><xBairro>Centro</xBairro><cMun>5300108</cMun><UF>DF</UF><CEP>70000000</CEP></enderNac></emit><valores><vBC>1500.00</vBC><pAliqAplic>2.00</pAliqAplic><vISSQN>30.00</vISSQN><vLiq>1500.00</vLiq></valores>${dpsXml.replace(/^<\?xml[^>]*\?>/, '')}</infNFSe></NFSe>`;
const emitidas = new Map();
const fabrica = (op) => ({
  async emitir(xml) {
    const n = /<nDPS>(\d+)<\/nDPS>/.exec(xml)[1]; const id = /<tpAmb>(\d)/.exec(xml)[1] + /Id="(DPS\d+)"/.exec(xml)[1]; chamadas.push(['emitir', n]);
    if (modo === 'timeout') { modo = 'ok'; emitidas.set(id, '5300108' + '2' + '98765432000198' + String(n).padStart(28, '0')); throw Object.assign(new Error('Tempo esgotado'), { code: 'ETIMEDOUT' }); }
    if (modo === 'e0014' && n === '3') throw new ErroSefin(['E0014 DPS já informada'], 400, ['E0014']);
    if (modo === 'recusa') throw new ErroSefin(['E0312 Código de tributação nacional inexistente'], 400, ['E0312']);
    if (emitidas.has(id)) throw new ErroSefin(['E0014 DPS já informada'], 400, ['E0014']);
    const chave = '5300108' + '2' + '98765432000198' + String(n).padStart(28, '0'); emitidas.set(id, chave);
    return { chave, xml: NFSE(xml, chave), alertas: [] };
  },
  async consultarDps(id) { chamadas.push(['consultarDps', id.slice(-3)]); return emitidas.get(op.ambiente + id) || null; },
  async consultarNfse(ch) { return NFSE('<DPS><infDPS><nDPS>1</nDPS></infDPS></DPS>', ch); },
  async evento(ch, xml) { chamadas.push(['evento', ch.slice(-3), /<cMotivo>(\d)/.exec(xml)[1]]); return { xml: '<evento/>' }; },
  async testar() { return 404; },
});
const nota = { competencia: '2026-10-20', valor: 1500, descricao: 'Consultoria financeira', retido: '1', tomador: { documento: '11.222.333/0001-81', nome: 'Hotel Planalto Ltda' } };
let e1 = await E.emitir(db, ws, nota, { fabrica });
ok(e1.chave && e1.nDps === 1 && e1.numero === '1' && e1.dados.valores.iss === 30, 'emite a primeira nota', e1);
// recusa: número volta
modo = 'recusa';
try { await E.emitir(db, ws, nota, { fabrica }); ok(false, 'recusa da Sefin'); } catch (e) { ok(e.status === 422 && /E0312/.test(e.message), 'recusa da Sefin vira mensagem clara', e.message); }
modo = 'ok';
let e2 = await E.emitir(db, ws, { ...nota, valor: 200 }, { fabrica });
ok(e2.nDps === 2, 'número da DPS reaproveitado depois da recusa', e2.nDps);
// E0014: pula para o próximo
modo = 'e0014';
let e3 = await E.emitir(db, ws, { ...nota, valor: 300 }, { fabrica });
ok(e3.nDps === 4, 'DPS já usada por outro sistema: usa o próximo número', e3.nDps);
modo = 'ok';
// sem resposta e nova tentativa da mesma nota: recupera sem duplicar
modo = 'timeout';
try { await E.emitir(db, ws, { ...nota, valor: 400 }, { fabrica }); ok(false, 'timeout'); } catch (e) { ok(e.status === 504 && e.semResposta, 'sem resposta avisa', e.message); }
const antes = chamadas.filter((c) => c[0] === 'emitir').length;
let e4 = await E.emitir(db, ws, { ...nota, valor: 400 }, { fabrica });
ok(e4.recuperada && e4.nDps === 5 && chamadas.filter((c) => c[0] === 'emitir').length === antes, 'nova tentativa recupera a nota sem emitir de novo', [e4, chamadas.slice(-3)]);
// sem resposta e depois OUTRA nota: registra a anterior e emite a nova com outro número
modo = 'timeout';
try { await E.emitir(db, ws, { ...nota, valor: 500 }, { fabrica }); } catch (e) { }
let e5 = await E.emitir(db, ws, { ...nota, valor: 600 }, { fabrica });
ok(!e5.recuperada && e5.nDps === 7, 'outra nota depois de falha: emite com novo número', e5.nDps);
const lista = await E.listar(db, ws);
ok(lista.length === 6 && lista.some((n) => n.nDps === 6 && n.recuperada && n.valor === 500) && !lista.some((n) => n.xml), 'lista traz todas as notas (inclusive a recuperada), sem XML', lista.map((n) => [n.nDps, n.valor, n.recuperada]));
// XML
const xml = await E.xmlDaNota(db, ws, e1.chave, fabrica);
ok(xml.includes('<nNFSe>1</nNFSe>'), 'XML da nota guardado');
// cancelamento
try { await E.cancelar(db, ws, e1.chave, '1', 'curto', { fabrica }); ok(false, 'justificativa curta'); } catch (e) { ok(/15 letras/.test(e.message), 'justificativa curta recusada', e.message); }
const c1 = await E.cancelar(db, ws, e1.chave, '2', 'Serviço não foi prestado ao cliente', { fabrica });
ok(c1.ok && chamadas.some((c) => c[0] === 'evento' && c[2] === '2'), 'cancela na Sefin');
ok((await E.listar(db, ws)).find((n) => n.chave === e1.chave).status === 'cancelada', 'nota fica cancelada');
// validação antes de gastar número
try { await E.emitir(db, ws, { ...nota, valor: 0 }, { fabrica }); ok(false, 'valor zero'); } catch (e) { ok(/maior que zero/.test(e.message), 'valida antes de enviar', e.message); }
const n0 = db.dados.get('nfseEmissor/' + ws).numeracao['2'];
ok(n0 === 7, 'validação não gasta número', n0);
// produção usa outra numeração
await E.salvarConfig(db, ws, ws, { ambiente: '1' });
let p1 = await E.emitir(db, ws, nota, { fabrica });
ok(p1.nDps === 1 && p1.ambiente === '1', 'produção tem numeração própria', p1);
// remover certificado
r = await E.removerCertificado(db, ws);
ok(!r.certificado && !JSON.stringify(db.dados.get('nfseEmissor/' + ws)).includes('"certificado":"'), 'certificado removido');
try { await E.emitir(db, ws, nota, { fabrica }); ok(false, 'sem certificado'); } catch (e) { ok(/certificado/.test(e.message), 'sem certificado não emite', e.message); }
console.log('\nFALHAS:', falhas.length ? falhas : 'nenhuma');
