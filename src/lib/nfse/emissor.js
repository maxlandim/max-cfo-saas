// Emissor próprio de NFS-e (padrão nacional) da Landim Advisory.
// Firestore (só o servidor lê e grava; as regras fecham o resto):
//   nfseEmissor/{wsId} = { owner, certificado (pfx cifrado), senha (cifrada), cert { titular, documento, validade, emissor },
//                          config { ... }, numeracao { '1': n, '2': n }, pendente { ambiente, numero, idDps, em }, atualizadoEm }
//   nfseEmissor/{wsId}/notas/{chave} = { chave, numero, idDps, nDps, serie, ambiente, valor, tomador, competencia,
//                                        emitidaEm, xml (gzip+base64), status, cancelamento }
import crypto from 'crypto';
import { cifrar, decifrar } from '../cripto';
import { abrirPfx, infoDoCertificado, pemDaChave, pemDosCertificados, ErroCertificado } from './pkcs12';
import { assinar, digitos, dpsAssinada, ErroDPS, idDps, lerNfse, pedidoCancelamento, texto, cnpjValido } from './dps';
import { cliente as clienteSefin, ErroSefin, gzipB64, ungzipB64, mensagemDeRede } from './sefin';

export { ErroCertificado, ErroDPS, ErroSefin };
export class ErroEmissor extends Error { constructor(msg, status = 400, extra = {}) { super(msg); this.status = status; Object.assign(this, extra); } }

const COLECAO = 'nfseEmissor';
const ref = (db, wsId) => db.collection(COLECAO).doc(wsId);

// ---------- configuração ----------
const um = (v, opcoes, padrao) => (opcoes.includes(String(v)) ? String(v) : padrao);
const num = (v) => { const t = String(v == null ? '' : v).trim().replace(',', '.'); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : null; };
export function limparConfig(c = {}) {
  const aliq = num(c.aliquota);
  const ptot = num(c.pTotTribSN);
  return {
    documento: digitos(c.documento).slice(0, 14),
    razao: texto(c.razao).slice(0, 120),
    im: texto(c.im).slice(0, 15),
    cMun: digitos(c.cMun).slice(0, 7),
    municipio: texto(c.municipio).slice(0, 80),
    fone: digitos(c.fone).slice(0, 20),
    email: texto(c.email).slice(0, 80),
    opSimpNac: um(c.opSimpNac, ['1', '2', '3'], '3'),
    regApTribSN: um(c.regApTribSN, ['1', '2', '3'], '1'),
    regEspTrib: um(c.regEspTrib, ['0', '1', '2', '3', '4', '5', '6', '9'], '0'),
    cTribNac: digitos(c.cTribNac).slice(0, 6),
    cTribMun: digitos(c.cTribMun).slice(0, 3),
    cNBS: digitos(c.cNBS).slice(0, 9),
    aliquota: aliq != null && aliq > 0 && aliq < 10 ? Math.round(aliq * 100) / 100 : '',
    pTotTribSN: ptot != null && ptot > 0 && ptot < 100 ? Math.round(ptot * 100) / 100 : '',
    descricaoPadrao: texto(c.descricaoPadrao, true).slice(0, 2000),
    ambiente: um(c.ambiente, ['1', '2'], '2'),
    serie: Math.min(49999, Math.max(1, Math.floor(num(c.serie) || 1))),
    vencimentoDias: Math.min(365, Math.max(0, Math.floor(num(c.vencimentoDias) ?? 30))),
  };
}

