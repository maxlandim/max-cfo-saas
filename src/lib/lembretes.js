// Lembretes de vencimento por e-mail: o que avisar, para quem e com que texto.
// Só funções puras (sem banco nem rede), para a rota /api/lembretes e para os testes.

export const PADRAO = { resumoDono: true, avisarClientes: false, diasAntes: 3, noDia: true, email: '' };

export function hojeBrasil(agora = new Date()) {
  // Data de hoje no horário de Brasília (o servidor roda em UTC)
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
  return p; // AAAA-MM-DD
}
function dia(iso) { const [a, m, d] = String(iso).split('-').map(Number); return Date.UTC(a, m - 1, d); }
export function diffDias(de, ate) { return Math.round((dia(ate) - dia(de)) / 864e5); }
export function dataBR(iso) { const p = String(iso || '').split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : '—'; }
export function moeda(v) { return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());

export function config(estado) {
  const c = Object.assign({}, PADRAO, (estado && estado.settings && estado.settings.lembretes) || {});
  c.diasAntes = Math.min(30, Math.max(1, parseInt(c.diasAntes, 10) || 3));
  return c;
}

// Contas em aberto, separadas por situação em relação a hoje
export function pendencias(estado, hoje) {
  const lista = ((estado && estado.transactions) || []).filter((t) => t && t.status && t.status !== 'pago' && t.vencimento && !t.transferenciaId && Number(t.amount) > 0);
  const com = lista.map((t) => ({ ...t, dias: diffDias(hoje, t.vencimento) }));
  const ord = (a, b) => (a.vencimento < b.vencimento ? -1 : a.vencimento > b.vencimento ? 1 : 0);
  return {
    vencidas: com.filter((t) => t.dias < 0).sort(ord),
    hoje: com.filter((t) => t.dias === 0).sort(ord),
    semana: com.filter((t) => t.dias > 0 && t.dias <= 7).sort(ord),
    todas: com,
  };
}

