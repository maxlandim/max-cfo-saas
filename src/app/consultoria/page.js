import Link from 'next/link';
import Formulario from './Formulario';

export const metadata = {
  title: 'Consultoria financeira e BPO — Landim Advisory',
  description: 'BPO financeiro, diagnóstico financeiro, controladoria e planejamento tributário para pequenas e médias empresas. Fale com a Landim Advisory.',
};

const WHATS = 'https://wa.me/5561992105889?text=' + encodeURIComponent('Olá! Quero conversar sobre a consultoria da Landim Advisory.');

const SERVICOS = [
  {
    id: 'bpo', icone: '🗂️', titulo: 'BPO financeiro',
    texto: 'A nossa equipe cuida do dia a dia do seu financeiro. Você aprova os pagamentos e acompanha tudo pelo sistema.',
    itens: ['Contas a pagar e a receber', 'Conciliação do extrato bancário', 'Cobrança de clientes em atraso', 'Relatório mensal e reunião de resultado'],
  },
  {
    id: 'diagnostico', icone: '🩺', titulo: 'Consultoria e diagnóstico financeiro',
    texto: 'Uma análise completa dos números da empresa, com um plano de ação claro e em ordem de prioridade.',
    itens: ['Margens, custos e despesas', 'Capital de giro e fluxo de caixa', 'Formação de preço e ponto de equilíbrio', 'Plano de ação com metas'],
  },
  {
    id: 'controladoria', icone: '📊', titulo: 'Auditoria e controladoria',
    texto: 'Números confiáveis para decidir: processos revisados, DRE gerencial e acompanhamento mensal.',
    itens: ['Revisão de processos e controles', 'Plano de contas e centros de custo', 'DRE gerencial e orçamento', 'Orçado x realizado todo mês'],
  },
  {
    id: 'tributario', icone: '⚖️', titulo: 'Planejamento tributário e reforma',
    texto: 'Qual regime faz a empresa pagar menos, dentro da lei, e como a reforma tributária muda as contas.',
    itens: ['Simples, Lucro Presumido ou Real', 'Impacto do IBS e da CBS', 'Preço com o novo imposto', 'Feito junto com o seu contador'],
  },
];

const PASSOS = [
  ['1', 'Primeira conversa', 'Entendemos o momento da empresa e o que você precisa. Sem compromisso.'],
  ['2', 'Proposta', 'Escopo, prazos e valor por escrito: mensalidade fixa no BPO ou valor por projeto.'],
  ['3', 'Mãos à obra', 'Organizamos o financeiro no sistema Landim Advisory. Você acompanha tudo com o seu próprio acesso.'],
  ['4', 'Resultado todo mês', 'Relatório do mês e reunião para olhar os números e decidir os próximos passos.'],
];

const DUVIDAS = [
  { q: 'Preciso trocar de contador?', a: 'Não. A consultoria cuida da gestão financeira e trabalha junto com o seu contador, que continua cuidando da parte contábil e fiscal. No fim do mês ele recebe o pacote com tudo organizado.' },
  { q: 'Como é cobrado?', a: 'O BPO financeiro tem mensalidade fixa, que depende do volume de lançamentos e de contas bancárias. Diagnóstico, controladoria e planejamento tributário são cobrados por projeto. O valor vai na proposta, depois da primeira conversa.' },
  { q: 'Preciso usar o sistema?', a: 'Na consultoria, quem opera o sistema somos nós. Você recebe um acesso de consulta para ver o caixa, as contas e os relatórios da sua empresa quando quiser, sem precisar lançar nada.' },
  { q: 'Meus dados ficam protegidos?', a: 'Sim. Tratamos as informações com sigilo profissional e conforme a LGPD. No sistema, cada empresa tem os dados separados e só quem você autoriza tem acesso.' },
];