export function resumo(d) {
  if (!d) return { certificado: null, config: null, pronto: false, falta: ['certificado digital A1', 'dados fiscais da empresa'] };
  const cfg = d.config || null;
  const cert = d.cert || null;
  const falta = [];
  if (!cert) falta.push('certificado digital A1');
  else if (Date.parse(cert.validade) < Date.now()) falta.push('certificado dentro da validade');
  if (!cfg) falta.push('dados fiscais da empresa');
  else {
    if (!cnpjValido(cfg.documento)) falta.push('CNPJ da empresa');
    if (cfg.cMun.length !== 7) falta.push('município (código IBGE)');
    if (cfg.cTribNac.length !== 6) falta.push('código do serviço');
    if (cfg.opSimpNac === '3' && !cfg.pTotTribSN) falta.push('percentual de tributos do Simples');
  }
  return {
    certificado: cert ? { ...cert, vencido: Date.parse(cert.validade) < Date.now(), diasParaVencer: Math.ceil((Date.parse(cert.validade) - Date.now()) / 864e5) } : null,
    config: cfg,
    numeracao: d.numeracao || {},
    pronto: falta.length === 0,
    falta,
  };
}

export async function carregar(db, wsId) {
  const s = await ref(db, wsId).get();
  return s.exists ? s.data() : null;
}

export async function salvarConfig(db, wsId, owner, config) {
  const atual = (await carregar(db, wsId)) || {};
  const cfg = limparConfig({ ...(atual.config || {}), ...config });
  if (cfg.documento && !cnpjValido(cfg.documento)) throw new ErroEmissor('CNPJ da empresa inválido.');
  if (atual.cert && atual.cert.documento && cfg.documento && atual.cert.documento.slice(0, 8) !== cfg.documento.slice(0, 8)) {
    throw new ErroEmissor('O CNPJ informado não é o do certificado digital enviado (' + mascara(atual.cert.documento) + ').');
  }
  await ref(db, wsId).set({ owner, config: cfg, atualizadoEm: Date.now() }, { merge: true });
  return resumo({ ...atual, config: cfg });
}

const mascara = (d) => (d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : d);

// ---------- certificado ----------
export async function salvarCertificado(db, wsId, owner, pfx, senha) {
  if (!pfx || pfx.length < 200 || pfx.length > 60000) throw new ErroEmissor('Envie o arquivo do certificado A1 (.pfx ou .p12).');
  const c = abrirPfx(pfx, String(senha || ''));
  const info = infoDoCertificado(c);
  if (info.vencido) throw new ErroEmissor('Este certificado venceu em ' + new Date(info.validade).toLocaleDateString('pt-BR') + '. Renove com a certificadora e envie o novo.');
  if (info.documento.length !== 14) throw new ErroEmissor('Use o certificado e-CNPJ (A1) da empresa. Este certificado não tem CNPJ.');
  const atual = (await carregar(db, wsId)) || {};
  const cfgDoc = atual.config && atual.config.documento;
  if (cfgDoc && cfgDoc.slice(0, 8) !== info.documento.slice(0, 8)) {
    throw new ErroEmissor('Este certificado é do CNPJ ' + mascara(info.documento) + ', diferente do CNPJ da empresa (' + mascara(cfgDoc) + ').');
  }
  const dados = {
    owner,
    certificado: cifrar(Buffer.from(pfx).toString('base64')),
    senha: cifrar(String(senha || '')),
    cert: { titular: info.titular, documento: info.documento, validade: info.validade, emissor: info.emissor, enviadoEm: Date.now() },
    atualizadoEm: Date.now(),
  };
  if (!cfgDoc) dados.config = limparConfig({ ...(atual.config || {}), documento: info.documento, razao: (atual.config && atual.config.razao) || info.titular });
  await ref(db, wsId).set(dados, { merge: true });
  return resumo({ ...atual, ...dados, config: dados.config || atual.config });
}

export async function removerCertificado(db, wsId) {
  const atual = await carregar(db, wsId);
  if (!atual) return resumo(null);
  const { certificado, senha, cert, ...resto } = atual;
  void certificado; void senha; void cert;
  await ref(db, wsId).set({ ...resto, certificado: null, senha: null, cert: null, atualizadoEm: Date.now() });
  return resumo({ ...resto });
}

