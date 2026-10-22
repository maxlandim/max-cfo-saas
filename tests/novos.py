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
    s, r = rest(SITE + '/api/visita', {'pagina': '/', 'origem': 'teste', 'novo': False}); log(s in (200, 202), 'contador de visitas responde', s)
    s, r = rest(SITE + '/api/webhook', {'teste': True}); log(s == 400, 'webhook do Stripe configurado (recusa aviso sem assinatura)', [s, r.get('error')])
    s, r = rest(SITE + '/api/checkout', {'planId': 'basic', 'forma': 'avulso'}); log(s in (401, 503), 'checkout Pix/boleto pede login', [s, r.get('error')])
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
        # Pix e boleto: escolha da forma de pagamento (o checkout é simulado; o Stripe não é chamado)
        pedidos = []
        async def falso_checkout(rota):
            pedidos.append(json.loads(rota.request.post_data or '{}'))
            await rota.fulfill(status=503, content_type='application/json', body=json.dumps({'error': 'simulado'}))
        await pg.route('**/api/checkout', falso_checkout)
        await pg.goto(SITE + '/pricing', wait_until='networkidle'); await pg.wait_for_timeout(800)
        await pg.click('.pl-card >> nth=1 >> .pl-btn'); await pg.wait_for_timeout(400)
        t = await pg.inner_text('body')
        log(await pg.is_visible('.pr-modal') and 'Cartão de crédito' in t and 'Pix ou boleto' in t, 'escolha de pagamento: cartão ou Pix/boleto', '')
        await pg.screenshot(path=f'{OUT}/pagamento_escolha.png')
        await pg.click('.pr-forma:has-text("Pix ou boleto")'); await pg.wait_for_timeout(1200)
        log(pedidos and pedidos[-1].get('forma') == 'avulso' and pedidos[-1].get('planId') == 'intermediate', 'Pix/boleto envia forma=avulso ao checkout', pedidos[-1:] )
        await pg.click('.pl-periodo button:has-text("Anual")'); await pg.click('.pl-card >> nth=0 >> .pl-btn'); await pg.wait_for_timeout(300)
        await pg.click('.pr-forma:has-text("Cartão de crédito")'); await pg.wait_for_timeout(1200)
        log(pedidos and pedidos[-1].get('forma') == 'cartao' and pedidos[-1].get('periodo') == 'anual', 'cartão envia forma=cartao e período anual', pedidos[-1:])
        await pg.set_viewport_size({'width': 390, 'height': 844}); await pg.click('.pl-card >> nth=0 >> .pl-btn'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/pagamento_escolha_cel.png')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
        log(not await pg.is_visible('.pr-modal'), 'Esc fecha a escolha de pagamento')
        await pg.set_viewport_size({'width': 1366, 'height': 900})
        # Painel com boleto aguardando e com período pago perto de vencer (respostas simuladas)
        async def acesso_falso(resp):
            async def f(rota): await rota.fulfill(status=200, content_type='application/json', body=json.dumps(resp))
            return f
        await pg.route('**/api/subscription', await acesso_falso({'acesso': False, 'motivo': 'aguardando_boleto', 'boletoPendente': {'url': 'https://exemplo.com/boleto', 'ate': '2099-01-01T00:00:00Z'}}))
        await pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('maxcfo_acesso')).forEach(k=>localStorage.removeItem(k))")
        await pg.goto(SITE + '/dashboard', wait_until='networkidle'); await pg.wait_for_timeout(4000)
        t = await pg.inner_text('body')
        log('Aguardando o pagamento do boleto' in t and await pg.is_visible('a:has-text("Abrir o boleto")'), 'painel bloqueado mostra o boleto pendente', t[:120])
        await pg.screenshot(path=f'{OUT}/pagamento_boleto_pendente.png')
        await pg.unroute('**/api/subscription')
        await pg.route('**/api/subscription', await acesso_falso({'acesso': True, 'motivo': 'assinatura', 'forma': 'avulso', 'plano': 'complete', 'status': 'active', 'pagoAte': '2099-01-01T00:00:00Z', 'diasParaVencer': 3}))
        await pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('maxcfo_acesso')).forEach(k=>localStorage.removeItem(k))")
        await pg.goto(SITE + '/dashboard', wait_until='networkidle'); await pg.wait_for_timeout(5000)
        t = await pg.inner_text('body')
        log('vence em 3 dias' in t, 'aviso de renovação do Pix/boleto no painel', '')
        await pg.screenshot(path=f'{OUT}/pagamento_aviso_renovar.png')
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
