'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authFetch } from '../../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { NOME_PAGINA, NOME_ORIGEM } from '../../lib/estatisticas';

const NOME_PLANO = { basic: 'Básico', intermediate: 'Intermediário', complete: 'Completo', unlimited: 'Escritório' };
const SITUACAO = {
  admin: ['Administrador', 'cinza'],
  assinante: ['Assinante', 'verde'],
  teste_com_cartao: ['Teste com cartão', 'verde'],
  teste: ['Em teste', 'ouro'],
  pagamento_pendente: ['Pagamento pendente', 'vermelho'],
  teste_acabou: ['Teste acabou', 'vermelho'],
  cancelou: ['Cancelou', 'cinza'],
};
const FILTROS = [['todas', 'Todas'], ['teste', 'Em teste'], ['acabando', 'Teste acabando'], ['pagantes', 'Assinantes'], ['acabou', 'Teste acabou'], ['parados', 'Sem uso há 7+ dias']];

const moeda = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v) => Number(v || 0).toLocaleString('pt-BR');
const dataBR = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');
const diaBR = (dia) => dia.slice(8, 10) + '/' + dia.slice(5, 7);
const diasDesde = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : null);
const diasAte = (iso) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5) : null);
const quando = (iso) => { const d = diasDesde(iso); return d === null ? 'nunca' : d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`; };

function Barras({ titulo, dados, campo, total }) {
  const max = Math.max(1, ...dados.map((d) => d[campo]));
  const passo = max <= 5 ? 1 : Math.ceil(max / 4);
  const marcas = []; for (let v = 0; v <= max; v += passo) marcas.push(v);
  return (
    <div className="ad-cartao">
      <div className="ad-cartao-topo"><h2>{titulo}</h2><span>{num(total)} em 30 dias</span></div>
      <div className="ad-grafico" role="img" aria-label={`${titulo}: ${num(total)} nos últimos 30 dias`}>
        <div className="ad-eixo">{marcas.slice().reverse().map((v) => <span key={v} style={{ bottom: `${(v / max) * 100}%` }}>{v}</span>)}</div>
        <div className="ad-barras">
          {marcas.map((v) => <i key={v} className="ad-grade" style={{ bottom: `${(v / max) * 100}%` }} />)}
          {dados.map((d) => (
            <div key={d.dia} className="ad-coluna" title={`${diaBR(d.dia)}: ${num(d[campo])}`}>
              <div className="ad-barra" style={{ height: d[campo] ? `${Math.max(2, (d[campo] / max) * 100)}%` : 0 }} />
              <div className="ad-dica">{diaBR(d.dia)} · <b>{num(d[campo])}</b></div>
            </div>
          ))}
        </div>
      </div>
      <div className="ad-datas"><span>{diaBR(dados[0].dia)}</span><span>{diaBR(dados[Math.floor(dados.length / 2)].dia)}</span><span>hoje</span></div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [verRobos, setVerRobos] = useState(false);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(false);

  const carregar = async () => {
    setCarregando(true); setErro('');
    try {
      const r = await authFetch('/api/admin/resumo');
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErro(d.error || 'Não consegui carregar os números.'); else setDados(d);
    } catch { setErro('Sem conexão com o servidor agora.'); }
    setCarregando(false);
  };
  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [loading, user, router]);
  useEffect(() => { if (user) carregar(); }, [user]);

  const r = useMemo(() => {
    if (!dados) return null;
    const contas = dados.contas.filter((c) => verRobos || !c.robo);
    const clientes = contas.filter((c) => c.situacao !== 'admin');
    const ultimos7 = dados.dias.slice(-7);
    const soma = (lista, k) => lista.reduce((a, d) => a + (d[k] || 0), 0);
    const pagantes = clientes.filter((c) => c.situacao === 'assinante');
    const comCartao = clientes.filter((c) => c.situacao === 'teste_com_cartao');
    const emTeste = clientes.filter((c) => c.situacao === 'teste');
    const acabando = clientes.filter((c) => (c.situacao === 'teste' || c.situacao === 'teste_com_cartao') && diasAte(c.fimTeste) <= 2);
    const mensal = (c) => (typeof c.valorMensal === 'number' && c.valorMensal > 0 ? c.valorMensal : (dados.precos[c.plano] || 0));
    const receita = pagantes.reduce((a, c) => a + mensal(c), 0);
    const receitaFutura = comCartao.reduce((a, c) => a + mensal(c), 0);
    const novas7 = clientes.filter((c) => diasDesde(c.criadoEm) < 7).length;
    // origens e páginas somadas nos 30 dias
    const origens = {}, cadOrig = {}, paginas = {};
    dados.dias.forEach((d) => {
      Object.entries(d.origens).forEach(([k, v]) => { origens[k] = (origens[k] || 0) + v; });
      Object.entries(d.cadastrosPorOrigem).forEach(([k, v]) => { cadOrig[k] = (cadOrig[k] || 0) + v; });
      Object.entries(d.paginas).forEach(([k, v]) => { paginas[k] = (paginas[k] || 0) + v; });
    });
    const tabOrigens = Object.keys({ ...origens, ...cadOrig }).map((k) => ({ k, visitantes: origens[k] || 0, cadastros: cadOrig[k] || 0 })).sort((a, b) => b.visitantes - a.visitantes || b.cadastros - a.cadastros);
    const tabPaginas = Object.entries(paginas).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
    const filtradas = clientes.filter((c) => {
      if (busca && !(c.email + ' ' + c.nome).toLowerCase().includes(busca.toLowerCase())) return false;
      if (filtro === 'teste') return c.situacao === 'teste' || c.situacao === 'teste_com_cartao';
      if (filtro === 'acabando') return acabando.includes(c);
      if (filtro === 'pagantes') return c.situacao === 'assinante' || c.situacao === 'teste_com_cartao';
      if (filtro === 'acabou') return c.situacao === 'teste_acabou' || c.situacao === 'cancelou' || c.situacao === 'pagamento_pendente';
      if (filtro === 'parados') { const d = diasDesde(c.ultimaAlteracao || c.ultimoLogin); return d === null || d >= 7; }
      return true;
    });
    return {
      clientes, filtradas, pagantes, comCartao, emTeste, acabando, receita, receitaFutura, novas7, tabOrigens, tabPaginas,
      vis7: soma(ultimos7, 'visitantes'), visitas7: soma(ultimos7, 'visitas'), cad7: soma(ultimos7, 'cadastros'),
      vis30: soma(dados.dias, 'visitantes'), cad30: soma(dados.dias, 'cadastros'), visHoje: dados.dias[dados.dias.length - 1].visitantes,
      contagem: Object.fromEntries(FILTROS.map(([id]) => [id, null])),
    };
  }, [dados, filtro, verRobos, busca]);

  return (
    <div className="ad">
      <style dangerouslySetInnerHTML={{ __html: ESTILO }} />
      <header className="ad-topo">
        <div className="ad-cx ad-topo-in">
          <Link href="/" className="ad-marca"><img src="/logo.svg" alt="" width="34" height="34" />Landim Advisory</Link>
          <span className="ad-tag">Administrador</span>
          <div className="ad-acoes">
            <button type="button" className="ad-btn" onClick={carregar} disabled={carregando}>{carregando ? 'Atualizando…' : '↻ Atualizar'}</button>
            <Link href="/dashboard" className="ad-btn ad-btn-p">Abrir o sistema</Link>
          </div>
        </div>
      </header>

      <main className="ad-cx ad-corpo">
        <div className="ad-titulo">
          <h1>Painel do administrador</h1>
          <p>{dados ? `Números de ${dataBR(dados.geradoEm)}, às ${new Date(dados.geradoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}. As visitas contam desde a instalação do contador.` : 'Carregando os números…'}</p>
        </div>

        {erro && <div className="ad-erro">{erro}</div>}
        {!r && !erro && <div className="ad-vazio">Carregando…</div>}

        {r && (
          <>
            <section className="ad-kpis" aria-label="Resumo">
              <div className="ad-kpi"><small>Visitantes nos últimos 7 dias</small><b>{num(r.vis7)}</b><span>{num(r.visHoje)} hoje · {num(r.visitas7)} páginas vistas</span></div>
              <div className="ad-kpi"><small>Contas criadas nos últimos 7 dias</small><b>{num(r.novas7)}</b><span>{num(r.clientes.length)} no total</span></div>
              <div className="ad-kpi"><small>Em teste grátis agora</small><b>{num(r.emTeste.length + r.comCartao.length)}</b><span className={r.acabando.length ? 'ad-alerta' : ''}>{r.acabando.length ? `${r.acabando.length} acabando em até 2 dias` : 'nenhum acabando nos próximos 2 dias'}</span></div>
              <div className="ad-kpi ad-kpi-ouro"><small>Receita mensal (assinantes)</small><b>{moeda(r.receita)}</b><span>{num(r.pagantes.length)} {r.pagantes.length === 1 ? 'assinante' : 'assinantes'}{r.comCartao.length ? ` · + ${moeda(r.receitaFutura)} quando ${r.comCartao.length} teste(s) acabar(em)` : ''}{dados.fundador ? ` · fundadores: ${dados.fundador.usados} de ${dados.fundador.vagas}` : ''}</span></div>
            </section>

            <section className="ad-dois">
              <Barras titulo="Visitantes por dia" dados={dados.dias} campo="visitantes" total={r.vis30} />
              <Barras titulo="Contas criadas por dia" dados={dados.dias} campo="cadastros" total={r.cad30} />
            </section>

            <section className="ad-dois">
              <div className="ad-cartao">
                <div className="ad-cartao-topo"><h2>De onde vieram</h2><span>últimos 30 dias</span></div>
                {r.tabOrigens.length ? (
                  <div className="ad-rolagem"><table className="ad-tab">
                    <thead><tr><th>Origem</th><th className="n">Visitantes</th><th className="n">Contas criadas</th><th className="n">Conversão</th></tr></thead>
                    <tbody>{r.tabOrigens.map((o) => (
                      <tr key={o.k}><td>{NOME_ORIGEM[o.k] || o.k}</td><td className="n">{num(o.visitantes)}</td><td className="n">{num(o.cadastros)}</td><td className="n">{o.visitantes ? ((o.cadastros / o.visitantes) * 100).toFixed(1).replace('.', ',') + '%' : '—'}</td></tr>
                    ))}</tbody>
                  </table></div>
                ) : <p className="ad-vazio">Ainda sem visitas registradas. Elas aparecem aqui assim que alguém abrir o site.</p>}
                <p className="ad-nota">Para saber de qual post veio cada visita, use links com a origem, como <code>landimadvisory.com.br/?utm_source=whatsapp</code>.</p>
              </div>
              <div className="ad-cartao">
                <div className="ad-cartao-topo"><h2>Páginas mais vistas</h2><span>últimos 30 dias</span></div>
                {r.tabPaginas.length ? (
                  <div className="ad-rolagem"><table className="ad-tab">
                    <thead><tr><th>Página</th><th className="n">Vezes vista</th></tr></thead>
                    <tbody>{r.tabPaginas.map((p) => <tr key={p.k}><td>{NOME_PAGINA[p.k] || p.k}</td><td className="n">{num(p.v)}</td></tr>)}</tbody>
                  </table></div>
                ) : <p className="ad-vazio">Ainda sem visitas registradas.</p>}
              </div>
            </section>

            <section className="ad-cartao">
              <div className="ad-cartao-topo"><h2>Contas</h2><span>{num(r.filtradas.length)} de {num(r.clientes.length)}</span></div>
              <div className="ad-filtros">
                <div className="ad-chips" role="group" aria-label="Filtrar contas">
                  {FILTROS.map(([id, nome]) => <button key={id} type="button" className={'ad-chip' + (filtro === id ? ' on' : '')} aria-pressed={filtro === id} onClick={() => setFiltro(id)}>{nome}</button>)}
                </div>
                <label className="ad-busca"><span className="ad-sr">Buscar por e-mail ou nome</span><input id="adBusca" type="search" placeholder="Buscar e-mail ou nome" value={busca} onChange={(e) => setBusca(e.target.value)} /></label>
              </div>
              {r.filtradas.length ? (
                <div className="ad-rolagem">
                  <table className="ad-tab ad-contas">
                    <thead><tr><th>Conta</th><th>Situação</th><th>Plano</th><th>Criada em</th><th>Teste / próxima cobrança</th><th>Último uso</th><th className="n">Empresas</th><th></th></tr></thead>
                    <tbody>{r.filtradas.map((c) => {
                      const [rot, cor] = SITUACAO[c.situacao] || [c.situacao, 'cinza'];
                      const fim = diasAte(c.fimTeste);
                      const prazo = c.situacao === 'teste' ? (fim <= 0 ? 'acaba hoje' : `acaba em ${fim} ${fim === 1 ? 'dia' : 'dias'}`)
                        : (c.situacao === 'assinante' || c.situacao === 'teste_com_cartao') && c.renovaEm ? (c.forma === 'pix/boleto' ? `Pix/boleto, pago até ${dataBR(c.renovaEm)}` : `${c.situacao === 'teste_com_cartao' ? '1ª cobrança' : 'renova'} ${dataBR(c.renovaEm)}${c.cancelaNoFim ? ' (vai cancelar)' : ''}`)
                          : c.situacao === 'teste_acabou' ? `acabou em ${dataBR(c.fimTeste)}` : '—';
                      return (
                        <tr key={c.email + c.criadoEm}>
                          <td><b>{c.email || '(sem e-mail)'}</b>{c.nome && <div className="ad-sub">{c.nome}</div>}{!c.emailConfirmado && c.provedor === 'password' && <div className="ad-sub">e-mail não confirmado</div>}</td>
                          <td><span className={'ad-pilula ' + cor}>{rot}</span></td>
                          <td>{c.plano ? NOME_PLANO[c.plano] || c.plano : '—'}{c.plano && <div className="ad-sub">{c.periodo === 'anual' ? 'anual' : 'mensal'}{c.fundador ? ' · fundador' : ''}</div>}</td>
                          <td>{dataBR(c.criadoEm)}</td>
                          <td>{prazo}</td>
                          <td>{quando(c.ultimaAlteracao || c.ultimoLogin)}</td>
                          <td className="n">{c.empresas || '—'}</td>
                          <td>{c.email && <a className="ad-link" href={`mailto:${c.email}`}>E-mail</a>}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              ) : <p className="ad-vazio">Nenhuma conta neste filtro.</p>}
              <label className="ad-robos"><input id="adRobos" type="checkbox" checked={verRobos} onChange={(e) => setVerRobos(e.target.checked)} /> Mostrar as contas dos testes automáticos</label>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

const ESTILO = `
.ad{--fundo:#F5F6F8;--cartao:#FFFFFF;--tinta:#0B1220;--sub:#4B5565;--fraco:#6B7486;--linha:#E3E6EC;--ouro:#9C7616;--ouro-f:#F6F1E4;--barra:#0B1220;
  background:var(--fundo);color:var(--tinta);min-height:100vh;font-family:var(--font-inter),Inter,system-ui,sans-serif;font-size:15px;line-height:1.5}
.ad a{text-decoration:none}
.ad-cx{max-width:1200px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.ad-topo{background:#0B1220;color:#fff;position:sticky;top:0;z-index:20}
.ad-topo-in{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding-block:12px}
.ad-marca{display:flex;align-items:center;gap:9px;font-weight:900;font-size:17px;color:#fff}.ad-marca img{border-radius:9px}
.ad-tag{font-size:12px;font-weight:800;color:#E2C68C;border:1px solid rgba(197,160,89,.5);border-radius:99px;padding:3px 10px}
.ad-acoes{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}
.ad-btn{display:inline-flex;align-items:center;min-height:40px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:transparent;color:#fff;font:inherit;font-weight:700;font-size:14px;cursor:pointer}
.ad-btn:hover{border-color:#fff}.ad-btn:disabled{opacity:.6;cursor:wait}
.ad-btn-p{background:#C5A059;border-color:#C5A059;color:#0B1220}
.ad-btn:focus-visible,.ad-chip:focus-visible,.ad-busca input:focus-visible{outline:3px solid #C5A059;outline-offset:2px}
.ad-corpo{padding-block:26px 60px;display:flex;flex-direction:column;gap:18px}
.ad-titulo h1{margin:0;font-size:30px;letter-spacing:-.02em;font-weight:900;text-wrap:balance}
.ad-titulo p{margin:4px 0 0;color:var(--sub)}
.ad-erro{background:#FDECEC;color:#8A1C1C;border-radius:12px;padding:14px 16px;font-weight:600}
.ad-vazio{color:var(--fraco);margin:6px 0}
.ad-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.ad-kpi{background:var(--cartao);border:1px solid var(--linha);border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:4px;min-width:0}
.ad-kpi small{color:var(--sub);font-size:13px;font-weight:600}
.ad-kpi b{font-size:30px;font-weight:900;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.ad-kpi span{font-size:13px;color:var(--fraco)}
.ad-kpi-ouro{background:var(--ouro-f);border-color:#E8DCC0}.ad-kpi-ouro b{color:#6E520C}
.ad-alerta{color:#A11B1B!important;font-weight:700}
.ad-dois{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
.ad-cartao{background:var(--cartao);border:1px solid var(--linha);border-radius:16px;padding:18px 20px;min-width:0}
.ad-cartao-topo{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px}
.ad-cartao-topo h2{margin:0;font-size:17px;font-weight:800}.ad-cartao-topo span{color:var(--fraco);font-size:13px}
.ad-grafico{display:flex;gap:8px;height:170px}
.ad-eixo{position:relative;width:26px;flex:none}.ad-eixo span{position:absolute;right:0;transform:translateY(50%);font-size:11px;color:var(--fraco);font-variant-numeric:tabular-nums}
.ad-barras{position:relative;flex:1;display:flex;align-items:flex-end;gap:2px;border-bottom:1px solid var(--linha)}
.ad-grade{position:absolute;left:0;right:0;height:1px;background:#EEF0F3}
.ad-coluna{position:relative;flex:1;height:100%;display:flex;align-items:flex-end;cursor:default}
.ad-barra{width:100%;background:var(--barra);border-radius:4px 4px 0 0;position:relative;z-index:1}
.ad-coluna:hover .ad-barra{background:#C5A059}
.ad-dica{display:none;position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#0B1220;color:#fff;font-size:12px;padding:5px 8px;border-radius:6px;white-space:nowrap;z-index:3}
.ad-coluna:hover .ad-dica{display:block}
.ad-coluna:hover{z-index:4}
.ad-datas{display:flex;justify-content:space-between;margin-left:34px;font-size:11px;color:var(--fraco);margin-top:6px}
.ad-tab{width:100%;border-collapse:collapse;font-size:14px}
.ad-tab th{text-align:left;font-size:12px;color:var(--fraco);font-weight:700;padding:8px 10px;border-bottom:1px solid var(--linha);white-space:nowrap}
.ad-tab td{padding:10px;border-bottom:1px solid #EEF0F3;vertical-align:top}
.ad-tab .n{text-align:right;font-variant-numeric:tabular-nums}
.ad-rolagem{overflow-x:auto;max-width:100%}
.ad-contas{min-width:920px}
.ad-sub{font-size:12px;color:var(--fraco)}
.ad-nota{font-size:12.5px;color:var(--fraco);margin:12px 0 0}.ad-nota code{background:#EEF0F3;border-radius:4px;padding:1px 5px}
.ad-filtros{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.ad-chips{display:flex;gap:6px;flex-wrap:wrap}
.ad-chip{min-height:36px;padding:0 13px;border-radius:99px;border:1px solid var(--linha);background:#fff;color:var(--sub);font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.ad-chip.on{background:#0B1220;border-color:#0B1220;color:#fff}
.ad-busca{margin-left:auto}.ad-busca input{min-height:38px;border:1px solid var(--linha);border-radius:9px;padding:0 12px;font:inherit;font-size:14px;width:230px;max-width:100%;box-sizing:border-box}
.ad-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.ad-pilula{display:inline-block;font-size:12px;font-weight:800;border-radius:99px;padding:3px 10px;white-space:nowrap}
.ad-pilula.verde{background:#E7F6EF;color:#0B6B4A}.ad-pilula.ouro{background:var(--ouro-f);color:#6E520C}.ad-pilula.vermelho{background:#FDECEC;color:#A11B1B}.ad-pilula.cinza{background:#EEF0F3;color:#4B5565}
.ad-link{color:#6E520C;font-weight:700;font-size:13px}
.ad-robos{display:flex;gap:8px;align-items:center;margin-top:12px;font-size:13px;color:var(--fraco)}
@media (max-width:960px){.ad-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.ad-dois{grid-template-columns:1fr}}
@media (max-width:520px){.ad-cartao{padding:16px 14px}.ad-tab th,.ad-tab td{padding:8px 6px}.ad-kpis{grid-template-columns:1fr}.ad-busca{margin-left:0;width:100%}.ad-busca input{width:100%}.ad-titulo h1{font-size:25px}}
`;
