'use client';

import { useEffect, useState } from 'react';

// Planos da Landim Advisory, usados na página inicial e na página de preços.
// Cada plano soma recursos ao anterior e cabe mais empresas no login.
// Valores em centavos, iguais aos de src/lib/plans.js (o servidor é quem cobra).
export const PLANOS_VITRINE = [
  { id: 'basic', nome: 'Básico', valor: 7990, fundador: 4990, empresas: '1 empresa', para: 'O financeiro da empresa em ordem.',
    itens: ['Contas a receber e a pagar', 'Bancos, caixa e cartão', 'Fluxo de caixa de 90 dias', 'DRE e centro de custo', 'Importação do extrato e de planilhas', 'Cobrança por Pix no WhatsApp', 'Lembrete de vencimento por e-mail'] },
  { id: 'intermediate', nome: 'Intermediário', valor: 14990, fundador: 12990, empresas: 'Até 3 empresas', para: 'Para quem vende, emite nota e quer automatizar.', antes: 'Tudo do Básico, mais:',
    itens: ['Leitura automática de boleto e nota', 'Estoque pela nota fiscal (XML ou PDF)', 'Relatório mensal em PDF', 'Orçamentos, ordens de serviço e contratos', 'Funil de vendas, comissões e estoque', 'Emissão de NFS-e (padrão nacional) e pacote do contador'] },
  { id: 'complete', nome: 'Completo', valor: 34990, fundador: 26990, empresas: 'Até 3 empresas', para: 'Para BPO financeiro e escritórios.', destaque: true, antes: 'Tudo do Intermediário, mais:',
    itens: ['Indicadores de todas as empresas (BPO)', 'Acesso de consulta para cliente e contador', 'Relatório com a sua marca e logo', 'CFO que responde com os seus números', 'Simulador de impostos e da reforma', 'Funcionários e folha, bens e equipe'] },
  { id: 'unlimited', nome: 'Escritório', valor: 59990, fundador: 29990, empresas: 'Até 10 empresas', para: 'Para escritórios e BPOs com muitas empresas.', antes: 'Tudo do Completo, mais:',
    itens: ['10 empresas no mesmo login', 'Suporte prioritário no WhatsApp', 'Empresas adicionais por R$ 29,90/mês cada'] },
];
export const MESES_PAGOS_NO_ANUAL = 10;
// Cada empresa a mais (além das incluídas no plano), em qualquer plano — igual a EMPRESA_EXTRA em src/lib/plans.js
export const EMPRESA_EXTRA = 2990;
export const MESES_FUNDADOR = 12;

// Em todos os planos
export const INCLUSO = [
  'Dados na nuvem, separados por empresa',
  'Funciona no computador e no celular',
  'Tema claro ou escuro',
  'Backup completo quando quiser',
  'Cartão, Pix ou boleto',
  'Sem fidelidade: cancele quando quiser',
  '7 dias grátis com tudo liberado',
  'Empresa adicional: R$ 29,90/mês, em qualquer plano',
];

