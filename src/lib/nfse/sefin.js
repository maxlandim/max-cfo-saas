// Cliente da API da Sefin Nacional (NFS-e padrão nacional), com TLS mútuo usando o certificado A1 da empresa.
// Produção restrita (testes, sem valor fiscal) e produção.
import https from 'https';
import zlib from 'zlib';

export const BASES = {
  1: 'https://sefin.nfse.gov.br/SefinNacional',
  2: 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
};
export const consultaPublica = (chave) => `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${encodeURIComponent(chave)}`;

export const gzipB64 = (xml) => zlib.gzipSync(Buffer.from(xml, 'utf8')).toString('base64');
export const ungzipB64 = (b64) => zlib.gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');

export class ErroSefin extends Error {
  constructor(mensagens, status, codigos = []) { super(mensagens.join(' ')); this.mensagens = mensagens; this.status = status; this.codigos = codigos; }
}

// A API varia maiúsculas e minúsculas entre versões
function pegar(obj, ...chaves) {
  if (!obj || typeof obj !== 'object') return undefined;
  const mapa = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
  for (const k of chaves) if (mapa[k.toLowerCase()] !== undefined) return mapa[k.toLowerCase()];
  return undefined;
}
function mensagens(dados, chave = 'erros') {
  let itens = pegar(dados, chave, chave.slice(0, -1)) || [];
  if (!Array.isArray(itens)) itens = [itens];
  return itens.map((e) => {
    if (!e || typeof e !== 'object') return String(e);
    const cod = pegar(e, 'codigo', 'code') || '';
    const desc = pegar(e, 'descricao', 'mensagem', 'message') || '';
    const comp = pegar(e, 'complemento') || '';
    return [cod, desc, comp ? `(${comp})` : ''].filter(Boolean).join(' ').trim();
  }).filter(Boolean);
}

export function cliente({ ambiente, chavePem, certPem, timeout = 60000 }) {
  const base = BASES[Number(ambiente)] || BASES[2];
  const agente = new https.Agent({ key: chavePem, cert: certPem, keepAlive: false, minVersion: 'TLSv1.2' });

  function requisitar(metodo, caminho, corpo) {
    const url = new URL(base + caminho);
    const dados = corpo ? Buffer.from(JSON.stringify(corpo), 'utf8') : null;
    return new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: metodo, agent: agente, timeout,
        headers: { Accept: 'application/json', ...(dados ? { 'Content-Type': 'application/json', 'Content-Length': dados.length } : {}) },
      }, (res) => {
        const partes = [];
        res.on('data', (p) => partes.push(p));
        res.on('end', () => {
          const txt = Buffer.concat(partes).toString('utf8');
          let json = null;
          try { json = txt ? JSON.parse(txt) : {}; } catch { json = null; }
          resolve({ status: res.statusCode, json, texto: txt });
        });
      });
      req.on('timeout', () => req.destroy(Object.assign(new Error('Tempo esgotado'), { code: 'ETIMEDOUT' })));
      req.on('error', reject);
      if (dados) req.write(dados);
      req.end();
    });
  }

  function falha(r) {
    let msgs = r.json ? mensagens(r.json) : [];
    if (!msgs.length) {
      const titulo = /<title>([\s\S]*?)<\/title>/i.exec(r.texto || '');
      let t = titulo ? titulo[1].trim() : String(r.texto || '').slice(0, 200).trim();
      if (r.status === 401 || r.status === 403) t = 'A Sefin não aceitou o certificado. Use o certificado A1 ICP-Brasil válido da própria empresa.' + (t ? ` (${t})` : '');
      msgs = [`HTTP ${r.status}${t ? ': ' + t : ''}`];
    }
    const codigos = msgs.map((m) => m.split(' ')[0]).filter((c) => /^[A-Z]\d{3,4}$/.test(c));
    return new ErroSefin(msgs, r.status, codigos);
  }

  return {
    base,
    async emitir(dpsXml) {
      const r = await requisitar('POST', '/nfse', { dpsXmlGZipB64: gzipB64(dpsXml) });
      const chave = r.json && pegar(r.json, 'chaveAcesso');
      if (r.status >= 400 || !chave) throw falha(r);
      const b64 = pegar(r.json, 'nfseXmlGZipB64');
      return { chave, idDps: pegar(r.json, 'idDps') || '', xml: b64 ? ungzipB64(b64) : '', alertas: mensagens(r.json, 'alertas'), processadaEm: pegar(r.json, 'dataHoraProcessamento') || '' };
    },
    async consultarNfse(chave) {
      const r = await requisitar('GET', '/nfse/' + encodeURIComponent(chave));
      const b64 = r.json && pegar(r.json, 'nfseXmlGZipB64');
      if (r.status >= 400 || !b64) throw falha(r);
      return ungzipB64(b64);
    },
    // Chave da NFS-e gerada por uma DPS (para quando a emissão ficou sem resposta), ou null
    async consultarDps(idDps) {
      const r = await requisitar('GET', '/dps/' + encodeURIComponent(idDps));
      if (r.status === 404) return null;
      if (r.status >= 400) throw falha(r);
      return pegar(r.json, 'chaveAcesso') || null;
    },
    async evento(chave, pedidoXml) {
      const r = await requisitar('POST', `/nfse/${encodeURIComponent(chave)}/eventos`, { pedidoRegistroEventoXmlGZipB64: gzipB64(pedidoXml) });
      if (r.status >= 400) throw falha(r);
      const b64 = r.json && pegar(r.json, 'eventoXmlGZipB64');
      return { xml: b64 ? ungzipB64(b64) : '', processadoEm: pegar(r.json, 'dataHoraProcessamento') || '' };
    },
    // Testa a conexão e o certificado: consulta uma DPS que não existe (404 = conexão aceita)
    async testar() {
      const r = await requisitar('GET', '/dps/DPS' + '0'.repeat(42));
      if (r.status === 401 || r.status === 403 || r.status >= 500) throw falha(r);
      return r.status;
    },
  };
}

// Mensagem amigável para erros de rede/TLS
export function mensagemDeRede(e) {
  const c = String((e && (e.code || e.message)) || '');
  if (/ETIMEDOUT|Tempo esgotado/i.test(c)) return 'A Sefin Nacional demorou para responder. Não sabemos se a nota foi gerada: tente de novo que conferimos antes de emitir outra.';
  if (/CERT|SSL|TLS|handshake|alert/i.test(c)) return 'A Sefin Nacional recusou a conexão segura com o certificado. Confira se o certificado A1 é ICP-Brasil, está válido e é da empresa.';
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET/i.test(c)) return 'Não foi possível falar com a Sefin Nacional agora. Tente de novo em alguns minutos.';
  return 'Falha ao falar com a Sefin Nacional: ' + c.slice(0, 160);
}
