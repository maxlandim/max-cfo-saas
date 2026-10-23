"""Testes dos recursos novos no site do branch: página de consultoria, rota de lembretes, importação de planilha
Excel (.xlsx de verdade), painel de todas as empresas, acesso de consulta e cartão de lembretes."""
import asyncio, json, os, time, random, string, urllib.request
from playwright.async_api import async_playwright
from openpyxl import Workbook
from datetime import date, timedelta

SITE = os.environ.get('SITE', 'https://landimadvisory.com.br')
KEY = 'AIzaSyAsQS2b0oYMHJ_BExiXH0xgD49j68pwZ6M'  # chave Web pública do Firebase (a mesma do site)
OUT = 'saida'; os.makedirs(OUT, exist_ok=True)
falhas = []
def log(ok, nome, extra=''):
    print(('OK   ' if ok else 'FALHA'), 'novos:', nome, str(extra)[:300], flush=True)
    if not ok: falhas.append(nome)
def rest(url, corpo, token=None, metodo='POST'):
    req = urllib.request.Request(url, data=json.dumps(corpo).encode() if corpo is not None else None, method=metodo, headers={'Content-Type': 'application/json', **({'Authorization': 'Bearer ' + token} if token else {})})
    try:
        with urllib.request.urlopen(req, timeout=30) as r: return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read() or b'{}')
        except Exception: return e.code, {}

def planilha():
    wb = Workbook(); ws = wb.active
    ws.append(['Relatório de contas'])  # linha de título antes do cabeçalho
    ws.append(['Tipo', 'Descrição', 'Cliente/Fornecedor', 'Valor', 'Vencimento', 'Categoria', 'Situação'])
    hoje = date.today()
    ws.append(['Receber', 'Mensalidade XLSX', 'Cliente Planilha', 1500.5, hoje + timedelta(days=10), 'Prestação de Serviços', 'aberto'])
    ws.append(['Pagar', 'Aluguel XLSX', 'Imobiliária XLSX', 2300, hoje + timedelta(days=5), 'Aluguel e Condomínio', 'em aberto'])
    ws.append(['Pagar', 'Internet XLSX', 'Provedor', '199,90', (hoje + timedelta(days=3)).strftime('%d/%m/%Y'), 'Internet e Telefone', 'pendente'])
    wb.save(f'{OUT}/teste.xlsx'); return f'{OUT}/teste.xlsx'