function abrirDoBanco(d) {
  if (!d || !d.certificado) throw new ErroEmissor('Envie o certificado digital A1 da empresa em Notas Fiscais → Configurar emissão.');
  let pfx; let senha;
  try { pfx = Buffer.from(decifrar(d.certificado), 'base64'); senha = decifrar(d.senha); } catch { throw new ErroEmissor('Não consegui abrir o certificado guardado. Envie o certificado de novo.', 500); }
  const c = abrirPfx(pfx, senha);
  return { ...c, chavePem: pemDaChave(c), certPem: pemDosCertificados(c) };
}

// fabrica: permite trocar o cliente da Sefin nos testes
export async function testarConexao(db, wsId, fabrica = clienteSefin) {
  const d = await carregar(db, wsId);
  const c = abrirDoBanco(d);
  const amb = (d.config && d.config.ambiente) || '2';
  try { await fabrica({ ambiente: amb, chavePem: c.chavePem, certPem: c.certPem }).testar(); } catch (e) {
    if (e instanceof ErroSefin) throw new ErroEmissor(e.mensagens.join(' '), 502);
    throw new ErroEmissor(mensagemDeRede(e), 502);
  }
  return { ok: true, ambiente: amb };
}

// ---------- numeração da DPS (transação: duas emissões ao mesmo tempo não usam o mesmo número) ----------
const resumoNota = (n) => ({ valor: Math.round(Number(n.valor) * 100) / 100, competencia: String(n.competencia || '').slice(0, 10), descricao: texto(n.descricao, true).slice(0, 300), retido: String(n.retido || '1'), tomador: { documento: digitos((n.tomador || {}).documento), nome: texto((n.tomador || {}).nome).slice(0, 120) } });
const impressao = (n) => crypto.createHash('sha256').update(JSON.stringify(resumoNota(n))).digest('hex').slice(0, 32);

async function reservarNumero(db, wsId, ambiente, idDe, nota) {
  return db.runTransaction(async (tx) => {
    const s = await tx.get(ref(db, wsId));
    const d = s.data() || {};
    const p = d.pendente;
    // Emissão anterior ficou sem resposta: reaproveita o número (a Sefin recusa duplicata e conferimos)
    if (p && p.ambiente === ambiente && Date.now() - (p.em || 0) < 7 * 864e5) return { numero: p.numero, idDps: p.idDps, reaproveitado: true, mesmaNota: p.impressao === impressao(nota), notaAnterior: p.nota || null };
    const n = ((d.numeracao && Number(d.numeracao[ambiente])) || 0) + 1;
    const id = idDe(n);
    tx.set(ref(db, wsId), { numeracao: { ...(d.numeracao || {}), [ambiente]: n }, pendente: { ambiente, numero: n, idDps: id, em: Date.now(), nota: resumoNota(nota), impressao: impressao(nota) } }, { merge: true });
    return { numero: n, idDps: id, reaproveitado: false };
  });
}
async function liberarPendente(db, wsId) { await ref(db, wsId).set({ pendente: null }, { merge: true }); }