export const reais = (centavos) => (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Vagas de preço de fundador que ainda restam (null enquanto carrega)
export function useFundadores() {
  const [vagas, setVagas] = useState(null);
  useEffect(() => {
    let vivo = true;
    fetch('/api/fundadores').then((r) => r.json()).then((d) => { if (vivo) setVagas(typeof d.vagas === 'number' ? d.vagas : 0); }).catch(() => { if (vivo) setVagas(0); });
    return () => { vivo = false; };
  }, []);
  return vagas;
}

export function CardsPlanos({ onEscolher, carregando, textoBotao }) {
  const [periodo, setPeriodo] = useState('mensal');
  const vagas = useFundadores();
  const fundador = vagas > 0;
  const anual = periodo === 'anual';
  return (
    <div className="pl">
      <div className="pl-barra">
        <div className="pl-periodo" role="group" aria-label="Forma de pagamento">
          <button type="button" className={!anual ? 'on' : ''} aria-pressed={!anual} onClick={() => setPeriodo('mensal')}>Mensal</button>
          <button type="button" className={anual ? 'on' : ''} aria-pressed={anual} onClick={() => setPeriodo('anual')}>Anual <span>2 meses grátis</span></button>
        </div>
        {fundador && <div className="pl-fundador"><b>Preço de fundador</b> para os primeiros assinantes, por {MESES_FUNDADOR} meses · <b>{vagas} {vagas === 1 ? 'vaga' : 'vagas'}</b></div>}
      </div>
      <div className="pl-grade">
        {PLANOS_VITRINE.map((p) => {
          const preco = fundador ? p.fundador : p.valor;
          const total = preco * (anual ? MESES_PAGOS_NO_ANUAL : 1);
          return (
            <div key={p.id} className={'pl-card' + (p.destaque ? ' pl-dest' : '')}>
              {p.destaque && <div className="pl-selo">Mais escolhido por BPOs</div>}
              <div className="pl-nome">{p.nome}</div>
              {fundador && <div className="pl-de">de <s>R$ {reais(p.valor * (anual ? MESES_PAGOS_NO_ANUAL : 1))}</s> por</div>}
              <div className="pl-preco"><small>R$</small>{reais(total)}<span>/{anual ? 'ano' : 'mês'}</span></div>
              <div className="pl-obs">
                {anual ? `equivale a R$ ${reais(Math.round(total / 12))}/mês` : 'cobrado todo mês'}
                {fundador && ` · ${MESES_FUNDADOR} meses com preço de fundador, depois R$ ${reais(p.valor * (anual ? MESES_PAGOS_NO_ANUAL : 1))}`}
              </div>
              <div className="pl-emp">{p.empresas}</div>
              <p className="pl-para">{p.para}</p>
              {p.antes && <div className="pl-antes">{p.antes}</div>}
              <ul className="pl-lista">
                {p.itens.map((i) => <li key={i}>{i}</li>)}
              </ul>
              <button type="button" disabled={carregando} onClick={() => onEscolher(p.id, periodo)} className={p.destaque ? 'pl-btn pl-btn-ouro' : 'pl-btn'}>
                {carregando ? 'Abrindo…' : (textoBotao ? textoBotao(p) : 'Começar grátis')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ESTILO_PLANOS = `
.pl{display:flex;flex-direction:column;gap:22px;width:100%}
.pl-barra{display:flex;flex-direction:column;align-items:center;gap:12px}
.pl-periodo{display:inline-flex;background:#EEF0F3;border-radius:999px;padding:4px;gap:4px}
.pl-periodo button{border:0;background:transparent;font:inherit;font-weight:800;font-size:15px;color:#4B5565;padding:10px 20px;border-radius:999px;cursor:pointer;min-height:44px}
.pl-periodo button.on{background:#0B1220;color:#fff}
.pl-periodo button span{font-size:12px;font-weight:800;color:#0B6B4A;background:#E7F6EF;border-radius:99px;padding:2px 8px;margin-left:6px}
.pl-periodo button.on span{background:#C5A059;color:#0B1220}
.pl-periodo button:focus-visible{outline:3px solid #C5A059;outline-offset:2px}
.pl-fundador{background:#F6F1E4;border:1px solid #E8DCC0;color:#5C440B;border-radius:12px;padding:10px 16px;font-size:14.5px;text-align:center}
.pl-grade{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;width:100%}
.pl-card{position:relative;background:#fff;border:1px solid #E3E6EC;border-radius:18px;padding:24px 22px;display:flex;flex-direction:column;text-align:left;box-shadow:0 2px 10px rgba(11,18,32,.04)}
.pl-dest{border:2px solid #C5A059;box-shadow:0 14px 40px rgba(197,160,89,.18)}
.pl-selo{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#C5A059;color:#0B1220;font-size:11.5px;font-weight:800;padding:4px 12px;border-radius:99px;white-space:nowrap}
.pl-nome{font-size:17px;font-weight:800;color:#0B1220}
.pl-de{margin-top:10px;font-size:13px;color:#6B7486}.pl-de s{color:#6B7486}
.pl-preco{font-size:36px;font-weight:900;color:#0B1220;letter-spacing:-.02em;margin:4px 0 2px;line-height:1.05}
.pl-preco small{font-size:16px;font-weight:700;margin-right:3px;vertical-align:top;position:relative;top:6px}
.pl-preco span{font-size:14px;font-weight:500;color:#5B6474;margin-left:2px}
.pl-obs{font-size:12.5px;color:#5B6474;line-height:1.45;min-height:36px}
.pl-emp{display:inline-block;margin-top:10px;background:#F6F1E4;color:#7A5A12;font-weight:700;font-size:13px;padding:5px 10px;border-radius:8px;align-self:flex-start}
.pl-para{color:#5B6474;font-size:14px;line-height:1.5;margin:12px 0 0;min-height:42px}
.pl-antes{margin-top:14px;font-size:12.5px;font-weight:800;color:#7A5A12}
.pl-lista{list-style:none;padding:0;margin:8px 0 20px;flex:1;font-size:14px;color:#1E2533}
.pl-lista li{padding:5px 0 5px 24px;position:relative}
.pl-lista li:before{content:'✓';position:absolute;left:0;color:#0E9F6E;font-weight:900}
.pl-btn{width:100%;padding:13px;border-radius:10px;border:1.5px solid #0B1220;background:#fff;color:#0B1220;font-weight:800;font-size:15px;cursor:pointer;transition:all .15s;min-height:46px}
.pl-btn:hover{background:#0B1220;color:#fff}
.pl-btn-ouro{background:#C5A059;border-color:#C5A059;color:#0B1220}
.pl-btn-ouro:hover{background:#B08D47;border-color:#B08D47;color:#0B1220}
.pl-btn:disabled{opacity:.6;cursor:wait}
@media (max-width:1000px){.pl-grade{grid-template-columns:repeat(2,1fr)}}
@media (max-width:560px){.pl-grade{grid-template-columns:1fr}.pl-para,.pl-obs{min-height:0}.pl-periodo button{padding:10px 14px}}
`;
