'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CardsPlanos, INCLUSO, ESTILO_PLANOS, useFundadores } from './components/Planos';

const WHATS = 'https://wa.me/5561992105889?text=' + encodeURIComponent('Olá! Quero saber mais sobre a Landim Advisory.');

const RESOLVE = [
  { icone: '🏦', titulo: 'Quanto tenho e quanto vou ter', texto: 'Saldo de cada banco hoje e a previsão dia a dia. O sistema avisa antes de o caixa ficar negativo.' },
  { icone: '📅', titulo: 'Nenhum vencimento esquecido', texto: 'Contas a pagar e a receber num só lugar, com parcelas, recorrência e aviso do que está atrasado.' },
  { icone: '💠', titulo: 'Cobrança por Pix no WhatsApp', texto: 'QR Code e Pix copia e cola com o valor certo e a mensagem pronta para o cliente. Sem taxa nossa.' },
  { icone: '📊', titulo: 'O mês fechado sem planilha', texto: 'Resultado do mês (DRE) calculado dos lançamentos, por categoria e por centro de custo.' },
  { icone: '📄', titulo: 'Relatório em PDF com a sua marca', texto: 'Resumo do mês, gráficos, contas e previsão de caixa num PDF pronto para enviar ao cliente.' },
  { icone: '📷', titulo: 'Boleto lido pela câmera', texto: 'Envie o PDF ou a foto do código de barras: o sistema preenche valor, vencimento e fornecedor. Você só confere.' },
  { icone: '📧', titulo: 'Lembrete automático por e-mail', texto: 'Resumo do dia para você e aviso para o cliente antes do vencimento, com o Pix copia e cola.' },
  { icone: '📥', titulo: 'Traga a sua planilha', texto: 'Importe contas a pagar e a receber do Excel ou CSV. O sistema reconhece as colunas e evita duplicados.' },
  { icone: '👁️', titulo: 'Acesso para o contador', texto: 'O cliente ou o contador entra com login próprio e vê os números, sem conseguir alterar nada.' },
];

const FAQ = [
  { q: 'Preciso conectar minha conta do banco?', a: 'Não. Você importa o extrato do banco (OFX ou CSV) quando quiser. O sistema reconhece o que já foi lançado, dá baixa nas contas em aberto e sugere a categoria do resto.' },
  { q: 'Como funciona o teste grátis?', a: 'Você cria a conta e usa tudo por 7 dias, sem cadastrar cartão. Depois escolhe um plano para continuar. Seus lançamentos ficam guardados.' },
  { q: 'Posso pagar com Pix ou boleto?', a: 'Sim. No cartão de crédito a cobrança é automática. No Pix ou no boleto, a cada mês (ou ano) você recebe a cobrança por e-mail e paga pelo link. Assinando durante o teste grátis, a primeira cobrança só vence quando os 7 dias acabarem.' },
  { q: 'Serve para quem faz BPO financeiro?', a: 'Sim. Você cuida de várias empresas no mesmo login, com os dados de cada uma separados, vê o caixa e os atrasados de todas num painel e gera o relatório mensal de cada cliente com a sua marca. Cada plano inclui até 3 empresas (o Básico, 1) e cada empresa a mais custa R$ 29,90 por mês.' },
  { q: 'O sistema emite nota fiscal?', a: 'Ainda não. Você emite a NFS-e no Emissor Nacional e registra a nota na Landim Advisory, que cria a conta a receber e soma o faturamento dos últimos 12 meses.' },
  { q: 'Onde ficam os meus dados?', a: 'Na nuvem do Google (Firebase), separados por login e por empresa. Só quem entra com a sua conta vê os dados. Você pode baixar um backup completo quando quiser.' },
  { q: 'Meu contador pode acessar?', a: 'Sim, no plano Completo ou Escritório. Em Equipe e acessos você libera o e-mail do contador ou do cliente. Ele entra com login e senha próprios e vê os números da empresa em modo somente leitura.' },
  { q: 'Já uso planilha. Perco o que tenho?', a: 'Não. Você importa as contas a pagar e a receber direto do Excel ou CSV, e o extrato do banco em OFX ou CSV.' },
  { q: 'Vocês também fazem o financeiro por mim?', a: 'Sim. Além do sistema, a Landim Advisory oferece BPO financeiro, diagnóstico, controladoria e planejamento tributário. Veja a página de consultoria.' },
  { q: 'Tem desconto no plano anual?', a: 'Sim. No plano anual você paga 10 mensalidades e usa os 12 meses, ou seja, ganha 2 meses.' },
  { q: 'O que é o preço de fundador?', a: 'Os primeiros assinantes pagam um preço menor nos 12 primeiros meses. O site mostra quantas vagas ainda restam. Depois desse período, vale o preço normal do plano.' },
  { q: 'Posso mudar de plano depois?', a: 'Sim, quando quiser. Seus lançamentos continuam e os recursos do novo plano liberam na hora.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim, sem multa e sem fidelidade. O acesso continua até o fim do período já pago.' },
];