// ---------- emissão ----------
// nota: { competencia, valor, descricao, retido, aliquota, cTribNac, cTribMun, cLocPrestacao, tomador }
export async function emitir(db, wsId, nota, { fabrica = clienteSefin, usuario = '' } = {}) {
  const d = await carregar(db, wsId);
  const r = resumo(d);
  if (!r.pronto) throw new ErroEmissor('Antes de emitir, complete: ' + r.falta.join(', ') + '.');
  const cfg = d.config;
  const c = abrirDoBanco(d);
  const amb = cfg.ambiente;
  const emissor = { ...cfg };
  // confere tudo antes de gastar um número
  try { dpsAssinada({ ambiente: amb, serie: cfg.serie, numero: 1, emissor, nota }, c.chave, c.cert); } catch (e) { if (e instanceof ErroDPS) throw new ErroEmissor(e.erros.join(' '), 400, { erros: e.erros }); throw e; }
  const sefin = fabrica({ ambiente: amb, chavePem: c.chavePem, certPem: c.certPem });
  const idDe = (n) => idDps({ cLocEmi: cfg.cMun, documento: cfg.documento, serie: cfg.serie, numero: n });

  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const reserva = await reservarNumero(db, wsId, amb, idDe, nota);
    if (reserva.reaproveitado) {
      // a nota da tentativa sem resposta pode já existir
      let chave = null;
      try { chave = await sefin.consultarDps(reserva.idDps); } catch { /* segue e tenta emitir */ }
      if (chave) {
        let xml = '';
        try { xml = await sefin.consultarNfse(chave); } catch { /* fica sem o XML por enquanto */ }
        await liberarPendente(db, wsId);
        if (reserva.mesmaNota) {
          const salva = await registrar(db, wsId, { chave, xml, reserva, amb, cfg, nota, usuario });
          return { ...salva, recuperada: true, alertas: ['Esta nota já tinha sido gerada na tentativa anterior, que ficou sem resposta.'] };
        }
        // era outra nota: registra a anterior (aparece na lista) e emite esta com um número novo
        await registrar(db, wsId, { chave, xml, reserva, amb, cfg, nota: reserva.notaAnterior || {}, usuario, recuperada: true });
        continue;
      }
    }
    const { xml: dpsXml } = dpsAssinada({ ambiente: amb, serie: cfg.serie, numero: reserva.numero, emissor, nota }, c.chave, c.cert);
    let res;
    try {
      res = await sefin.emitir(dpsXml);
    } catch (e) {
      if (e instanceof ErroSefin) {
        if (e.codigos.includes('E0014')) {
          // número já usado (por outro sistema na mesma série): segue para o próximo
          await liberarPendente(db, wsId);
          continue;
        }
        // recusa definitiva: o número volta a ficar livre
        if (e.status && e.status < 500) await desfazerNumero(db, wsId, amb, reserva.numero);
        throw new ErroEmissor('A Sefin Nacional recusou a nota: ' + e.mensagens.join(' '), 422, { erros: e.mensagens, codigos: e.codigos });
      }
      // sem resposta: o número fica pendente e a próxima tentativa confere se a nota saiu
      throw new ErroEmissor(mensagemDeRede(e), 504, { semResposta: true });
    }
    await liberarPendente(db, wsId);
    const salva = await registrar(db, wsId, { chave: res.chave, xml: res.xml, reserva, amb, cfg, nota, usuario });
    return { ...salva, alertas: res.alertas || [] };
  }
  throw new ErroEmissor('A numeração da DPS desta série já está em uso por outro sistema. Troque a série em Configurar emissão.', 409);
}

async function desfazerNumero(db, wsId, amb, numero) {
  await db.runTransaction(async (tx) => {
    const s = await tx.get(ref(db, wsId));
    const d = s.data() || {};
    const atual = (d.numeracao && Number(d.numeracao[amb])) || 0;
    const muda = { pendente: null };
    if (atual === numero) muda.numeracao = { ...(d.numeracao || {}), [amb]: numero - 1 };
    tx.set(ref(db, wsId), muda, { merge: true });
  });
}

