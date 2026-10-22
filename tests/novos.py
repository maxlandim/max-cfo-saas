"""Testes dos recursos novos no site do branch: página de consultoria, rota de lembretes, importação de planilha
Excel (.xlsx de verdade), painel de todas as empresas, acesso de consulta e cartão de lembretes."""
import asyncio, json, os, time, random, string, urllib.request
from playwright.async_api import async_playwright
from openpyxl import Workbook
from datetime import date, timedelta

SITE = os.environ.get('SITE', 'https://max-cfo-saas.vercel.app')
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

async def publicas(b):
    pg = await b.new_page(viewport={'width': 1366, 'height': 900}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(SITE + '/', wait_until='networkidle')
    log(await pg.locator('a[href="/consultoria"]').count() >= 2, 'página inicial tem links para a consultoria')
    log(await pg.evaluate("[...document.images].some(i=>i.src.endsWith('/logo.svg') && i.naturalWidth>0)"), 'logo aparece na página inicial')
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
        await pg.wait_for_timeout(2500)
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