export default function LandingPage() {
  const router = useRouter();
  const [aberta, setAberta] = useState(0);
  const vagas = useFundadores();

  return (
    <div className="lp">
      <style dangerouslySetInnerHTML={{ __html: ESTILO + ESTILO_PLANOS }} />

      <header className="lp-topo">
        <div className="lp-cx lp-topo-in">
          <Link href="/" className="lp-marca"><img src="/logo.svg" alt="" className="lp-logo" width="34" height="34" />Landim Advisory</Link>
          <nav className="lp-menu">
            <a href="#como">Como funciona</a>
            <a href="#precos">Preços</a>
            <a href="#duvidas">Dúvidas</a>
            <Link href="/consultoria">Consultoria</Link>
          </nav>
          <div className="lp-topo-acoes">
            <Link href="/login" className="lp-entrar">Entrar</Link>
            <Link href="/register" className="lp-btn lp-btn-p lp-btn-sm">Testar grátis</Link>
          </div>
        </div>
      </header>

      {/* Destaque */}
      <section className="lp-hero">
        <div className="lp-cx lp-hero-in">
          <div className="lp-hero-txt">
            <div className="lp-etiqueta">Financeiro para pequenas empresas e BPO</div>
            <h1>O financeiro da sua empresa em ordem, em poucos minutos por dia.</h1>
            <p className="lp-sub">Contas a pagar e a receber, fluxo de caixa, cobrança por Pix e um relatório mensal pronto para enviar. Simples para quem não é da área financeira.</p>
            <div className="lp-ctas">
              <Link href="/register" className="lp-btn lp-btn-p">Testar grátis por 7 dias</Link>
              <a href="/dashboard?demo=1" className="lp-btn lp-btn-s">Ver demonstração</a>
            </div>
            <div className="lp-garantias"><span>✓ Sem cartão para testar</span><span>✓ Cancele quando quiser</span><span>✓ {vagas > 0 ? 'Preço de fundador: a partir de R$ 49,90/mês' : 'A partir de R$ 79,90/mês'}</span></div>
          </div>
          <div className="lp-hero-tela" aria-label="Exemplo da tela inicial do sistema">
            <div className="lp-janela">
              <div className="lp-janela-top"><i /><i /><i /><span>Início · exemplo</span></div>
              <div className="lp-kpis">
                <div><small>Quanto tenho hoje</small><b className="ouro">R$ 18.420</b></div>
                <div><small>Vou receber (30 dias)</small><b className="verde">R$ 9.850</b></div>
                <div><small>Vou pagar (30 dias)</small><b className="verm">R$ 6.130</b></div>
                <div><small>Resultado do mês</small><b className="verde">R$ 4.270</b></div>
              </div>
              <div className="lp-lista">
                <div className="lp-lista-t">Vence nos próximos dias</div>
                {[['Aluguel da loja', 'vence em 2 dias', '−R$ 2.500', 'verm', 'Paguei'], ['Cliente Alfa · parcela 2/3', 'vence amanhã', '+R$ 1.200', 'verde', 'Recebi'], ['Energia', 'vence em 6 dias', '−R$ 430', 'verm', 'Paguei']].map((l) => (
                  <div className="lp-item" key={l[0]}><div><b>{l[0]}</b><small>{l[1]}</small></div><span className={l[3]}>{l[2]}</span><em>{l[4]}</em></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como" className="lp-sec">
        <div className="lp-cx">
          <h2>Comece em 3 passos</h2>
          <p className="lp-sec-sub">Sem instalar nada. Funciona no computador e no celular.</p>
          <div className="lp-passos">
            {[['1', 'Cadastre a empresa', 'Digite o CNPJ e o nome e o regime vêm da Receita. Informe o saldo do banco.'], ['2', 'Lance ou importe', 'Lance contas a pagar e a receber, leia boletos com a câmera ou importe o extrato do banco.'], ['3', 'Acompanhe e envie', 'Veja o caixa e os vencimentos no Início e envie o relatório do mês para o cliente ou sócio.']].map((p) => (
              <div className="lp-passo" key={p[0]}><span>{p[0]}</span><h3>{p[1]}</h3><p>{p[2]}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* O que resolve */}
      <section className="lp-sec lp-sec-alt">
        <div className="lp-cx">
          <h2>O que a Landim Advisory resolve</h2>
          <div className="lp-grade">
            {RESOLVE.map((r) => (
              <div className="lp-card" key={r.titulo}><div className="lp-card-ic">{r.icone}</div><h3>{r.titulo}</h3><p>{r.texto}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Para quem */}
      <section className="lp-sec">
        <div className="lp-cx lp-paraquem">
          <div className="lp-pq">
            <div className="lp-pq-ic">🧑‍💼</div>
            <h3>Para o dono da empresa</h3>
            <ul>
              <li>Saiba todo dia quanto pode gastar</li>
              <li>Cobre clientes atrasados em um clique</li>
              <li>Mande para o contador o pacote do mês pronto</li>
              <li>Simule impostos e veja o efeito da reforma tributária</li>
              <li>Receba todo dia o resumo do que vence</li>
            </ul>
          </div>
          <div className="lp-pq lp-pq-ouro">
            <div className="lp-pq-ic">🗂️</div>
            <h3>Para BPO financeiro e escritórios</h3>
            <ul>
              <li>Várias empresas no mesmo login, com dados separados</li>
              <li>Indicadores de todos os clientes: faturamento, caixa e quem está sem lançamento</li>
              <li>Acesso de consulta para o cliente acompanhar</li>
              <li>Relatório mensal em PDF com a sua marca</li>
              <li>Conciliação do extrato que aprende as categorias</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Preços */}
      <section id="precos" className="lp-sec lp-sec-alt">
        <div className="lp-cx">
          <h2>Preços simples</h2>
          <p className="lp-sec-sub">Cada plano soma recursos ao anterior. Teste 7 dias com tudo liberado, sem cartão.</p>
          <CardsPlanos onEscolher={() => router.push('/register')} textoBotao={() => 'Testar grátis'} />
          <div className="lp-incluso">
            <div className="lp-incluso-t">Em todos os planos</div>
            <ul>{INCLUSO.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        </div>
      </section>

      {/* Dúvidas */}
      <section id="duvidas" className="lp-sec">
        <div className="lp-cx lp-faq">
          <h2>Dúvidas frequentes</h2>
          {FAQ.map((f, i) => (
            <div className={'lp-faq-item' + (aberta === i ? ' on' : '')} key={f.q}>
              <button type="button" onClick={() => setAberta(aberta === i ? -1 : i)} aria-expanded={aberta === i}>{f.q}<span>{aberta === i ? '−' : '+'}</span></button>
              {aberta === i && <p>{f.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Consultoria */}
      <section className="lp-sec">
        <div className="lp-cx">
          <div className="lp-consult">
            <div>
              <div className="lp-etiqueta">Consultoria Landim Advisory</div>
              <h2>Prefere que a gente cuide do seu financeiro?</h2>
              <p>BPO financeiro, diagnóstico, controladoria e planejamento tributário, com o sistema incluído no trabalho e relatório todo mês.</p>
            </div>
            <div className="lp-ctas">
              <Link href="/consultoria" className="lp-btn lp-btn-p">Conhecer a consultoria</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Chamada final */}
      <section className="lp-final">
        <div className="lp-cx">
          <h2>Teste agora, sem compromisso</h2>
          <p>Em 5 minutos sua empresa está cadastrada e você já vê o caixa dos próximos 90 dias.</p>
          <div className="lp-ctas lp-ctas-c">
            <Link href="/register" className="lp-btn lp-btn-p">Criar conta grátis</Link>
            <a href="/dashboard?demo=1" className="lp-btn lp-btn-claro">Ver demonstração</a>
            <a href={WHATS} target="_blank" rel="noopener" className="lp-btn lp-btn-claro">Tirar dúvidas no WhatsApp</a>
          </div>
        </div>
      </section>

      <footer className="lp-rodape">
        <div className="lp-cx lp-rodape-in">
          <span className="lp-marca"><img src="/logo.svg" alt="" className="lp-logo" width="34" height="34" />Landim Advisory</span>
          <nav><Link href="/consultoria">Consultoria</Link><Link href="/pricing">Planos</Link><Link href="/termos">Termos de Uso</Link><Link href="/privacidade">Privacidade</Link><a href={WHATS} target="_blank" rel="noopener">Contato</a></nav>
          <small>© {new Date().getFullYear()} Landim Advisory</small>
        </div>
      </footer>
    </div>
  );
}

const ESTILO = `
.lp{background:#FAFAF8;color:#0B1220;font-family:var(--font-inter),Inter,system-ui,sans-serif;min-height:100vh;line-height:1.5}
.lp a{text-decoration:none}
.lp-cx{max-width:1160px;margin:0 auto;padding:0 20px}
.lp-topo{position:sticky;top:0;z-index:50;background:rgba(250,250,248,.9);backdrop-filter:blur(10px);border-bottom:1px solid #ECEEF2}
.lp-topo-in{display:flex;align-items:center;gap:24px;height:64px}
.lp-marca{display:flex;align-items:center;gap:9px;font-weight:900;font-size:17px;color:#0B1220;letter-spacing:-.01em}
.lp-logo{width:34px;height:34px;border-radius:9px;display:block}
.lp-menu{display:flex;gap:26px;margin-left:12px}
.lp-menu a{color:#4B5565;font-size:14.5px;font-weight:600}.lp-menu a:hover{color:#0B1220}
.lp-topo-acoes{margin-left:auto;display:flex;align-items:center;gap:14px}
.lp-entrar{color:#0B1220;font-weight:700;font-size:14.5px}
.lp-btn{display:inline-flex;align-items:center;justify-content:center;padding:15px 26px;border-radius:12px;font-weight:800;font-size:16px;transition:all .15s;border:1.5px solid transparent;white-space:nowrap}
.lp-btn-sm{padding:9px 16px;font-size:14px;border-radius:10px}
.lp-btn-p{background:#0B1220;color:#fff}.lp-btn-p:hover{background:#1E2A44}
.lp-btn-s{background:#fff;color:#0B1220;border-color:#D5D9E0}.lp-btn-s:hover{border-color:#0B1220}
.lp-btn-claro{background:transparent;color:#fff;border-color:rgba(255,255,255,.4)}.lp-btn-claro:hover{border-color:#fff}
.lp-hero{padding:64px 0 72px;background:radial-gradient(1000px 420px at 80% 0%,rgba(197,160,89,.16),transparent 70%)}
.lp-hero-in{display:grid;grid-template-columns:1.05fr 1fr;gap:48px;align-items:center}
.lp-etiqueta{display:inline-block;background:#F6F1E4;color:#7A5A12;font-weight:800;font-size:12.5px;padding:6px 12px;border-radius:99px;margin-bottom:18px}
.lp h1{font-size:50px;line-height:1.08;letter-spacing:-.03em;font-weight:900;margin:0 0 18px}
.lp-sub{font-size:19px;color:#4B5565;margin:0 0 28px;max-width:560px}
.lp-ctas{display:flex;gap:12px;flex-wrap:wrap}
.lp-ctas-c{justify-content:center}
.lp-garantias{display:flex;gap:18px;flex-wrap:wrap;margin-top:18px;color:#4B5565;font-size:14px;font-weight:600}
.lp-janela{background:#fff;border:1px solid #E3E6EC;border-radius:18px;box-shadow:0 30px 70px rgba(11,18,32,.14);overflow:hidden}
.lp-janela-top{display:flex;align-items:center;gap:6px;padding:12px 16px;border-bottom:1px solid #EEF0F4;background:#F7F8FA}
.lp-janela-top i{width:10px;height:10px;border-radius:50%;background:#E1E4EA}
.lp-janela-top span{margin-left:8px;font-size:12px;color:#7B8494;font-weight:600}
.lp-kpis{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px}
.lp-kpis div{border:1px solid #EEF0F4;border-radius:12px;padding:12px 14px}
.lp-kpis small{display:block;font-size:12px;color:#6B7486}
.lp-kpis b{font-size:22px;letter-spacing:-.02em}
.ouro{color:#9C7616}.verde{color:#0E9F6E}.verm{color:#DC2626}
.lp-lista{padding:0 16px 16px}
.lp-lista-t{font-size:13px;font-weight:800;margin:4px 0 6px}
.lp-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid #EEF0F4}
.lp-item div{flex:1;min-width:0}.lp-item b{display:block;font-size:14px}.lp-item small{color:#6B7486;font-size:12px}
.lp-item span{font-weight:800;font-size:14px;white-space:nowrap}
.lp-item em{font-style:normal;font-size:12px;font-weight:700;border:1px solid #D5D9E0;border-radius:8px;padding:4px 9px;color:#0E9F6E}
.lp-sec{padding:76px 0}
.lp-sec-alt{background:#fff;border-top:1px solid #ECEEF2;border-bottom:1px solid #ECEEF2}
.lp h2{font-size:36px;letter-spacing:-.02em;font-weight:900;text-align:center;margin:0 0 10px}
.lp-sec-sub{text-align:center;color:#4B5565;font-size:17px;max-width:640px;margin:0 auto 40px}
.lp-passos{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:36px}
.lp-passo{background:#fff;border:1px solid #E3E6EC;border-radius:18px;padding:26px}
.lp-passo span{display:inline-flex;width:36px;height:36px;border-radius:50%;background:#0B1220;color:#fff;font-weight:900;align-items:center;justify-content:center}
.lp-passo h3,.lp-card h3,.lp-pq h3{font-size:18px;margin:14px 0 6px;font-weight:800}
.lp-passo p,.lp-card p{color:#4B5565;margin:0;font-size:15px}
.lp-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:36px}
.lp-card{border:1px solid #E3E6EC;border-radius:18px;padding:24px;background:#FAFAF8}
.lp-card-ic{font-size:24px;width:48px;height:48px;border-radius:12px;background:#fff;border:1px solid #E3E6EC;display:flex;align-items:center;justify-content:center}
.lp-paraquem{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.lp-pq{background:#fff;border:1px solid #E3E6EC;border-radius:20px;padding:30px}
.lp-pq-ouro{background:#0B1220;color:#fff;border-color:#0B1220}
.lp-pq-ic{font-size:30px}
.lp-pq ul{list-style:none;padding:0;margin:10px 0 0}
.lp-pq li{padding:8px 0 8px 28px;position:relative;font-size:15.5px}
.lp-pq li:before{content:'✓';position:absolute;left:0;font-weight:900;color:#0E9F6E}
.lp-pq-ouro li:before{color:#C5A059}
.lp-incluso{margin-top:28px;background:#FAFAF8;border:1px solid #E3E6EC;border-radius:18px;padding:22px 26px}
.lp-incluso-t{font-weight:800;margin-bottom:10px}
.lp-incluso ul{list-style:none;padding:0;margin:0;columns:3 240px;column-gap:28px}
.lp-incluso li{padding:5px 0 5px 22px;position:relative;font-size:14.5px;color:#1E2533;break-inside:avoid}
.lp-incluso li:before{content:'✓';position:absolute;left:0;color:#0E9F6E;font-weight:900}
.lp-faq{max-width:780px}
.lp-faq h2{margin-bottom:26px}
.lp-faq-item{border:1px solid #E3E6EC;background:#fff;border-radius:14px;margin-bottom:10px}
.lp-faq-item button{width:100%;display:flex;justify-content:space-between;gap:16px;align-items:center;background:none;border:0;padding:18px 20px;font:inherit;font-weight:700;font-size:16px;color:#0B1220;cursor:pointer;text-align:left}
.lp-faq-item button span{font-size:20px;color:#9C7616}
.lp-faq-item p{margin:0;padding:0 20px 18px;color:#4B5565;font-size:15px}
.lp-consult{display:flex;align-items:center;justify-content:space-between;gap:28px;flex-wrap:wrap;background:#F6F1E4;border:1px solid #E8DCC0;border-radius:22px;padding:36px 40px}
.lp-consult h2{text-align:left;font-size:30px;margin:0 0 8px}
.lp-consult p{color:#4B5565;font-size:16.5px;margin:0;max-width:620px}
.lp-consult .lp-etiqueta{background:#fff;margin-bottom:12px}
.lp-final{background:#0B1220;color:#fff;text-align:center;padding:72px 0}
.lp-final h2{color:#fff}
.lp-final p{color:#B7C0CF;font-size:17px;margin:0 0 26px}
.lp-final .lp-btn-p{background:#C5A059;color:#0B1220}.lp-final .lp-btn-p:hover{background:#D4B26E}
.lp-rodape{padding:30px 0;border-top:1px solid #ECEEF2}
.lp-rodape-in{display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.lp-rodape nav{display:flex;gap:18px;flex-wrap:wrap;margin-left:auto}
.lp-rodape nav a{color:#4B5565;font-size:14px}
.lp-rodape small{color:#7B8494;width:100%;text-align:right}
@media (max-width:960px){.lp-hero-in{grid-template-columns:1fr}.lp h1{font-size:40px}.lp-grade{grid-template-columns:1fr 1fr}.lp-menu{display:none}}
@media (max-width:640px){.lp h1{font-size:32px}.lp-sub{font-size:17px}.lp h2{font-size:28px}.lp-hero{padding:36px 0 48px}.lp-passos,.lp-grade,.lp-paraquem{grid-template-columns:1fr}.lp-sec{padding:52px 0}.lp-btn{width:100%}.lp-btn-sm{width:auto}.lp-entrar{display:none}.lp-kpis b{font-size:18px}.lp-rodape small{text-align:left}}
`;