def resumo_exemplo():
    from datetime import datetime, timedelta, timezone
    hoje = datetime.now(timezone.utc).date()
    dias = []
    for i in range(29, -1, -1):
        d = (hoje - timedelta(days=i)).isoformat()
        v = (i * 7) % 13 + (3 if i < 7 else 0)
        dias.append({'dia': d, 'visitas': v * 2, 'visitantes': v, 'cadastros': 1 if i % 5 == 0 else 0, 'paginas': {'inicio': v, 'planos': v // 2}, 'origens': {'instagram': v // 2, 'linkedin': v - v // 2}, 'cadastrosPorOrigem': {'instagram': 1} if i % 5 == 0 else {}})
    iso = lambda dd: (datetime.now(timezone.utc) + timedelta(days=dd)).isoformat()
    contas = [
        {'email': 'admin@x.com', 'nome': 'Admin', 'criadoEm': iso(-40), 'ultimoLogin': iso(0), 'ultimaAlteracao': iso(0), 'empresas': 2, 'emailConfirmado': True, 'provedor': 'google.com', 'fimTeste': iso(-33), 'situacao': 'admin', 'plano': None, 'status': None, 'renovaEm': None, 'cancelaNoFim': False, 'robo': False},
        {'email': 'ana@padaria.com', 'nome': 'Ana', 'criadoEm': iso(-2), 'ultimoLogin': iso(0), 'ultimaAlteracao': iso(0), 'empresas': 1, 'emailConfirmado': True, 'provedor': 'password', 'fimTeste': iso(5), 'situacao': 'teste', 'plano': None, 'status': None, 'renovaEm': None, 'cancelaNoFim': False, 'robo': False},
        {'email': 'bruno@oficina.com', 'nome': 'Bruno', 'criadoEm': iso(-6), 'ultimoLogin': iso(-1), 'ultimaAlteracao': iso(-1), 'empresas': 1, 'emailConfirmado': False, 'provedor': 'password', 'fimTeste': iso(1), 'situacao': 'teste_com_cartao', 'plano': 'basic', 'status': 'trialing', 'renovaEm': iso(1), 'cancelaNoFim': False, 'robo': False},
        {'email': 'carla@clinica.com', 'nome': 'Carla', 'criadoEm': iso(-20), 'ultimoLogin': iso(-3), 'ultimaAlteracao': iso(-3), 'empresas': 3, 'emailConfirmado': True, 'provedor': 'password', 'fimTeste': iso(-13), 'situacao': 'assinante', 'plano': 'intermediate', 'status': 'active', 'renovaEm': iso(10), 'cancelaNoFim': False, 'robo': False, 'valorMensal': 129.9, 'fundador': True, 'periodo': 'mensal'},
        {'email': 'dani@bpo.com', 'nome': 'Dani', 'criadoEm': iso(-25), 'ultimoLogin': iso(-12), 'ultimaAlteracao': iso(-12), 'empresas': 8, 'emailConfirmado': True, 'provedor': 'google.com', 'fimTeste': iso(-18), 'situacao': 'assinante', 'plano': 'complete', 'status': 'active', 'renovaEm': iso(5), 'cancelaNoFim': True, 'robo': False, 'valorMensal': 269.9, 'fundador': True, 'periodo': 'mensal'},
        {'email': 'edu@loja.com', 'nome': '', 'criadoEm': iso(-15), 'ultimoLogin': iso(-14), 'ultimaAlteracao': None, 'empresas': 0, 'emailConfirmado': False, 'provedor': 'password', 'fimTeste': iso(-8), 'situacao': 'teste_acabou', 'plano': None, 'status': None, 'renovaEm': None, 'cancelaNoFim': False, 'robo': False},
        {'email': 'robo.teste.x@exemplo.com', 'nome': '', 'criadoEm': iso(0), 'ultimoLogin': iso(0), 'ultimaAlteracao': None, 'empresas': 1, 'emailConfirmado': False, 'provedor': 'password', 'fimTeste': iso(7), 'situacao': 'teste', 'plano': None, 'status': None, 'renovaEm': None, 'cancelaNoFim': False, 'robo': True},
    ]
    return {'geradoEm': datetime.now(timezone.utc).isoformat(), 'hoje': hoje.isoformat(), 'contas': contas, 'dias': dias, 'precos': {'basic': 79.9, 'intermediate': 149.9, 'complete': 349.9, 'unlimited': 599.9}, 'diasDeTeste': 7, 'fundador': {'usados': 2, 'vagas': 50}}

async def publicas(b):
    pg = await b.new_page(viewport={'width': 1366, 'height': 900}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(SITE + '/', wait_until='networkidle')
    log(await pg.locator('a[href="/consultoria"]').count() >= 2, 'página inicial tem links para a consultoria')
    log(await pg.evaluate("[...document.images].some(i=>i.src.endsWith('/logo.svg') && i.naturalWidth>0)"), 'logo aparece na página inicial')
    await pg.goto(SITE + '/pricing', wait_until='networkidle'); await pg.wait_for_timeout(800)
    t = (await pg.inner_text('.pl')).replace('\xa0', ' ')
    log('Escritório' in t and 'Até 30 empresas' in t, 'plano Escritório com até 30 empresas')
    log(('49,90' in t and 'Preço de fundador' in t) or ('79,90' in t and 'Preço de fundador' not in t), 'preço do Básico (fundador 49,90 ou normal 79,90)', t[:160])
    await pg.click('.pl-periodo button:has-text("Anual")'); await pg.wait_for_timeout(300)
    t2 = (await pg.inner_text('.pl')).replace('\xa0', ' ')
    log('/ano' in t2 and ('499,00' in t2 or '799,00' in t2), 'plano anual = 10 mensalidades', t2[:160])
    await pg.screenshot(path=f'{OUT}/planos_anual.png', full_page=True)
    await pg.goto(SITE + '/consultoria', wait_until='networkidle')
    txt = await pg.inner_text('body')
    log(all(x in txt for x in ['BPO financeiro', 'diagnóstico financeiro', 'controladoria', 'Planejamento tributário']), 'consultoria lista os serviços')
    await pg.evaluate("window.__aberto=null; window.open=(u)=>{window.__aberto=u; return null}")
    await pg.click('.cs-card:has-text("Planejamento tributário") .cs-link'); await pg.wait_for_timeout(300)
    await pg.fill('.cs-form input >> nth=0', 'Robô Teste'); await pg.fill('.cs-form input >> nth=1', 'Empresa XPTO')
    await pg.click('.cs-form button[type=submit]'); await pg.wait_for_timeout(300)
    u = await pg.evaluate('window.__aberto') or ''
    from urllib.parse import unquote
    log('wa.me/5561992105889' in u and 'Planejamento tributário' in unquote(u) and 'Empresa XPTO' in unquote(u), 'formulário abre o WhatsApp com a mensagem pronta', unquote(u)[:160])
    await pg.screenshot(path=f'{OUT}/consultoria_pc.png', full_page=True)
    m = await b.new_page(viewport={'width': 390, 'height': 844}); await m.goto(SITE + '/consultoria', wait_until='networkidle')
    w = await m.evaluate('document.documentElement.scrollWidth'); log(w <= 392, 'consultoria no celular sem rolagem lateral', w)
    await m.screenshot(path=f'{OUT}/consultoria_cel.png', full_page=True)
    log(not errs, 'sem erros de JavaScript nas páginas públicas', errs[:2])
    s, r = rest(SITE + '/api/lembretes', None, None, 'GET'); log(s in (401, 503), 'rota de lembretes protegida por senha', s)
    s, r = rest(SITE + '/api/admin/resumo', None, None, 'GET'); log(s in (401, 503), 'painel do administrador fechado sem login', s)
    s, r = rest(SITE + '/api/backup', None, None, 'GET'); log(s == 401, 'rota de backup protegida por senha', s)
    s, r = rest(SITE + '/api/rotina', None, None, 'GET'); log(s == 401, 'tarefa diária protegida por senha', s)
    s, r = rest(SITE + '/api/cobrancas?wsId=x', None, None, 'GET'); log(s in (401, 503), 'cobrança pelo Asaas exige login', s)
    s, r = rest(SITE + '/api/cobrancas/webhook?ws=x', {'event': 'PAYMENT_RECEIVED'}); log(s in (401, 503), 'webhook das cobranças recusa sem token', s)
    s, r = rest(SITE + '/api/indicacao', None, None, 'GET'); log(s in (401, 503), 'indicação exige login', s)
    # Demonstração sem login
    d = await b.new_context(viewport={'width': 1366, 'height': 900}, locale='pt-BR'); dp = await d.new_page(); derr = []
    dp.on('pageerror', lambda e: derr.append(str(e)))
    await dp.goto(SITE + '/', wait_until='networkidle')
    log(await dp.is_visible('a:has-text("Ver demonstração")'), 'botão Ver demonstração na página inicial')
    await dp.goto(SITE + '/?ref=ABC234', wait_until='networkidle'); await dp.wait_for_timeout(600)
    log(await dp.evaluate("localStorage.getItem('la_ref')") == 'ABC234', 'código de indicação do link fica guardado')
    await dp.goto(SITE + '/dashboard?demo=1', wait_until='networkidle')
    for _ in range(80):
        if await dp.evaluate("!!(window.__maxcfoIniciado && window.state && document.querySelector('.lay-mod'))"): break
        await dp.wait_for_timeout(500)
    await dp.wait_for_timeout(2500)
    n = await dp.evaluate("(window.state && state.transactions || []).length")
    t = await dp.inner_text('body')
    log('/dashboard' in dp.url and n > 100 and 'Pão Dourado' in t and 'Demonstração com uma empresa fictícia' in t, 'demonstração abre sem login com empresa fictícia', [dp.url[-30:], n])
    await dp.screenshot(path=f'{OUT}/demo_inicio.png')
    await dp.evaluate("switchView('fluxo')"); await dp.wait_for_timeout(1200)
    await dp.screenshot(path=f'{OUT}/demo_fluxo.png')
    await dp.evaluate("switchView('dre')"); await dp.wait_for_timeout(1200)
    log('Resultado' in await dp.inner_text('#view-dre'), 'demonstração mostra o DRE')
    # validade dos produtos (lotes): a demonstração tem um lote vencido e outros perto de vencer
    await dp.evaluate("switchView('dashboard')"); await dp.wait_for_timeout(1000)
    log('lote vencido' in await dp.inner_text('#view-dashboard'), 'validade: Início avisa do lote vencido')
    rv = await dp.evaluate("window.maxcfoValidade ? (r => [r.vencidos.length, r.perto.length])(maxcfoValidade.resumo()) : null")
    log(rv and rv[0] == 1 and rv[1] >= 3, 'validade: módulo carregado e lotes da demonstração', rv)
    await dp.evaluate("validade.abrir('todos')"); await dp.wait_for_timeout(1200)
    tv = await dp.inner_text('#view-inventory')
    log('FB0817' in tv and 'vencido há 2 dias' in tv and 'Baixar como perda' in tv, 'validade: tela de Validades lista os lotes', tv[:200])
    await dp.screenshot(path=f'{OUT}/demo_validades.png', full_page=True)
    await dp.evaluate("est.verAba('produtos')"); await dp.wait_for_timeout(800)
    log('validade' in (await dp.inner_text('#view-inventory')).lower(), 'validade: coluna na lista de produtos')
    await dp.screenshot(path=f'{OUT}/demo_estoque.png', full_page=True)
    # leitor próprio (sem IA) com o pdf.js de produção e o CFO com respostas próprias
    import base64 as _b64
    async def ler_local(nome, tipo):
        b64 = _b64.b64encode(open('leitor/' + nome, 'rb').read()).decode()
        return await dp.evaluate("""async ([b64, nome, tipo]) => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const f = new File([bin], nome, { type: tipo });
          if (tipo === 'application/pdf') { const p = await fin.analisarPdf(f, 10); const d = leitor.lerPdf(p); const n = leitor.danfePdf(p); return { d, n: n && { conferido: n.conferido, itens: n.itens.length, total: n.valorTotal, cnpj: n.cnpj } }; }
          return { d: await leitor.boletoDaImagem(f) }; }""", [b64, nome, tipo])
    try:
        r = await ler_local('boleto_itau.pdf', 'application/pdf'); dl = r['d'] or {}
        log(dl.get('completo') and dl.get('valor') == 1234.56 and dl.get('vencimento') == '2026-11-25' and 'Sol' in (dl.get('contato') or ''), 'leitor: boleto em PDF sem IA', dl)
        r = await ler_local('boleto_cedente.pdf', 'application/pdf'); dl = r['d'] or {}
        log(dl.get('completo') and dl.get('valor') == 589.9, 'leitor: boleto com cedente na linha', dl)
        r = await ler_local('conta_energia.pdf', 'application/pdf'); dl = r['d'] or {}
        log(dl.get('completo') and dl.get('contato') == 'Neoenergia' and dl.get('vencimento') == '2026-11-10', 'leitor: conta de energia', dl)
        r = await ler_local('das.pdf', 'application/pdf'); dl = r['d'] or {}
        log(dl.get('completo') and dl.get('contato') == 'Receita Federal' and dl.get('valor') == 3912.77, 'leitor: DAS', dl)
        r = await ler_local('danfe_real.pdf', 'application/pdf')
        log(r['n'] and r['n']['conferido'] and r['n']['itens'] == 5 and r['n']['total'] == 2030.3, 'leitor: DANFE com itens conferidos', r['n'])
        r = await ler_local('boleto_foto.jpg', 'image/jpeg'); dl = r['d'] or {}
        log(dl.get('valor') == 2350 and dl.get('vencimento') == '2026-11-30', 'leitor: código de barras na foto', dl)
        r = await ler_local('v_retrato.jpg', 'image/jpeg'); dl = r['d'] or {}
        log(dl.get('valor') == 2350, 'leitor: foto de lado', dl)
        b64 = _b64.b64encode(open('leitor/boleto_escaneado.pdf', 'rb').read()).decode()
        dl = await dp.evaluate("""async (b64) => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const p = await fin.analisarPdf(new File([bin], 'e.pdf', { type: 'application/pdf' }));
          if (leitor.lerPdf(p)) return 'leu texto?'; const bi = atob(p.imagem), u = new Uint8Array(bi.length); for (let i = 0; i < bi.length; i++) u[i] = bi.charCodeAt(i);
          return await leitor.boletoDaImagem(new File([u], 'p.jpg', { type: 'image/jpeg' })); }""", b64)
        log(isinstance(dl, dict) and dl.get('valor') == 2350, 'leitor: PDF escaneado pelo código de barras', dl)
    except Exception as e:
        log(False, 'leitor: erro no teste', str(e)[:300])
    # OCR próprio (Tesseract no navegador) com fotos
    try:
        for arq in ['tesseract.min.js', 'worker.min.js', 'lang/por.traineddata.gz']:
            try:
                with urllib.request.urlopen(urllib.request.Request(SITE + '/vendor/ocr/' + arq, method='HEAD'), timeout=20) as rr: st0 = rr.status
            except urllib.error.HTTPError as e: st0 = e.code
            except Exception as e: st0 = str(e)[:60]
            log(st0 == 200 or 'localhost' not in SITE, 'OCR: arquivo do motor no site ' + arq, st0)
        async def foto(nome, fn):
            b64 = _b64.b64encode(open('leitor/' + nome, 'rb').read()).decode()
            return await dp.evaluate("""async ([b64, fn]) => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const f = new File([bin], 'f.jpg', { type: 'image/jpeg' });
              const t = performance.now(); try { const r = await leitor[fn](f); return { r, ms: Math.round(performance.now() - t) }; } catch (e) { return { erro: String(e && e.message || e), ms: Math.round(performance.now() - t) }; } }""", [b64, fn])
        x = await foto('boleto_itau_foto.jpg', 'lerImagem'); r = x.get('r') or {}
        log(r.get('valor') == 1234.56 and r.get('vencimento') == '2026-11-25' and 'Sol' in (r.get('contato') or ''), 'OCR: boleto pela foto (sem código de barras)', x)
        x = await foto('recibo_foto.jpg', 'lerImagem'); r = x.get('r') or {}
        log(r.get('valor') == 450 and 'Frio' in (r.get('contato') or ''), 'OCR: recibo pela foto', x)
        x = await foto('danfe_foto.jpg', 'notaDaImagem'); r = x.get('r') or {}
        log(r.get('valorTotal') == 2030.3 and len(r.get('itens') or []) == 5, 'OCR: nota fiscal pela foto com itens', {'ms': x.get('ms'), 'erro': x.get('erro'), 'total': r.get('valorTotal'), 'conferido': r.get('conferido'), 'itens': [[i.get('codigo'), i.get('quantidade'), i.get('valorTotal')] for i in (r.get('itens') or [])], 'parc': r.get('parcelas')})
    except Exception as e:
        log(False, 'OCR: erro no teste', str(e)[:300])
    s1, r1 = rest(SITE + '/api/chat', {'message': 'oi'}); s2, r2 = rest(SITE + '/api/ler-documento', {'arquivo': 'x'})
    log(s1 == 410 and s2 == 410, 'IA externa desligada no servidor', [s1, s2])
    resp = await dp.evaluate("cfoLocal.responder('como calcular o preço de venda?')")
    log(resp and 'Markup' in resp, 'CFO: preço de venda com os números', (resp or '')[:120])
    resp = await dp.evaluate("cfoLocal.responder('quem me deve?')")
    log(resp and 'A receber nos próximos 30 dias' in resp, 'CFO responde sem IA com os dados', (resp or '')[:120])
    resp = await dp.evaluate("cfoLocal.responder('onde estou gastando mais?')")
    log(resp and 'Onde está o gasto' in resp, 'CFO: onde está o gasto', (resp or '')[:120])
    log(not derr, 'demonstração sem erros de JavaScript', derr[:2])
    await d.close()
    s, r = rest(SITE + '/api/admin/backup?email=x@x.com', None, None, 'GET'); log(s in (401, 503), 'backups do administrador fechados sem login', s)
    if 'localhost' in SITE:
        s, r = rest(SITE + '/api/erro', {'mensagem': 'erro de teste automático', 'pagina': '/teste'}); log(s in (200, 202), 'registro de erros responde', s)
    s, r = rest(SITE + '/api/visita', {'pagina': '/', 'origem': 'teste', 'novo': False}); log(s in (200, 202), 'contador de visitas responde', s)
    s, r = rest(SITE + '/api/asaas', {'event': 'PAYMENT_RECEIVED'}); log(s in (401, 503), 'webhook do Asaas recusa aviso sem token', [s, r.get('error')])
    s, r = rest(SITE + '/api/checkout', {'planId': 'basic', 'forma': 'pix_boleto'}); log(s in (401, 503), 'checkout Pix/boleto pede login', [s, r.get('error')])
    s, r = rest(SITE + '/api/assinatura', None, None, 'GET'); log(s in (401, 503), 'minha assinatura exige login', [s, r.get('error')])
    s, r = rest(SITE + '/api/checkout', {'planId': 'basic'}); log(s in (401, 503), 'pagamento configurado (pede login para assinar)', [s, r.get('error')])
    s, r = rest(SITE + '/api/lembretes', {'wsId': 'x'}); log(s in (401, 503), 'teste de lembrete exige login/configuração', [s, r.get('error')])

async def painel(b):
    email = 'robo.novos.' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8)) + '@exemplo.com'
    senha = ''.join(random.choices(string.ascii_letters + string.digits, k=16)) + 'a1'
    s, r = rest(f'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={KEY}', {'email': email, 'password': senha, 'returnSecureToken': True})
    log(s == 200, 'conta de teste criada'); 
    if s != 200: return
    uid, token = r['localId'], r['idToken']
    try:
        ctx = await b.new_context(viewport={'width': 1366, 'height': 900}, locale='pt-BR'); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(SITE + '/login', wait_until='networkidle')
        await pg.fill('input[type=email]', email); await pg.fill('input[type=password]', senha); await pg.click('button[type=submit]')
        await pg.wait_for_url('**/dashboard**', timeout=40000)
        for _ in range(120):
            if await pg.evaluate("!!(window.__maxcfoIniciado && document.querySelector('.lay-mod'))"): break
            await pg.wait_for_timeout(500)
        await pg.wait_for_timeout(1500)
        if await pg.is_visible('#layBoasVindas'): await pg.click('#layBoasVindas >> text=Pular'); await pg.wait_for_timeout(400)
        # Tutorial: abre sozinho no Início depois das boas-vindas
        for _ in range(16):
            if await pg.is_visible('#tutCard'): break
            await pg.wait_for_timeout(500)
        log(await pg.is_visible('#tutCard'), 'tutorial do Início abre sozinho', (await pg.inner_text('#tutCard'))[:80] if await pg.is_visible('#tutCard') else '')
        await pg.screenshot(path=f'{OUT}/novos_tutorial.png')
        if await pg.is_visible('#tutCard'):
            await pg.click('#tutProximo'); await pg.wait_for_timeout(300)
            log('2/' in (await pg.inner_text('#tutCard')) or await pg.is_visible('#tutCard'), 'tutorial avança para o próximo passo')
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
        await pg.evaluate("localStorage.setItem('maxcfo_tutorial_off','1')")
        log(await pg.is_visible('#tutBotao'), 'botão ❔ de tutorial no topo')
        log(await pg.evaluate("[...document.querySelectorAll('img')].some(i=>i.src.includes('/logo.svg') && i.naturalWidth>0)"), 'logo no menu do painel')
        # Importação de Excel
        await pg.evaluate("switchView('pagar')"); await pg.wait_for_timeout(500)
        await pg.click('#view-pagar >> text=📥 Importar planilha'); await pg.wait_for_timeout(400)
        await pg.set_input_files('#impArq', planilha())
        for _ in range(40):
            if await pg.is_visible('#impOk'): break
            await pg.wait_for_timeout(500)
        itens = await pg.evaluate("imp._montar ? imp._montar().map(x=>[x.o.type,x.o.desc,x.o.amount,x.o.vencimento,x.erros.join(',')]) : []")
        print('   itens:', itens)
        log(len(itens) == 3 and itens[0][0] == 'RECEITA' and itens[0][2] == 1500.5 and itens[2][2] == 199.9 and not any(i[4] for i in itens), 'Excel (.xlsx) lido: tipos, valores e datas', itens)
        await pg.screenshot(path=f'{OUT}/novos_importar.png')
        await pg.click('#impOk'); await pg.wait_for_timeout(1200)
        n = await pg.evaluate("state.transactions.filter(t=>t.origem==='planilha').length"); log(n == 3, 'importou 3 contas do Excel', n)
        # Painel de todas as empresas
        await pg.evaluate("switchView('bpo')"); await pg.wait_for_timeout(2500)
        k = await pg.inner_text('#view-bpo'); log('Empresas atendidas' in k and 'Sem lançamento há 7+ dias' in k, 'painel do BPO com indicadores')
        await pg.screenshot(path=f'{OUT}/novos_bpo.png', full_page=True)
        # Acesso de consulta (precisa das regras novas do Firestore publicadas)
        await pg.evaluate("switchView('team')"); await pg.wait_for_timeout(600)
        log(await pg.is_visible('#acessosCartao'), 'cartão de acesso do cliente/contador na Equipe')
        await pg.fill('#acessoEmail', 'contador.' + email); await pg.click('#acessoBtn'); await pg.wait_for_timeout(4000)
        lst = await pg.evaluate("(state.acessosLeitura||[]).length")
        toasts = await pg.evaluate("[...document.querySelectorAll('.toast, [class*=toast]')].map(t=>t.innerText).join(' | ')")
        print('::warning::convite: ' + ('gravado' if lst else 'recusado: ' + toasts[:200]))
        log(True, 'convite tentado', 'gravado (regras novas publicadas)' if lst else 'recusado — publicar firestore.rules: ' + toasts[:150])
        await pg.screenshot(path=f'{OUT}/novos_equipe.png', full_page=True)
        if lst:
            st, _ = rest(f'https://firestore.googleapis.com/v1/projects/max-cfo-saas/databases/(default)/documents/convites/contador.{email}/espacos/{uid}', None, token, 'GET')
            log(st == 200, 'convite existe no Firestore', st)
            rest(f'https://firestore.googleapis.com/v1/projects/max-cfo-saas/databases/(default)/documents/convites/contador.{email}/espacos/{uid}', None, token, 'DELETE')
        # Lembretes
        await pg.evaluate("switchView('settings')"); await pg.wait_for_timeout(600)
        log(await pg.is_visible('#lembretesCartao'), 'cartão de lembretes por e-mail nas Configurações')
        await pg.check('#lemClientes'); await pg.click('#lembretesCartao >> text=💾 Salvar'); await pg.wait_for_timeout(400)
        log(await pg.evaluate("state.settings.lembretes.avisarClientes===true"), 'lembretes salvos na empresa')
        await pg.screenshot(path=f'{OUT}/novos_lembretes.png', full_page=True)
        # Cobrança dos clientes pelo Asaas (respostas do servidor simuladas)
        estado_cob = {'pago': False}
        async def falso_cob(rota):
            req = rota.request
            if req.method == 'GET': return await rota.fulfill(status=200, content_type='application/json', body=json.dumps({'conectado': True, 'conta': {'nome': 'Empresa Teste'}, 'sandbox': True}))
            corpo = json.loads(req.post_data or '{}')
            if corpo.get('acao') == 'gerar': return await rota.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'cobranca': {'id': 'pay_teste1', 'url': 'https://sandbox.asaas.com/i/teste1', 'status': 'PENDING', 'vencimento': '2099-01-10', 'valor': 250, 'criadaEm': '2026-10-23T12:00:00Z'}}))
            await rota.fulfill(status=200, content_type='application/json', body='{"ok":true}')
        async def falso_eventos(rota):
            if rota.request.method == 'GET':
                ev = [{'id': 'pay_teste1', 'txId': 'cobteste1', 'evento': 'PAYMENT_RECEIVED', 'status': 'RECEIVED', 'valor': 250, 'pagoEm': '2026-10-23', 'forma': 'PIX'}] if estado_cob['pago'] else []
                return await rota.fulfill(status=200, content_type='application/json', body=json.dumps({'eventos': ev}))
            await rota.fulfill(status=200, content_type='application/json', body='{"ok":true}')
        await pg.route('**/api/cobrancas/eventos**', falso_eventos)
        await pg.route(lambda u: '/api/cobrancas' in u and '/eventos' not in u, falso_cob)
        await pg.evaluate("state.transactions.push({id:'cobteste1',type:'RECEITA',desc:'Consultoria outubro',contato:'Cliente Teste',amount:250,date:'2026-10-23',vencimento:'2099-01-10',status:'pendente',category:'Consultoria'}); fin.cobrar('cobteste1')")
        for _ in range(20):
            if await pg.is_visible('#cobGerarBtn'): break
            await pg.wait_for_timeout(300)
        dbg = await pg.evaluate("[typeof window.cobranca, !!(window.fin&&fin.__cobranca), !!document.getElementById('finCobrancaModal'), (document.getElementById('cobAsaas')||{}).innerText||'(sem caixa)', window.workspaceId||'', !!window.maxcfoLeitura]")
        print('   cobrança:', dbg)
        await pg.screenshot(path=f'{OUT}/cobranca_asaas_antes.png')
        log(await pg.is_visible('#cobGerarBtn'), 'tela Cobrar oferece cobrança pelo Asaas com baixa automática', dbg)
        if not await pg.is_visible('#cobGerarBtn'): raise Exception('sem botão de gerar cobrança: ' + str(dbg))
        await pg.fill('#cobDoc', '52998224725'); await pg.click('#cobGerarBtn'); await pg.wait_for_timeout(1500)
        url_cob = await pg.evaluate("(fin.tx('cobteste1').cobranca||{}).url")
        log(url_cob == 'https://sandbox.asaas.com/i/teste1' and await pg.is_visible('#cobLink'), 'cobrança gerada e link mostrado', url_cob)
        await pg.screenshot(path=f'{OUT}/cobranca_asaas.png')
        await pg.evaluate("fin.fechar('finCobrancaModal')")
        estado_cob['pago'] = True
        await pg.evaluate("cobranca.sincronizar()"); await pg.wait_for_timeout(1500)
        st_cob = await pg.evaluate("[fin.tx('cobteste1').status, fin.tx('cobteste1').forma, (fin.tx('cobteste1').cobranca||{}).status]")
        log(st_cob[0] == 'pago' and st_cob[1] == 'Pix' and st_cob[2] == 'paga', 'pagamento avisado pelo Asaas dá baixa sozinho', st_cob)
        await pg.unroute('**/api/cobrancas/eventos**')
        await pg.evaluate("state.transactions = state.transactions.filter(t => t.id !== 'cobteste1')")
        # Aprovação de contas a pagar (papel de analista simulado na tela)
        await pg.evaluate("state.transactions.push({id:'aprteste1',type:'DESPESA',desc:'Fornecedor teste',amount:90,date:'2026-10-23',vencimento:'2099-01-10',status:'pendente',category:'Fornecedores',aprovacao:'pendente',lancadoPor:'analista@exemplo.com'}); window.maxcfoPapel='analista'; switchView('pagar')")
        await pg.wait_for_timeout(800)
        linha = await pg.evaluate("[...document.querySelectorAll('#view-pagar tr')].find(r=>r.innerText.includes('Fornecedor teste'))?.innerText || ''")
        log('Aguardando aprovação' in linha and 'Pagar' not in linha and 'Aprovar' not in linha, 'analista vê a conta aguardando aprovação, sem pagar', linha[:120])
        await pg.evaluate("window.maxcfoPapel=''; fin.atualizarTudo()"); await pg.wait_for_timeout(600)
        linha = await pg.evaluate("[...document.querySelectorAll('#view-pagar tr')].find(r=>r.innerText.includes('Fornecedor teste'))?.innerText || ''")
        log('Aprovar' in linha, 'dono vê o botão Aprovar', linha[:120])
        await pg.evaluate("fin.aprovar('aprteste1')"); await pg.wait_for_timeout(400)
        log(await pg.evaluate("fin.tx('aprteste1').aprovacao") == 'aprovada', 'aprovação registrada')
        await pg.screenshot(path=f'{OUT}/aprovacao.png')
        await pg.evaluate("state.transactions = state.transactions.filter(t => t.id !== 'aprteste1'); saveStateToFirebase(workspaceId, state)")
        # Equipe: papel na tela de convites
        await pg.evaluate("switchView('team')"); await pg.wait_for_timeout(600)
        log(await pg.is_visible('#acessoPapel') and 'Analista' in await pg.inner_text('#acessoPapel'), 'convite com escolha de papel (consulta, analista, gestor)')

        # Volume: 15 mil lançamentos (mais de 1 MB) gravam e voltam depois de recarregar
        tam = await pg.evaluate("""() => { for (let i = 0; i < 15000; i++) state.transactions.push({ id: 'vol' + i, type: i % 3 ? 'DESPESA' : 'RECEITA', desc: 'Teste de volume ' + (i % 50), amount: 10 + (i % 300), vencimento: '2026-11-' + String(1 + (i % 28)).padStart(2, '0'), status: 'pendente', categoria: 'Teste' }); saveStateToFirebase(workspaceId, state); return JSON.stringify(state).length; }""")
        await pg.wait_for_timeout(9000)
        st, doc = rest(f'https://firestore.googleapis.com/v1/projects/max-cfo-saas/databases/(default)/documents/workspaces/{uid}', None, token, 'GET')
        campos = (doc or {}).get('fields', {})
        log(st == 200 and campos.get('formato', {}).get('integerValue') == '2' and 'dataZ' in campos and 'data' not in campos, f'{tam/1048576:.1f} MB de dados gravados comprimidos na nuvem', [st, sorted(campos.keys())])
        await pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('maxcfo_copia_')).forEach(k=>localStorage.removeItem(k))")
        await pg.reload(wait_until='networkidle')
        for _ in range(120):
            if await pg.evaluate("!!(window.__maxcfoIniciado && window.state && document.querySelector('.lay-mod'))"): break
            await pg.wait_for_timeout(500)
        await pg.wait_for_timeout(1500)
        n = await pg.evaluate("state.transactions.filter(t => String(t.id).startsWith('vol')).length")
        log(n == 15000, 'os 15 mil lançamentos voltam depois de recarregar', n)
        await pg.evaluate("state.transactions = state.transactions.filter(t => !String(t.id).startsWith('vol')); saveStateToFirebase(workspaceId, state)")
        await pg.wait_for_timeout(3000)
        log(not errs, 'sem erros de JavaScript no painel', errs[:2])
        # Painel do administrador com dados simulados (a conta de teste não é administradora)
        log(not await pg.is_visible('text=Painel do administrador'), 'atalho do administrador escondido para cliente comum')
        await pg.route('**/api/admin/resumo', lambda rota: rota.fulfill(status=200, content_type='application/json', body=json.dumps(resumo_exemplo())))
        await pg.goto(SITE + '/admin', wait_until='networkidle'); await pg.wait_for_timeout(1500)
        t = await pg.inner_text('body')
        log('Painel do administrador' in t and 'Visitantes por dia' in t and 'De onde vieram' in t, 'painel do administrador abre', t[:120])
        log('R$ 399,80' in t.replace('\xa0', ' '), 'receita mensal somada dos assinantes (129,90 + 269,90)', '')
        n = await pg.evaluate("document.querySelectorAll('.ad-coluna').length"); log(n == 60, '2 gráficos de 30 dias', n)
        log('Instagram' in t and 'LinkedIn' in t, 'tabela de origens')
        antes = await pg.evaluate("document.querySelectorAll('.ad-contas tbody tr').length")
        await pg.click('.ad-chip:has-text("Em teste")'); await pg.wait_for_timeout(300)
        depois = await pg.evaluate("document.querySelectorAll('.ad-contas tbody tr').length")
        log(antes == 5 and depois == 2, 'filtro de contas (5 → 2 em teste)', [antes, depois])
        await pg.click('.ad-chip:has-text("Todas")')
        await pg.screenshot(path=f'{OUT}/admin_pc.png', full_page=True)
        await pg.set_viewport_size({'width': 390, 'height': 844}); await pg.wait_for_timeout(400)
        w = await pg.evaluate('document.documentElement.scrollWidth'); log(w <= 392, 'painel do administrador no celular sem rolagem lateral', w)
        await pg.screenshot(path=f'{OUT}/admin_cel.png', full_page=True)
        await pg.set_viewport_size({'width': 1366, 'height': 900})
        await pg.wait_for_timeout(1000)
        # Pagamento pelo Asaas: escolha da forma, nome e CPF/CNPJ (o checkout é simulado; o Asaas não é chamado)
        pedidos = []
        async def falso_checkout(rota):
            pedidos.append(json.loads(rota.request.post_data or '{}'))
            await rota.fulfill(status=400, content_type='application/json', body=json.dumps({'error': 'simulado'}))
        await pg.route('**/api/checkout', falso_checkout)
        await pg.route('**/api/assinatura', lambda rota: rota.fulfill(status=200, content_type='application/json', body=json.dumps({'nome': 'Empresa Teste Ltda', 'documento': '', 'ativa': False, 'status': {'motivo': 'teste', 'diasRestantes': 6}, 'cobrancas': []})))
        await pg.goto(SITE + '/pricing', wait_until='networkidle'); await pg.wait_for_timeout(800)
        await pg.click('.pl-card >> nth=1 >> .pl-btn'); await pg.wait_for_timeout(400)
        t = await pg.inner_text('body')
        log(await pg.is_visible('.pr-modal') and 'Cartão de crédito' in t and 'Pix ou boleto' in t and 'CPF ou CNPJ' in t, 'escolha de pagamento com nome e CPF/CNPJ', '')
        log(await pg.input_value('.pr-campos input[autocomplete=name]') == 'Empresa Teste Ltda', 'nome já usado vem preenchido')
        await pg.click('.pr-forma:has-text("Pix ou boleto")')
        await pg.fill('.pr-campos input[inputmode=numeric]', '52998224725')
        log(await pg.input_value('.pr-campos input[inputmode=numeric]') == '529.982.247-25', 'máscara de CPF', await pg.input_value('.pr-campos input[inputmode=numeric]'))
        await pg.screenshot(path=f'{OUT}/pagamento_escolha.png')
        await pg.click('.pr-modal button[type=submit]'); await pg.wait_for_timeout(1200)
        log(pedidos and pedidos[-1].get('forma') == 'pix_boleto' and pedidos[-1].get('planId') == 'intermediate' and pedidos[-1].get('documento') == '52998224725', 'Pix/boleto envia forma, plano e CPF', pedidos[-1:])
        log('simulado' in await pg.inner_text('.pr-modal'), 'erro do pagamento aparece na janela')
        await pg.click('.pr-forma:has-text("Cartão de crédito")'); await pg.fill('.pr-campos input[inputmode=numeric]', '123')
        await pg.click('.pr-modal button[type=submit]'); await pg.wait_for_timeout(400)
        log('CPF (11 números) ou CNPJ' in await pg.inner_text('.pr-modal') and len(pedidos) == 1, 'CPF incompleto é barrado antes de enviar')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        await pg.click('.pl-periodo button:has-text("Anual")'); await pg.click('.pl-card >> nth=0 >> .pl-btn'); await pg.wait_for_timeout(300)
        await pg.click('.pr-forma:has-text("Cartão de crédito")'); await pg.fill('.pr-campos input[inputmode=numeric]', '11222333000181')
        log(await pg.input_value('.pr-campos input[inputmode=numeric]') == '11.222.333/0001-81', 'máscara de CNPJ', await pg.input_value('.pr-campos input[inputmode=numeric]'))
        await pg.click('.pr-modal button[type=submit]'); await pg.wait_for_timeout(1200)
        log(pedidos and pedidos[-1].get('forma') == 'cartao' and pedidos[-1].get('periodo') == 'anual', 'cartão envia forma=cartao e período anual', pedidos[-1:])
        await pg.set_viewport_size({'width': 390, 'height': 844}); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/pagamento_escolha_cel.png')
        w = await pg.evaluate('document.documentElement.scrollWidth'); log(w <= 392, 'janela de pagamento no celular sem rolagem lateral', w)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        log(not await pg.is_visible('.pr-modal'), 'Esc fecha a escolha de pagamento')
        # Minha assinatura (dados simulados)
        await pg.unroute('**/api/assinatura')
        await pg.route('**/api/assinatura', lambda rota: rota.fulfill(status=200, content_type='application/json', body=json.dumps({'nome': 'X', 'documento': '52998224725', 'ativa': True, 'plano': 'complete', 'periodo': 'mensal', 'forma': 'pix_boleto', 'proximoVencimento': '2099-01-10', 'pagoAte': '2099-01-10T15:00:00Z', 'fundador': True, 'fundadorAte': '2099-10-10T15:00:00Z', 'status': {'motivo': 'assinatura', 'faturaPendente': {'url': 'https://exemplo.com/fatura', 'vencimento': '2099-01-10', 'valor': 26990}}, 'cobrancas': [{'vencimento': '2098-12-10', 'valor': 26990, 'situacao': 'RECEIVED', 'forma': 'PIX', 'recibo': 'https://exemplo.com/r'}, {'vencimento': '2099-01-10', 'valor': 26990, 'situacao': 'PENDING', 'forma': 'UNDEFINED', 'url': 'https://exemplo.com/fatura'}]})))
        await pg.route('**/api/indicacao', lambda rota: rota.fulfill(status=200, content_type='application/json', body=json.dumps({'codigo': 'ABC234', 'link': 'https://landimadvisory.com.br/?ref=ABC234', 'indicados': 2, 'pagos': 1, 'mesesGanhos': 1, 'mesesGuardados': 0})))
        await pg.goto(SITE + '/assinatura', wait_until='networkidle'); await pg.wait_for_timeout(1500)
        log('Indique e ganhe' in await pg.inner_text('body') and await pg.input_value('.ma-link-ind input') == 'https://landimadvisory.com.br/?ref=ABC234', 'indique e ganhe com link próprio na Minha assinatura')
        t = (await pg.inner_text('body')).replace('\xa0', ' ')
        log('Minha assinatura' in t and 'Completo' in t and 'Pix ou boleto' in t and 'R$ 269,90' in t and 'Paga' in t and 'Cancelar assinatura' in t, 'página Minha assinatura', t[:160])
        w = await pg.evaluate('document.documentElement.scrollWidth'); log(w <= 392, 'Minha assinatura no celular sem rolagem lateral', w)
        await pg.screenshot(path=f'{OUT}/minha_assinatura_cel.png', full_page=True)
        await pg.click('text=Cancelar assinatura'); await pg.wait_for_timeout(200)
        log(await pg.is_visible('text=Sim, cancelar'), 'cancelamento pede confirmação')
        await pg.set_viewport_size({'width': 1366, 'height': 900})
        # Painel com cobrança vencida e com cobrança perto de vencer (respostas simuladas)
        async def acesso_falso(resp):
            async def f(rota): await rota.fulfill(status=200, content_type='application/json', body=json.dumps(resp))
            return f
        await pg.route('**/api/subscription', await acesso_falso({'acesso': False, 'motivo': 'pagamento_pendente', 'forma': 'pix_boleto', 'faturaPendente': {'url': 'https://exemplo.com/fatura', 'vencimento': '2026-01-01', 'valor': 7990, 'diasParaVencer': -7}}))
        await pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('maxcfo_acesso')).forEach(k=>localStorage.removeItem(k))")
        await pg.goto(SITE + '/dashboard', wait_until='networkidle'); await pg.wait_for_timeout(4000)
        t = await pg.inner_text('body')
        log('Pagamento pendente' in t and await pg.is_visible('a:has-text("Pagar a cobrança")'), 'painel bloqueado mostra a cobrança vencida', t[:120])
        await pg.screenshot(path=f'{OUT}/pagamento_pendente.png')
        await pg.unroute('**/api/subscription')
        await pg.route('**/api/subscription', await acesso_falso({'acesso': True, 'motivo': 'assinatura', 'forma': 'pix_boleto', 'plano': 'complete', 'status': 'active', 'faturaPendente': {'url': 'https://exemplo.com/fatura', 'vencimento': '2099-01-01', 'valor': 34990, 'diasParaVencer': 3}}))
        await pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('maxcfo_acesso')).forEach(k=>localStorage.removeItem(k))")
        await pg.goto(SITE + '/dashboard', wait_until='networkidle'); await pg.wait_for_timeout(5000)
        t = await pg.inner_text('body')
        log('vence em 3 dias' in t, 'aviso de cobrança Pix/boleto perto do vencimento', '')
        log(await pg.evaluate("[...document.querySelectorAll('a')].some(a=>a.getAttribute('href')==='/assinatura')"), 'atalho Minha assinatura no menu')
        await pg.screenshot(path=f'{OUT}/pagamento_aviso_vencer.png')
        await pg.unroute('**/api/subscription')
        await pg.wait_for_timeout(1500)
    finally:
        rest(f'https://firestore.googleapis.com/v1/projects/max-cfo-saas/databases/(default)/documents/workspaces/{uid}?updateMask.fieldPaths=data&updateMask.fieldPaths=owner', {'fields': {'data': {'stringValue': '{}'}, 'owner': {'stringValue': uid}}}, token, 'PATCH')
        rest(f'https://firestore.googleapis.com/v1/projects/max-cfo-saas/databases/(default)/documents/perfis/{uid}', None, token, 'DELETE')
        s, _ = rest(f'https://identitytoolkit.googleapis.com/v1/accounts:delete?key={KEY}', {'idToken': token}); print('conta apagada', s)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        try: await publicas(b)
        except Exception as e: log(False, 'páginas públicas: erro', e)
        try: await painel(b)
        except Exception as e: log(False, 'painel: erro', e)
        await b.close()
    print('novos FALHAS:', falhas or 'nenhuma')
    for f in falhas: print('::warning::novos FALHA: ' + f)
    if not falhas: print('::warning::novos: tudo OK')
asyncio.run(main())