// ── Pix copia e cola (mesmo formato do painel) ──
function semAcento(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function campo(id, valor) { valor = String(valor); return id + String(valor.length).padStart(2, '0') + valor; }
export function crc16(s) {
  let crc = 0xFFFF;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    crc &= 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
export function pixPayload(o) {
  const nome = semAcento(o.nome || 'RECEBEDOR').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().slice(0, 25) || 'RECEBEDOR';
  const cidade = semAcento(o.cidade || 'BRASILIA').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().slice(0, 15) || 'BRASILIA';
  const txid = String(o.txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  let gui = campo('00', 'br.gov.bcb.pix') + campo('01', o.chave);
  const info = semAcento(o.descricao || '').replace(/[^A-Za-z0-9 .,\-/]/g, '').trim();
  const maxInfo = 99 - gui.length - 4;
  if (info && maxInfo > 0) gui += campo('02', info.slice(0, maxInfo));
  let p = campo('00', '01') + campo('26', gui) + campo('52', '0000') + campo('53', '986');
  if (o.valor > 0) p += campo('54', Number(o.valor).toFixed(2));
  p += campo('58', 'BR') + campo('59', nome) + campo('60', cidade) + campo('62', campo('05', txid)) + '6304';
  return p + crc16(p);
}
export function codigoPix(estado, t) {
  const pix = (estado.settings && estado.settings.pix) || {};
  if (!pix.chave) return '';
  return pixPayload({ chave: pix.chave, nome: pix.nome, cidade: pix.cidade, valor: t.amount, txid: 'MAXCFO' + String(t.id).replace(/[^A-Za-z0-9]/g, '').slice(-15), descricao: t.parcela ? 'Parcela ' + t.parcela : '' });
}

function nomeEmpresa(estado) { return ((estado.settings || {}).company || 'sua empresa').trim(); }

function moldura(titulo, corpo, rodape) {
  return `<!doctype html><html><body style="margin:0;background:#F4F5F7;font-family:Arial,Helvetica,sans-serif;color:#1E2533">
<div style="max-width:620px;margin:0 auto;padding:24px 16px">
<div style="background:#0B1220;border-radius:14px 14px 0 0;padding:18px 22px;color:#fff;font-size:16px;font-weight:bold">Landim <span style="color:#C5A059">Advisory</span></div>
<div style="background:#fff;border-radius:0 0 14px 14px;padding:22px;border:1px solid #E3E6EC;border-top:0">
<h1 style="font-size:19px;margin:0 0 14px;color:#0B1220">${titulo}</h1>${corpo}</div>
<p style="font-size:12px;color:#5B6474;text-align:center;margin-top:14px;line-height:1.5">${rodape}</p></div></body></html>`;
}

function tabela(titulo, itens, cor) {
  if (!itens.length) return '';
  const total = itens.reduce((a, t) => a + Number(t.amount || 0), 0);
  const linhas = itens.slice(0, 15).map((t) => `<tr><td style="padding:7px 6px;border-bottom:1px solid #EEF0F3;white-space:nowrap">${dataBR(t.vencimento)}</td><td style="padding:7px 6px;border-bottom:1px solid #EEF0F3">${esc(t.desc || '')}${t.contato ? `<div style="font-size:12px;color:#5B6474">${esc(t.contato)}</div>` : ''}</td><td style="padding:7px 6px;border-bottom:1px solid #EEF0F3;text-align:right;white-space:nowrap;color:${t.type === 'RECEITA' ? '#0E9F6E' : '#D93636'};font-weight:bold">${t.type === 'RECEITA' ? 'receber' : 'pagar'} ${moeda(t.amount)}</td></tr>`).join('');
  const mais = itens.length > 15 ? `<tr><td colspan="3" style="padding:7px 6px;font-size:12px;color:#5B6474">e mais ${itens.length - 15} conta(s)…</td></tr>` : '';
  return `<h2 style="font-size:15px;margin:18px 0 6px;color:${cor}">${titulo} · ${itens.length} · ${moeda(total)}</h2><table style="width:100%;border-collapse:collapse;font-size:14px">${linhas}${mais}</table>`;
}

// Resumo diário para o dono. Devolve null quando não há nada para avisar.
export function resumoDono(estado, hoje, site) {
  const p = pendencias(estado, hoje);
  if (!p.vencidas.length && !p.hoje.length && !p.semana.length) return null;
  const soma = (l, tipo) => l.filter((t) => t.type === tipo).reduce((a, t) => a + Number(t.amount || 0), 0);
  const partes = [];
  const n = (q, um, varios) => `${q} ${q === 1 ? um : varios}`;
  if (p.hoje.length) partes.push(n(p.hoje.length, 'conta vence hoje', 'contas vencem hoje'));
  if (p.vencidas.length) partes.push(n(p.vencidas.length, 'em atraso', 'em atraso'));
  if (!partes.length) partes.push(n(p.semana.length, 'conta vence nos próximos 7 dias', 'contas vencem nos próximos 7 dias'));
  const empresa = nomeEmpresa(estado);
  const corpo = `<p style="margin:0 0 6px;line-height:1.6">Bom dia! Este é o resumo das contas da <b>${esc(empresa)}</b> em ${dataBR(hoje)}.</p>
<table style="width:100%;border-collapse:collapse;margin:10px 0 4px;font-size:14px"><tr>
<td style="padding:10px;background:#EAF7F1;border-radius:8px"><div style="font-size:12px;color:#5B6474">A receber (atraso + hoje + 7 dias)</div><div style="font-size:18px;font-weight:bold;color:#0E9F6E">${moeda(soma(p.vencidas, 'RECEITA') + soma(p.hoje, 'RECEITA') + soma(p.semana, 'RECEITA'))}</div></td>
<td style="width:10px"></td>
<td style="padding:10px;background:#FDECEC;border-radius:8px"><div style="font-size:12px;color:#5B6474">A pagar (atraso + hoje + 7 dias)</div><div style="font-size:18px;font-weight:bold;color:#D93636">${moeda(soma(p.vencidas, 'DESPESA') + soma(p.hoje, 'DESPESA') + soma(p.semana, 'DESPESA'))}</div></td>
</tr></table>
${tabela('Vencem hoje', p.hoje, '#B07A12')}${tabela('Em atraso', p.vencidas, '#D93636')}${tabela('Próximos 7 dias', p.semana, '#0B1220')}
<p style="margin:20px 0 0"><a href="${esc(site)}/dashboard" style="display:inline-block;background:#C5A059;color:#0B1220;font-weight:bold;text-decoration:none;padding:11px 20px;border-radius:8px">Abrir o painel</a></p>`;
  return {
    assunto: `${empresa}: ${partes.join(' e ')}`,
    html: moldura('Resumo do dia', corpo, `Você recebe este resumo porque ele está ligado em Configurações › Lembretes por e-mail, na Landim Advisory. Para parar, desligue lá.`),
  };
}

// Avisos para os clientes: contas a receber que vencem daqui a N dias (e no próprio dia, se ligado)
export function avisosClientes(estado, hoje, cfg) {
  if (!cfg.avisarClientes) return [];
  const contatos = estado.contatos || {};
  const empresa = nomeEmpresa(estado);
  const pix = (estado.settings && estado.settings.pix) || {};
  return pendencias(estado, hoje).todas
    .filter((t) => t.type === 'RECEITA' && (t.dias === cfg.diasAntes || (cfg.noDia && t.dias === 0)))
    .map((t) => {
      const c = contatos[t.contato || ''] || {};
      const para = String(c.email || '').trim().toLowerCase();
      if (!emailOk(para)) return null;
      const codigo = codigoPix(estado, t);
      const quando = t.dias === 0 ? 'vence <b>hoje</b>' : `vence em <b>${dataBR(t.vencimento)}</b>`;
      const corpo = `<p style="line-height:1.6;margin:0 0 12px">Olá${t.contato ? ', ' + esc(t.contato) : ''}! Passando para lembrar que a cobrança abaixo ${quando}.</p>
<table style="width:100%;border-collapse:collapse;font-size:15px;background:#F8F6F0;border-radius:10px"><tr><td style="padding:14px"><div style="color:#5B6474;font-size:13px">${esc(t.desc || 'Cobrança')}${t.parcela ? ' · parcela ' + esc(t.parcela) : ''}</div><div style="font-size:24px;font-weight:bold;color:#0B1220;margin-top:4px">${moeda(t.amount)}</div><div style="font-size:13px;color:#5B6474;margin-top:2px">Vencimento: ${dataBR(t.vencimento)}</div></td></tr></table>
${codigo ? `<p style="margin:18px 0 6px;font-weight:bold">Pague com Pix copia e cola</p><p style="font-size:13px;color:#5B6474;margin:0 0 6px">No app do banco, escolha Pix › Copia e cola e cole o código abaixo. Recebedor: ${esc(pix.nome || empresa)}.</p><div style="font-family:Consolas,monospace;font-size:12px;word-break:break-all;background:#0B1220;color:#E8EFF8;padding:12px;border-radius:8px">${esc(codigo)}</div>` : ''}
<p style="line-height:1.6;margin:16px 0 0;font-size:14px">Se já pagou, desconsidere esta mensagem. Dúvidas? É só responder este e-mail.</p>
<p style="margin:14px 0 0">Obrigado,<br><b>${esc(empresa)}</b></p>`;
      return {
        para, txId: t.id,
        assunto: `${empresa}: lembrete de vencimento ${t.dias === 0 ? 'hoje' : 'em ' + dataBR(t.vencimento)} — ${moeda(t.amount)}`,
        html: moldura('Lembrete de vencimento', corpo, `Mensagem enviada por ${esc(empresa)} pela Landim Advisory.`),
      };
    })
    .filter(Boolean);
}
