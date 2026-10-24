// NFS-e padrão nacional: montagem da DPS (leiaute 1.01), assinatura XMLDSig e evento de cancelamento.
// O XML é escrito já na forma canônica (C14N 1.0: sem espaços entre as tags, sem tags vazias abreviadas,
// atributos em ordem), então o que é assinado é exatamente o que vai no arquivo.
import crypto from 'crypto';

export const NS = 'http://www.sped.fazenda.gov.br/nfse';
const DS = 'http://www.w3.org/2000/09/xmldsig#';
const C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
export const VERSAO = '1.01';
export const VER_APLIC = 'LandimAdvisory-1.0';

export class ErroDPS extends Error {
  constructor(erros) { super(erros.join(' ')); this.erros = erros; }
}

// ---------- utilidades ----------
export const digitos = (v) => String(v == null ? '' : v).replace(/\D/g, '');
const TROCAS = { '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...', ' ': ' ', '•': '-', '€': 'EUR' };
// Texto aceito pelo leiaute: Latin-1, sem caracteres de controle, espaços normalizados
export function texto(v, multilinha = false) {
  let s = String(v == null ? '' : v).replace(/[‘’“”–—… •€]/g, (c) => TROCAS[c]);
  s = s.replace(/\r\n?/g, '\n');
  s = multilinha ? s.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n') : s.replace(/\s+/g, ' ');
  s = Array.from(s).map((c) => {
    const n = c.codePointAt(0);
    if (n === 10) return c;
    if (n < 32 || n === 127) return '';
    if (n < 256) return c;
    const sem = c.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return sem.length === 1 && sem.charCodeAt(0) < 256 ? sem : '';
  }).join('');
  return s.trim();
}
// Escape do C14N para conteúdo de texto
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tag = (nome, conteudo) => `<${nome}>${conteudo}</${nome}>`;
const t = (nome, valor) => tag(nome, esc(valor));
const opc = (nome, valor) => (valor === undefined || valor === null || valor === '' ? '' : t(nome, valor));
export const dec = (v) => (Math.round(Number(v) * 100) / 100).toFixed(2);