async function registrar(db, wsId, { chave, xml, reserva, amb, cfg, nota, usuario, recuperada = false }) {
  const dados = xml ? lerNfse(xml) : null;
  const to = nota.tomador || {};
  const doc = {
    chave, numero: (dados && dados.numero) || '', idDps: reserva.idDps, nDps: reserva.numero, serie: cfg.serie, ambiente: amb,
    valor: Math.round(Number(nota.valor) * 100) / 100, competencia: String(nota.competencia).slice(0, 10),
    tomador: { documento: digitos(to.documento), nome: texto(to.nome).slice(0, 120) },
    descricao: texto(nota.descricao, true).slice(0, 2000), retido: String(nota.retido || '1') === '2',
    emitidaEm: Date.now(), emitidaPor: usuario || '', xml: xml ? gzipB64(xml) : '', status: 'autorizada', recuperada,
  };
  if (dados) {
    if (dados.valores.servico) doc.valor = dados.valores.servico;
    if (dados.tomador) doc.tomador = { documento: dados.tomador.documento, nome: dados.tomador.nome };
    if (dados.servico.descricao) doc.descricao = dados.servico.descricao;
    if (dados.dps.competencia) doc.competencia = dados.dps.competencia;
    doc.issRetido = dados.valores.retido || 0;
    doc.liquido = dados.valores.liquido || doc.valor;
  }
  await ref(db, wsId).collection('notas').doc(chave).set(doc);
  return { chave, numero: doc.numero, idDps: doc.idDps, nDps: doc.nDps, ambiente: amb, dados };
}

// ---------- consulta, XML e cancelamento ----------
// Lista das notas emitidas por aqui (sem o XML), para o painel conferir se falta alguma
export async function listar(db, wsId, limite = 200) {
  const q = await ref(db, wsId).collection('notas').orderBy('emitidaEm', 'desc').limit(limite).get();
  return q.docs.map((s) => { const n = s.data(); const { xml, ...resto } = n; void xml; if (resto.cancelamento) resto.cancelamento = { em: resto.cancelamento.em, motivo: resto.cancelamento.motivo, justificativa: resto.cancelamento.justificativa }; return resto; });
}

export async function nota(db, wsId, chave) {
  const s = await ref(db, wsId).collection('notas').doc(digitos(chave)).get();
  if (!s.exists) throw new ErroEmissor('Nota não encontrada neste emissor.', 404);
  return s.data();
}

export async function xmlDaNota(db, wsId, chave, fabrica = clienteSefin) {
  const n = await nota(db, wsId, chave);
  if (n.xml) return ungzipB64(n.xml);
  // não veio na emissão: busca na Sefin e guarda
  const d = await carregar(db, wsId);
  const c = abrirDoBanco(d);
  const xml = await fabrica({ ambiente: n.ambiente, chavePem: c.chavePem, certPem: c.certPem }).consultarNfse(n.chave);
  await ref(db, wsId).collection('notas').doc(n.chave).set({ xml: gzipB64(xml), numero: lerNfse(xml).numero || n.numero }, { merge: true });
  return xml;
}

export async function cancelar(db, wsId, chave, motivo, justificativa, { fabrica = clienteSefin, usuario = '' } = {}) {
  const n = await nota(db, wsId, chave);
  if (n.status === 'cancelada') return { ok: true, jaCancelada: true };
  const d = await carregar(db, wsId);
  const c = abrirDoBanco(d);
  let ped;
  try { ped = pedidoCancelamento({ ambiente: n.ambiente, documento: d.config.documento, chave: n.chave, motivo, justificativa }); } catch (e) {
    if (e instanceof ErroDPS) throw new ErroEmissor(e.erros.join(' '), 400, { erros: e.erros });
    throw e;
  }
  const xml = assinar(ped, c.chave, c.cert);
  let res;
  try { res = await fabrica({ ambiente: n.ambiente, chavePem: c.chavePem, certPem: c.certPem }).evento(n.chave, xml); } catch (e) {
    if (e instanceof ErroSefin) throw new ErroEmissor('A Sefin Nacional recusou o cancelamento: ' + e.mensagens.join(' '), 422, { erros: e.mensagens });
    throw new ErroEmissor(mensagemDeRede(e), 504);
  }
  const cancelamento = { em: Date.now(), motivo: String(motivo), justificativa: texto(justificativa).slice(0, 255), por: usuario || '', xml: res.xml ? gzipB64(res.xml) : '' };
  await ref(db, wsId).collection('notas').doc(n.chave).set({ status: 'cancelada', cancelamento }, { merge: true });
  return { ok: true };
}