export default function ConsultoriaPage() {
  return (
    <div className="cs">
      <style dangerouslySetInnerHTML={{ __html: ESTILO }} />

      <header className="cs-topo">
        <div className="cs-cx cs-topo-in">
          <Link href="/" className="cs-marca"><img src="/logo.svg" alt="" width="34" height="34" />Landim Advisory</Link>
          <nav className="cs-menu">
            <a href="#servicos">Serviços</a>
            <a href="#como">Como trabalhamos</a>
            <Link href="/">Sistema</Link>
          </nav>
          <a href={WHATS} target="_blank" rel="noopener" className="cs-btn cs-btn-ouro cs-btn-sm">Falar com um consultor</a>
        </div>
      </header>

      <section className="cs-hero">
        <div className="cs-cx cs-hero-in">
          <div>
            <div className="cs-etiqueta">Consultoria financeira · Brasília</div>
            <h1>Deixe o financeiro com quem entende e cuide do seu negócio.</h1>
            <p className="cs-sub">BPO financeiro, diagnóstico, controladoria e planejamento tributário para pequenas e médias empresas. Com sistema próprio e relatório todo mês.</p>
            <div className="cs-ctas">
              <a href="#contato" className="cs-btn cs-btn-ouro">Quero uma proposta</a>
              <a href="#servicos" className="cs-btn cs-btn-claro">Ver serviços</a>
            </div>
          </div>
          <ul className="cs-hero-lista" aria-label="O que você recebe">
            <li><b>Contas em dia</b><span>pagamentos, cobranças e conciliação feitos pela nossa equipe</span></li>
            <li><b>Números confiáveis</b><span>caixa, DRE e previsão dos próximos 90 dias</span></li>
            <li><b>Decisão com base em dados</b><span>reunião mensal com o consultor</span></li>
            <li><b>Imposto certo</b><span>regime tributário revisado e reforma no radar</span></li>
          </ul>
        </div>
      </section>

      <section id="servicos" className="cs-sec">
        <div className="cs-cx">
          <h2>Serviços</h2>
          <p className="cs-sec-sub">Contrate um serviço ou combine vários. A proposta é montada para o tamanho da sua empresa.</p>
          <div className="cs-grade">
            {SERVICOS.map((s) => (
              <div className="cs-card" key={s.id}>
                <div className="cs-card-ic">{s.icone}</div>
                <h3>{s.titulo}</h3>
                <p>{s.texto}</p>
                <ul>{s.itens.map((i) => <li key={i}>{i}</li>)}</ul>
                <a href={'#contato'} data-servico={s.id} className="cs-link">Pedir proposta →</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como" className="cs-sec cs-sec-alt">
        <div className="cs-cx">
          <h2>Como trabalhamos</h2>
          <div className="cs-passos">
            {PASSOS.map((p) => (
              <div className="cs-passo" key={p[0]}><span>{p[0]}</span><h3>{p[1]}</h3><p>{p[2]}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="cs-sec">
        <div className="cs-cx cs-duas">
          <div className="cs-sistema">
            <h2>Consultoria com sistema próprio</h2>
            <p>Os nossos clientes de consultoria têm o financeiro organizado na plataforma Landim Advisory: caixa de cada banco, contas a pagar e a receber, fluxo de caixa e o relatório mensal em PDF. Você consulta tudo pelo computador ou pelo celular, com o seu login.</p>
            <p>Prefere fazer você mesmo? O sistema também é vendido sozinho, com planos a partir de R$ 79,90 por mês.</p>
            <Link href="/" className="cs-btn cs-btn-escuro">Conhecer o sistema</Link>
          </div>
          <div className="cs-faq">
            <h2>Dúvidas</h2>
            {DUVIDAS.map((d) => (
              <details key={d.q}><summary>{d.q}</summary><p>{d.a}</p></details>
            ))}
          </div>
        </div>
      </section>

      <section id="contato" className="cs-contato">
        <div className="cs-cx cs-contato-in">
          <div>
            <h2>Vamos conversar?</h2>
            <p>Conte um pouco sobre a sua empresa. A mensagem abre no WhatsApp e respondemos por lá.</p>
            <p className="cs-contato-dados">WhatsApp (61) 99210-5889 · maxpaeslandim@gmail.com</p>
          </div>
          <Formulario servicos={SERVICOS.map((s) => ({ id: s.id, titulo: s.titulo }))} />
        </div>
      </section>

      <footer className="cs-rodape">
        <div className="cs-cx cs-rodape-in">
          <span className="cs-marca"><img src="/logo.svg" alt="" width="28" height="28" />Landim Advisory</span>
          <nav><Link href="/">Sistema</Link><Link href="/pricing">Planos</Link><Link href="/termos">Termos de Uso</Link><Link href="/privacidade">Privacidade</Link></nav>
        </div>
      </footer>
    </div>
  );
}

const ESTILO = `
.cs{background:#FAFAF8;color:#0B1220;font-family:var(--font-inter),Inter,system-ui,sans-serif;min-height:100vh;line-height:1.5}
.cs a{text-decoration:none}
.cs-cx{max-width:1160px;margin:0 auto;padding:0 20px}
.cs-topo{position:sticky;top:0;z-index:50;background:rgba(11,18,32,.96);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.08)}
.cs-topo-in{display:flex;align-items:center;gap:24px;height:64px}
.cs-marca{display:flex;align-items:center;gap:9px;font-weight:900;font-size:17px;color:#fff;letter-spacing:-.01em}
.cs-marca img{border-radius:9px;display:block}
.cs-rodape .cs-marca{color:#0B1220}
.cs-menu{display:flex;gap:26px;margin-left:12px}
.cs-menu a{color:#B7C0CF;font-size:14.5px;font-weight:600}.cs-menu a:hover{color:#fff}
.cs-topo .cs-btn{margin-left:auto}
.cs-btn{display:inline-flex;align-items:center;justify-content:center;padding:15px 26px;border-radius:12px;font-weight:800;font-size:16px;transition:all .15s;border:1.5px solid transparent;white-space:nowrap;cursor:pointer}
.cs-btn-sm{padding:9px 16px;font-size:14px;border-radius:10px}
.cs-btn-ouro{background:#C5A059;color:#0B1220}.cs-btn-ouro:hover{background:#D4B26E}
.cs-btn-claro{background:transparent;color:#fff;border-color:rgba(255,255,255,.35)}.cs-btn-claro:hover{border-color:#fff}
.cs-btn-escuro{background:#0B1220;color:#fff;margin-top:8px}.cs-btn-escuro:hover{background:#1E2A44}
.cs-hero{background:#0B1220;color:#fff;padding:72px 0 80px;background-image:radial-gradient(900px 420px at 85% 0%,rgba(197,160,89,.22),transparent 70%)}
.cs-hero-in{display:grid;grid-template-columns:1.15fr 1fr;gap:56px;align-items:center}
.cs-etiqueta{display:inline-block;background:rgba(197,160,89,.16);color:#E2C68C;font-weight:800;font-size:12.5px;padding:6px 12px;border-radius:99px;margin-bottom:18px}
.cs h1{font-size:48px;line-height:1.08;letter-spacing:-.03em;font-weight:900;margin:0 0 18px}
.cs-sub{font-size:19px;color:#B7C0CF;margin:0 0 28px;max-width:580px}
.cs-ctas{display:flex;gap:12px;flex-wrap:wrap}
.cs-hero-lista{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.cs-hero-lista li{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-left:3px solid #C5A059;border-radius:12px;padding:14px 18px}
.cs-hero-lista b{display:block;font-size:16px}.cs-hero-lista span{color:#B7C0CF;font-size:14px}
.cs-sec{padding:76px 0}
.cs-sec-alt{background:#fff;border-top:1px solid #ECEEF2;border-bottom:1px solid #ECEEF2}
.cs h2{font-size:36px;letter-spacing:-.02em;font-weight:900;text-align:center;margin:0 0 10px}
.cs-sec-sub{text-align:center;color:#4B5565;font-size:17px;max-width:640px;margin:0 auto 40px}
.cs-grade{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}
.cs-card{background:#fff;border:1px solid #E3E6EC;border-radius:18px;padding:26px;display:flex;flex-direction:column}
.cs-card-ic{font-size:24px;width:48px;height:48px;border-radius:12px;background:#F6F1E4;display:flex;align-items:center;justify-content:center}
.cs-card h3,.cs-passo h3{font-size:19px;margin:14px 0 6px;font-weight:800}
.cs-card p,.cs-passo p{color:#4B5565;margin:0;font-size:15px}
.cs-card ul{list-style:none;padding:0;margin:14px 0 18px;flex:1}
.cs-card li{padding:5px 0 5px 24px;position:relative;font-size:15px}
.cs-card li:before{content:'✓';position:absolute;left:0;color:#0E9F6E;font-weight:900}
.cs-link{color:#7A5A12;font-weight:800;font-size:14.5px}.cs-link:hover{color:#0B1220}
.cs-passos{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:36px}
.cs-passo{border:1px solid #E3E6EC;border-radius:18px;padding:24px;background:#FAFAF8}
.cs-passo span{display:inline-flex;width:36px;height:36px;border-radius:50%;background:#C5A059;color:#0B1220;font-weight:900;align-items:center;justify-content:center}
.cs-duas{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start}
.cs-duas h2{text-align:left;font-size:30px}
.cs-sistema{background:#fff;border:1px solid #E3E6EC;border-radius:20px;padding:30px}
.cs-sistema p{color:#4B5565;font-size:15.5px;margin:0 0 14px}
.cs-faq details{border:1px solid #E3E6EC;background:#fff;border-radius:14px;margin-bottom:10px;padding:0 20px}
.cs-faq summary{cursor:pointer;font-weight:700;font-size:16px;padding:17px 0;list-style:none;display:flex;justify-content:space-between;gap:12px}
.cs-faq summary::-webkit-details-marker{display:none}
.cs-faq summary:after{content:'+';color:#9C7616;font-size:20px;line-height:1}
.cs-faq details[open] summary:after{content:'−'}
.cs-faq details p{margin:0 0 17px;color:#4B5565;font-size:15px}
.cs-contato{background:#0B1220;color:#fff;padding:72px 0}
.cs-contato-in{display:grid;grid-template-columns:1fr 1.1fr;gap:48px;align-items:start}
.cs-contato h2{color:#fff;text-align:left}
.cs-contato p{color:#B7C0CF;font-size:17px;margin:0 0 12px}
.cs-contato-dados{font-weight:700;color:#E2C68C!important;font-size:15px!important}
.cs-form{background:#fff;color:#0B1220;border-radius:18px;padding:26px;display:grid;gap:14px}
.cs-form label{display:grid;gap:6px;font-weight:700;font-size:14px}
.cs-form input,.cs-form select,.cs-form textarea{font:inherit;font-weight:400;font-size:15px;padding:12px 14px;border:1.5px solid #D5D9E0;border-radius:10px;background:#fff;color:#0B1220;width:100%;box-sizing:border-box}
.cs-form input:focus,.cs-form select:focus,.cs-form textarea:focus{outline:none;border-color:#C5A059}
.cs-form .cs-duplo{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.cs-form .cs-btn{width:100%}
.cs-form small{color:#6B7486;font-size:12.5px}
.cs-rodape{padding:30px 0;border-top:1px solid #ECEEF2}
.cs-rodape-in{display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.cs-rodape nav{display:flex;gap:18px;flex-wrap:wrap;margin-left:auto}
.cs-rodape nav a{color:#4B5565;font-size:14px}
@media (max-width:960px){.cs-hero-in,.cs-duas,.cs-contato-in{grid-template-columns:1fr}.cs h1{font-size:38px}.cs-passos{grid-template-columns:1fr 1fr}.cs-menu{display:none}}
@media (max-width:640px){.cs h1{font-size:31px}.cs-sub{font-size:17px}.cs h2{font-size:27px}.cs-hero{padding:40px 0 52px}.cs-grade,.cs-passos,.cs-form .cs-duplo{grid-template-columns:1fr}.cs-sec{padding:52px 0}.cs-ctas .cs-btn{width:100%}.cs-topo .cs-btn{padding:8px 12px;font-size:13px}}
`;