export function cnpjValido(c) {
  c = digitos(c);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (n) => {
    let s = 0; let p = n - 7;
    for (let i = 0; i < n; i++) { s += Number(c[i]) * p--; if (p < 2) p = 9; }
    const r = s % 11; return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}
export function cpfValido(c) {
  c = digitos(c);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const calc = (n) => { let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

// Data e hora de Brasília no formato do leiaute (AAAA-MM-DDThh:mm:ss-03:00)
export function dataHoraBrasilia(ms = Date.now()) {
  return new Date(ms - 3 * 3600 * 1000).toISOString().slice(0, 19) + '-03:00';
}
export const hojeBrasilia = () => dataHoraBrasilia().slice(0, 10);

export function idDps({ cLocEmi, documento, serie, numero }) {
  const doc = digitos(documento);
  return 'DPS' + digitos(cLocEmi) + (doc.length === 14 ? '2' : '1') + doc.padStart(14, '0') + String(Number(serie)).padStart(5, '0') + String(Number(numero)).padStart(15, '0');
}

// ---------- validação antes de enviar (evita rejeições óbvias da Sefin) ----------
// emissor: { documento, im, cMun, fone, email, opSimpNac, regApTribSN, regEspTrib, cTribNac, cTribMun, cNBS,
//            aliquota, pTotTribSN }
// nota:    { competencia, valor, descricao, retido ('1'|'2'), aliquota, cTribNac, cTribMun, cLocPrestacao,
//            tomador: { documento, nome, im, email, fone, end: { cMun, cep, logradouro, numero, complemento, bairro } } }
export function validar(emissor, nota) {
  const e = [];
  const doc = digitos(emissor.documento);
  if (!(doc.length === 14 ? cnpjValido(doc) : cpfValido(doc))) e.push('CNPJ do prestador inválido.');
  if (digitos(emissor.cMun).length !== 7) e.push('Informe o código IBGE do município da empresa (7 dígitos).');
  if (!['1', '2', '3'].includes(String(emissor.opSimpNac))) e.push('Informe a situação no Simples Nacional.');
  if (String(emissor.opSimpNac) === '3' && !['1', '2', '3'].includes(String(emissor.regApTribSN || ''))) e.push('Informe o regime de apuração do Simples Nacional.');
  if (String(emissor.opSimpNac) === '3' && !(Number(emissor.pTotTribSN) > 0)) e.push('Informe o percentual aproximado de tributos do Simples Nacional (está no DAS ou com o contador).');
  if (Number(emissor.pTotTribSN) >= 100) e.push('Percentual de tributos do Simples inválido.');
  const cTribNac = digitos(nota.cTribNac || emissor.cTribNac);
  if (cTribNac.length !== 6) e.push('O código de tributação nacional do serviço deve ter 6 dígitos (ex.: 17.01.01 → 170101).');
  const cTribMun = digitos(nota.cTribMun != null ? nota.cTribMun : emissor.cTribMun);
  if (cTribMun && cTribMun.length !== 3) e.push('O código de tributação municipal deve ter 3 dígitos.');
  if (emissor.cNBS && digitos(emissor.cNBS).length !== 9) e.push('O código NBS deve ter 9 dígitos.');
  const aliq = nota.aliquota != null && nota.aliquota !== '' ? nota.aliquota : emissor.aliquota;
  if (aliq !== '' && aliq != null && !(Number(aliq) >= 0 && Number(aliq) < 10)) e.push('Alíquota do ISS inválida (use de 2 a 5%).');
  const valor = Number(nota.valor);
  if (!(valor > 0)) e.push('O valor do serviço deve ser maior que zero.');
  if (valor > 1e13) e.push('Valor do serviço muito alto.');
  if (!texto(nota.descricao, true)) e.push('Descreva o serviço prestado.');
  const comp = String(nota.competencia || '').slice(0, 10);
  if (!/^20\d\d-\d\d-\d\d$/.test(comp)) e.push('Informe a data de competência.');
  else if (comp > hojeBrasilia()) e.push('A competência não pode ser depois de hoje.');
  const loc = digitos(nota.cLocPrestacao || emissor.cMun);
  if (loc.length !== 7) e.push('Informe o município onde o serviço foi prestado.');
  if (String(nota.retido || '1') === '2' && !(nota.tomador && digitos(nota.tomador.documento))) e.push('ISS retido exige o CPF ou CNPJ do tomador.');
  const to = nota.tomador;
  if (to && (digitos(to.documento) || texto(to.nome))) {
    const d = digitos(to.documento);
    if (d && !(d.length === 14 ? cnpjValido(d) : cpfValido(d))) e.push('CPF ou CNPJ do tomador inválido.');
    if (!d) e.push('Informe o CPF ou CNPJ do tomador.');
    if (!texto(to.nome)) e.push('Informe o nome do tomador.');
    const en = to.end || {};
    const algum = [en.cep, en.logradouro, en.numero, en.bairro, en.cMun].some((x) => String(x || '').trim());
    if (algum && !(digitos(en.cep).length === 8 && digitos(en.cMun).length === 7 && texto(en.logradouro) && texto(en.bairro))) e.push('Endereço do tomador incompleto: informe CEP, município, logradouro e bairro (ou deixe todo o endereço em branco).');
    if (to.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to.email).trim())) e.push('E-mail do tomador inválido.');
  }
  return e;
}

// ---------- montagem ----------
export function montarDps({ ambiente, serie, numero, emissor, nota, dhEmi }) {
  const erros = validar(emissor, nota);
  if (erros.length) throw new ErroDPS(erros);
  const doc = digitos(emissor.documento);
  const cLocEmi = digitos(emissor.cMun);
  const id = idDps({ cLocEmi, documento: doc, serie, numero });
  const op = String(emissor.opSimpNac);
  const reg = t('opSimpNac', op) + (op === '3' ? t('regApTribSN', String(emissor.regApTribSN)) : '') + t('regEspTrib', String(emissor.regEspTrib || '0'));
  const prest = t(doc.length === 14 ? 'CNPJ' : 'CPF', doc) + opc('IM', texto(emissor.im).slice(0, 15)) +
    opc('fone', digitos(emissor.fone).length >= 6 ? digitos(emissor.fone).slice(0, 20) : '') + opc('email', texto(emissor.email).slice(0, 80)) + tag('regTrib', reg);

  let toma = '';
  const to = nota.tomador;
  if (to && digitos(to.documento)) {
    const d = digitos(to.documento);
    const en = to.end || {};
    const endereco = digitos(en.cep).length === 8 && digitos(en.cMun).length === 7 && texto(en.logradouro) && texto(en.bairro)
      ? tag('end', tag('endNac', t('cMun', digitos(en.cMun)) + t('CEP', digitos(en.cep))) + t('xLgr', texto(en.logradouro).slice(0, 255)) +
        t('nro', (texto(en.numero) || 'S/N').slice(0, 60)) + opc('xCpl', texto(en.complemento).slice(0, 156)) + t('xBairro', texto(en.bairro).slice(0, 60)))
      : '';
    toma = tag('toma', t(d.length === 14 ? 'CNPJ' : 'CPF', d) + opc('IM', texto(to.im).slice(0, 15)) + t('xNome', texto(to.nome).slice(0, 300)) + endereco +
      opc('fone', digitos(to.fone).length >= 6 ? digitos(to.fone).slice(0, 20) : '') + opc('email', texto(to.email).slice(0, 80)));
  }

  const cTribMun = digitos(nota.cTribMun != null ? nota.cTribMun : emissor.cTribMun);
  const serv = tag('serv', tag('locPrest', t('cLocPrestacao', digitos(nota.cLocPrestacao || emissor.cMun))) +
    tag('cServ', t('cTribNac', digitos(nota.cTribNac || emissor.cTribNac)) + opc('cTribMun', cTribMun) + t('xDescServ', texto(nota.descricao, true).slice(0, 2000)) + opc('cNBS', digitos(emissor.cNBS))));

  const aliq = nota.aliquota != null && nota.aliquota !== '' ? nota.aliquota : emissor.aliquota;
  const tribMun = t('tribISSQN', '1') + t('tpRetISSQN', String(nota.retido || '1')) + (aliq !== '' && aliq != null && Number(aliq) > 0 ? t('pAliq', dec(aliq)) : '');
  const totTrib = op === '3' ? t('pTotTribSN', dec(emissor.pTotTribSN)) : t('indTotTrib', '0');
  const valores = tag('valores', tag('vServPrest', t('vServ', dec(nota.valor))) + tag('trib', tag('tribMun', tribMun) + tag('totTrib', totTrib)));

  const inf = t('tpAmb', String(ambiente)) + t('dhEmi', dhEmi || dataHoraBrasilia(Date.now() - 60000)) + t('verAplic', VER_APLIC) +
    t('serie', String(Number(serie))) + t('nDPS', String(Number(numero))) + t('dCompet', String(nota.competencia).slice(0, 10)) +
    t('tpEmit', '1') + t('cLocEmi', cLocEmi) + tag('prest', prest) + toma + serv + valores;
  return { id, infDPS: `<infDPS Id="${id}">${inf}</infDPS>`, raiz: 'DPS' };
}

// ---------- assinatura (XMLDSig envelopada, RSA-SHA256, C14N 1.0) ----------
// elemento: o XML do elemento assinado (ex.: <infDPS Id="...">...</infDPS>), sem a declaração de namespace;
// raiz: nome do elemento que o envolve (DPS ou pedRegEvento), que declara o namespace da NFS-e.
export function assinar({ raiz, id, elemento }, chavePrivada, certificado) {
  // Na forma canônica o elemento herda o namespace padrão do pai
  const canon = elemento.replace(/^<(\w+)/, `<$1 xmlns="${NS}"`);
  const digest = crypto.createHash('sha256').update(canon, 'utf8').digest('base64');
  const signedInfo = `<SignedInfo><CanonicalizationMethod Algorithm="${C14N}"></CanonicalizationMethod>` +
    `<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"></SignatureMethod>` +
    `<Reference URI="#${id}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform>` +
    `<Transform Algorithm="${C14N}"></Transform></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod>` +
    `<DigestValue>${digest}</DigestValue></Reference></SignedInfo>`;
  const canonSI = signedInfo.replace('<SignedInfo>', `<SignedInfo xmlns="${DS}">`);
  const valor = crypto.sign('sha256', Buffer.from(canonSI, 'utf8'), chavePrivada).toString('base64');
  const der = certificado.raw.toString('base64');
  const assinatura = `<Signature xmlns="${DS}">${signedInfo}<SignatureValue>${valor}</SignatureValue><KeyInfo><X509Data><X509Certificate>${der}</X509Certificate></X509Data></KeyInfo></Signature>`;
  return `<?xml version="1.0" encoding="UTF-8"?><${raiz} xmlns="${NS}" versao="${VERSAO}">${elemento}${assinatura}</${raiz}>`;
}

export function dpsAssinada(dados, chavePrivada, certificado) {
  const m = montarDps(dados);
  return { id: m.id, xml: assinar({ raiz: 'DPS', id: m.id, elemento: m.infDPS }, chavePrivada, certificado) };
}

// ---------- cancelamento (evento 101101) ----------
// motivo: 1 = erro na emissão, 2 = serviço não prestado, 9 = outros
export function pedidoCancelamento({ ambiente, documento, chave, motivo, justificativa, dhEvento }) {
  const e = [];
  const ch = digitos(chave);
  if (ch.length !== 50) e.push('Chave de acesso da NFS-e inválida.');
  if (!['1', '2', '9'].includes(String(motivo))) e.push('Escolha o motivo do cancelamento.');
  const just = texto(justificativa).slice(0, 255);
  if (just.length < 15) e.push('Explique o motivo do cancelamento com pelo menos 15 letras.');
  if (e.length) throw new ErroDPS(e);
  const doc = digitos(documento);
  const id = 'PRE' + ch + '101101';
  const inf = t('tpAmb', String(ambiente)) + t('verAplic', VER_APLIC) + t('dhEvento', dhEvento || dataHoraBrasilia(Date.now() - 60000)) +
    t(doc.length === 14 ? 'CNPJAutor' : 'CPFAutor', doc) + t('chNFSe', ch) +
    tag('e101101', t('xDesc', 'Cancelamento de NFS-e') + t('cMotivo', String(motivo)) + t('xMotivo', just));
  return { id, elemento: `<infPedReg Id="${id}">${inf}</infPedReg>`, raiz: 'pedRegEvento' };
}

// ---------- leitura da NFS-e autorizada (para o DANFSe e o registro) ----------
function valorTag(xml, nome) {
  const m = new RegExp(`<(?:\\w+:)?${nome}(?:\\s[^>]*)?>([^<]*)</(?:\\w+:)?${nome}>`).exec(xml);
  return m ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&') : '';
}
function bloco(xml, nome) {
  const m = new RegExp(`<(?:\\w+:)?${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${nome}>`).exec(xml);
  return m ? m[1] : '';
}
export function lerNfse(xml) {
  const inf = bloco(xml, 'infNFSe') || xml;
  const emit = bloco(inf, 'emit');
  const enderEmit = bloco(emit, 'enderNac');
  const dps = bloco(inf, 'infDPS');
  const toma = bloco(dps, 'toma');
  const vals = bloco(inf, 'valores');
  const idMatch = /<(?:\w+:)?infNFSe[^>]*\sId="NFS(\d{50})"/.exec(xml);
  return {
    chave: idMatch ? idMatch[1] : '',
    numero: valorTag(inf, 'nNFSe'),
    numeroDfse: valorTag(inf, 'nDFSe'),
    localEmissao: valorTag(inf, 'xLocEmi'),
    localPrestacao: valorTag(inf, 'xLocPrestacao'),
    localIncidencia: valorTag(inf, 'xLocIncid'),
    tributacaoNacional: valorTag(inf, 'xTribNac'),
    tributacaoMunicipal: valorTag(inf, 'xTribMun'),
    processadaEm: valorTag(inf, 'dhProc'),
    ambiente: valorTag(inf, 'ambGer') ? valorTag(dps, 'tpAmb') : '',
    emitente: {
      documento: valorTag(emit, 'CNPJ') || valorTag(emit, 'CPF'), nome: valorTag(emit, 'xNome'), fantasia: valorTag(emit, 'xFant'), im: valorTag(emit, 'IM'),
      logradouro: valorTag(enderEmit, 'xLgr'), numero: valorTag(enderEmit, 'nro'), bairro: valorTag(enderEmit, 'xBairro'), cMun: valorTag(enderEmit, 'cMun'),
      uf: valorTag(enderEmit, 'UF'), cep: valorTag(enderEmit, 'CEP'), fone: valorTag(emit, 'fone'), email: valorTag(emit, 'email'),
    },
    tomador: toma ? { documento: valorTag(toma, 'CNPJ') || valorTag(toma, 'CPF'), nome: valorTag(toma, 'xNome'), email: valorTag(toma, 'email'), logradouro: valorTag(toma, 'xLgr'), numero: valorTag(toma, 'nro'), bairro: valorTag(toma, 'xBairro'), cep: valorTag(toma, 'CEP') } : null,
    dps: { serie: valorTag(dps, 'serie'), numero: valorTag(dps, 'nDPS'), emissao: valorTag(dps, 'dhEmi'), competencia: valorTag(dps, 'dCompet'), tpAmb: valorTag(dps, 'tpAmb') },
    servico: { cTribNac: valorTag(dps, 'cTribNac'), cTribMun: valorTag(dps, 'cTribMun'), descricao: valorTag(dps, 'xDescServ') },
    valores: {
      servico: Number(valorTag(dps, 'vServ')) || 0, baseCalculo: Number(valorTag(vals, 'vBC')) || 0, aliquota: Number(valorTag(vals, 'pAliqAplic')) || 0,
      iss: Number(valorTag(vals, 'vISSQN')) || 0, retido: Number(valorTag(vals, 'vTotalRet')) || 0, liquido: Number(valorTag(vals, 'vLiq')) || 0,
      tpRetISSQN: valorTag(dps, 'tpRetISSQN'), pTotTribSN: valorTag(dps, 'pTotTribSN'),
    },
  };
}
