import fs from 'fs';
const { abrirPfx } = await import(process.env.APP + '/src/lib/nfse/pkcs12.js');
const { dpsAssinada, pedidoCancelamento, assinar, ErroDPS, validar } = await import(process.env.APP + '/src/lib/nfse/dps.js');
const c = abrirPfx(fs.readFileSync('legado.pfx'), 'Senh@123');
const emissor = { documento: '98.765.432/0001-98', im: '12345', cMun: '5300108', fone: '(61) 99999-0000', email: 'contato@padaria.com.br', opSimpNac: '3', regApTribSN: '1', regEspTrib: '0', cTribNac: '17.01.01', cTribMun: '', aliquota: '', pTotTribSN: '6' };
const nota = { competencia: '2026-10-20', valor: 1500, descricao: 'Consultoria financeira — outubro/2026\nInclui “fluxo de caixa” & DRE <mensal>', retido: '1',
  tomador: { documento: '11.222.333/0001-81', nome: 'Hotel Planalto Ltda', email: 'fin@hotel.com.br', end: { cep: '70000-000', cMun: '5300108', logradouro: 'SHS Quadra 1', numero: '10', bairro: 'Asa Sul', complemento: 'Bloco A' } } };
const r = dpsAssinada({ ambiente: '2', serie: 1, numero: 7, emissor, nota }, c.chave, c.cert);
fs.writeFileSync('dps.xml', r.xml); console.log(r.id, r.id.length);
// MEI sem tomador, com alíquota
const r2 = dpsAssinada({ ambiente: '2', serie: 1, numero: 8, emissor: { ...emissor, opSimpNac: '2', im: '', fone: '', email: '' }, nota: { competencia: '2026-10-01', valor: 99.9, descricao: 'Serviço', aliquota: '2', retido: '1' } }, c.chave, c.cert);
fs.writeFileSync('dps2.xml', r2.xml);
// Não optante com retenção
const r3 = dpsAssinada({ ambiente: '1', serie: 1, numero: 123456789, emissor: { ...emissor, opSimpNac: '1', aliquota: '5' }, nota: { ...nota, retido: '2', tomador: { documento: '529.982.247-25', nome: 'Maria' } } }, c.chave, c.cert);
fs.writeFileSync('dps3.xml', r3.xml);
const p = pedidoCancelamento({ ambiente: '2', documento: emissor.documento, chave: '5300108'+'2'+'98765432000198'+'0'.repeat(28), motivo: '1', justificativa: 'Valor informado errado na nota' });
fs.writeFileSync('canc.xml', assinar(p, c.chave, c.cert));
try { validar(emissor, { ...nota, valor: 0, descricao: '', competencia: '2030-01-01', tomador: { documento: '123', nome: '' } }); console.log(validar(emissor, { ...nota, valor: 0, descricao: '', competencia: '2030-01-01', tomador: { documento: '123', nome: '' } })); } catch (e) { console.log(e); }
try { pedidoCancelamento({ chave: '1', motivo: 'x', justificativa: 'curto' }); } catch (e) { console.log(e instanceof ErroDPS, e.erros); }
