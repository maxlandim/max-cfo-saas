'use client';

// Planos da Landim Advisory, usados na página inicial e na página de preços.
// Cada plano soma recursos ao anterior e cabe mais empresas no login.
export const PLANOS_VITRINE = [
  { id: 'basic', nome: 'Básico', preco: '49,90', empresas: '1 empresa', para: 'O financeiro da empresa em ordem.',
    itens: ['Contas a receber e a pagar', 'Bancos, caixa e cartão', 'Fluxo de caixa de 90 dias', 'DRE e centro de custo', 'Importação do extrato do banco', 'Cobrança por Pix no WhatsApp'] },
  { id: 'intermediate', nome: 'Intermediário', preco: '129,90', empresas: 'Até 3 empresas', para: 'Para quem vende, emite nota e quer automatizar.', antes: 'Tudo do Básico, mais:',
    itens: ['Leitura de boleto e nota com IA', 'Relatório mensal em PDF', 'Orçamentos, ordens de serviço e contratos', 'Funil de vendas, comissões e estoque', 'Notas fiscais e pacote do contador'] },
  { id: 'complete', nome: 'Completo', preco: '269,90', empresas: 'Até 10 empresas', para: 'Para BPO financeiro e escritórios.', destaque: true, antes: 'Tudo do Intermediário, mais:',
    itens: ['Painel com todas as empresas (BPO)', 'Relatório com a sua marca e logo', 'CFO com IA que responde com os números', 'Simulador de impostos e da reforma', 'Funcionários e folha, bens e equipe', 'Suporte prioritário no WhatsApp'] },
  { id: 'unlimited', nome: 'Ilimitado', preco: '299,90', empresas: 'Empresas ilimitadas', para: 'Para escritórios e grupos com muitas empresas.', antes: 'Tudo do Completo, mais:',
    itens: ['Empresas sem limite', 'Suporte prioritário no WhatsApp'] },
];

// Em todos os planos
export const INCLUSO = [
  'Dados na nuvem, separados por empresa',
  'Funciona no computador e no celular',
  'Tema claro ou escuro',
  'Backup completo quando quiser',
  'Sem fidelidade: cancele quando quiser',
  '7 dias grátis com tudo liberado',
];

export function CardsPlanos({ onEscolher, carregando, textoBotao }) {
  return (
    <div className="pl-grade">
      {PLANOS_VITRINE.map((p) => (
        <div key={p.id} className={'pl-card' + (p.destaque ? ' pl-dest' : '')}>
          {p.destaque && <div className="pl-selo">Mais escolhido por BPOs</div>}
          <div className="pl-nome">{p.nome}</div>
          <div className="pl-preco"><small>R$</small>{p.preco}<span>/mês</span></div>
          <div className="pl-emp">{p.empresas}</div>
          <p className="pl-para">{p.para}</p>
          {p.antes && <div className="pl-antes">{p.antes}</div>}
          <ul className="pl-lista">
            {p.itens.map((i) => <li key={i}>{i}</li>)}
          </ul>
          <button type="button" disabled={carregando} onClick={() => onEscolher(p.id)} className={p.destaque ? 'pl-btn pl-btn-ouro' : 'pl-btn'}>
            {carregando ? 'Abrindo…' : (textoBotao ? textoBotao(p) : 'Começar grátis')}
          </button>
        </div>
      ))}
    </div>
  );
}

export const ESTILO_PLANOS = `
.pl-grade{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;width:100%}
.pl-card{position:relative;background:#fff;border:1px solid #E3E6EC;border-radius:18px;padding:24px 22px;display:flex;flex-direction:column;text-align:left;box-shadow:0 2px 10px rgba(11,18,32,.04)}
.pl-dest{border:2px solid #C5A059;box-shadow:0 14px 40px rgba(197,160,89,.18)}
.pl-selo{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#C5A059;color:#0B1220;font-size:11.5px;font-weight:800;padding:4px 12px;border-radius:99px;white-space:nowrap}
.pl-nome{font-size:17px;font-weight:800;color:#0B1220}
.pl-preco{font-size:38px;font-weight:900;color:#0B1220;letter-spacing:-.02em;margin:10px 0 2px;line-height:1}
.pl-preco small{font-size:16px;font-weight:700;margin-right:3px;vertical-align:top;position:relative;top:6px}
.pl-preco span{font-size:14px;font-weight:500;color:#5B6474;margin-left:2px}
.pl-emp{display:inline-block;margin-top:10px;background:#F6F1E4;color:#7A5A12;font-weight:700;font-size:13px;padding:5px 10px;border-radius:8px;align-self:flex-start}
.pl-para{color:#5B6474;font-size:14px;line-height:1.5;margin:12px 0 0;min-height:42px}
.pl-antes{margin-top:14px;font-size:12.5px;font-weight:800;color:#7A5A12}
.pl-lista{list-style:none;padding:0;margin:8px 0 20px;flex:1;font-size:14px;color:#1E2533}
.pl-lista li{padding:5px 0 5px 24px;position:relative}
.pl-lista li:before{content:'✓';position:absolute;left:0;color:#0E9F6E;font-weight:900}
.pl-btn{width:100%;padding:13px;border-radius:10px;border:1.5px solid #0B1220;background:#fff;color:#0B1220;font-weight:800;font-size:15px;cursor:pointer;transition:all .15s}
.pl-btn:hover{background:#0B1220;color:#fff}
.pl-btn-ouro{background:#C5A059;border-color:#C5A059;color:#0B1220}
.pl-btn-ouro:hover{background:#B08D47;border-color:#B08D47;color:#0B1220}
.pl-btn:disabled{opacity:.6;cursor:wait}
@media (max-width:1000px){.pl-grade{grid-template-columns:repeat(2,1fr)}}
@media (max-width:560px){.pl-grade{grid-template-columns:1fr}.pl-para{min-height:0}}
`;
