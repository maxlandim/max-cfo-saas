"""Teste de ponta a ponta no site publicado: cria uma conta de teste, entra, abre todos os módulos
e funcionalidades do menu, lança uma conta e confere se ficou salva. Apaga a conta no final."""
import asyncio, json, os, time, random, string, urllib.request
from playwright.async_api import async_playwright

SITE = os.environ.get('SITE', 'https://landimadvisory.com.br')
KEY = 'AIzaSyAsQS2b0oYMHJ_BExiXH0xgD49j68pwZ6M'  # chave Web pública do Firebase (a mesma do site)
OUT = 'saida'; os.makedirs(OUT, exist_ok=True)
rel = {'passos': [], 'falhas': [], 'console': [], 'tempos': {}}

def log(ok, nome, extra=''):
    print(('OK   ' if ok else 'FALHA'), nome, extra, flush=True)
    rel['passos'].append([ok, nome, str(extra)[:400]])
    if not ok: rel['falhas'].append(nome)

def rest(url, corpo, token=None, metodo='POST'):
    req = urllib.request.Request(url, data=json.dumps(corpo).encode() if corpo is not None else None, method=metodo, headers={'Content-Type': 'application/json', **({'Authorization': 'Bearer ' + token} if token else {})})
    try:
        with urllib.request.urlopen(req, timeout=30) as r: return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b'{}')

async def esperar_painel(pg, rotulo):
    t0 = time.time(); ultimo = ''
    for _ in range(240):
        st = await pg.evaluate("""() => ({ pronto: !!(window.__maxcfoIniciado && document.querySelector('.lay-mod')), overlay: [...document.querySelectorAll('div')].filter(d => getComputedStyle(d).position==='fixed' && +getComputedStyle(d).zIndex>=99998 && /Entrando|Conferindo|Lendo|Carregando|Abrindo|nuvem/.test(d.innerText)).map(d=>d.innerText.trim().slice(0,120)) })""")
        ultimo = st['overlay']
        if st['pronto'] and not st['overlay']: break
        await pg.wait_for_timeout(500)
    rel['tempos'][rotulo] = round(time.time() - t0, 1)
    return round(time.time() - t0, 1), ultimo

async def main():
    email = 'robo.teste.' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8)) + '@exemplo.com'
    senha = ''.join(random.choices(string.ascii_letters + string.digits, k=16)) + 'a1'
    s, r = rest(f'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={KEY}', {'email': email, 'password': senha, 'returnSecureToken': True})
    log(s == 200, 'conta de teste criada no Firebase', r.get('error', {}).get('message', ''))
    if s != 200:
        json.dump(rel, open(f'{OUT}/relatorio.json', 'w'), ensure_ascii=False, indent=1); return
    uid, token = r['localId'], r['idToken']
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx = await b.new_context(viewport={'width': 1366, 'height': 900}, locale='pt-BR')
            await ctx.add_init_script("try{localStorage.setItem('maxcfo_tutorial_off','1')}catch(e){}")  # o tutorial é testado em novos.py
            pg = await ctx.new_page()
            pg.on('console', lambda m: rel['console'].append([m.type, m.text[:300]]) if m.type in ('error', 'warning') else None)
            pg.on('pageerror', lambda e: rel['console'].append(['pageerror', str(e)[:500]]))
            pg.on('requestfailed', lambda q: rel['console'].append(['requestfailed', q.url[:150] + ' ' + str(q.failure)]))
            t0 = time.time()
            await pg.goto(SITE + '/login', wait_until='domcontentloaded')
            rel['tempos']['login_abre'] = round(time.time() - t0, 1)
            await pg.wait_for_load_state('networkidle'); rel['tempos']['login_pronto'] = round(time.time() - t0, 1)
            await pg.fill('input[type=email]', email); await pg.fill('input[type=password]', senha)
            await pg.click('button[type=submit]')
            try:
                await pg.wait_for_url('**/dashboard**', timeout=40000)
            except Exception:
                await pg.screenshot(path=f'{OUT}/00_login_travou.png')
                log(False, 'login não foi para o painel', (await pg.inner_text('body'))[:400])
                raise
            seg, ov = await esperar_painel(pg, 'painel_primeira_vez')
            log(not ov, f'painel abre (1ª vez) em {seg}s', ov)
            await pg.screenshot(path=f'{OUT}/01_painel.png')
            await pg.wait_for_timeout(3000)
            r0 = await pg.evaluate("[!!document.getElementById('view-receber'), document.querySelectorAll('.lay-mod').length, document.querySelectorAll('.sidebar-nav .nav-item').length]")
            log(r0[0] and r0[1] >= 6, 'painel continua montado 3 s depois de abrir (sem redesenho do React)', r0)
            # pula as boas-vindas
            if await pg.is_visible('#layBoasVindas'):
                await pg.click('#layBoasVindas >> text=Pular'); await pg.wait_for_timeout(400)
            # ── módulos ──
            mods = await pg.evaluate("[...document.querySelectorAll('.lay-mod')].map(m=>m.dataset.mod)")
            log(len(mods) >= 6, 'módulos no menu', mods)
            for m in mods:
                sel = f'.lay-mod[data-mod="{m}"]'
                if 'aberto' not in (await pg.get_attribute(sel, 'class') or ''):
                    await pg.click(f'{sel} .lay-mod-h'); await pg.wait_for_timeout(300)
                aberto = 'aberto' in (await pg.get_attribute(sel, 'class') or '')
                vis = await pg.is_visible(f'{sel} .lay-mod-itens')
                log(aberto and vis, f'módulo "{m}" abre ao clicar')
                if await pg.locator(f'{sel} .lay-vermais').count() and '+' in (await pg.inner_text(f'{sel} .lay-vermais')):
                    await pg.click(f'{sel} .lay-vermais'); await pg.wait_for_timeout(300)
                itens = await pg.evaluate(f"[...document.querySelectorAll('{sel} .nav-item')].map(a=>[a.dataset.view,a.innerText.trim()])")
                for vid, nome in itens:
                    antes = len(rel['console'])
                    await pg.click(f'#nav-{vid}'); await pg.wait_for_timeout(500)
                    r2 = await pg.evaluate(f"(()=>{{const v=document.getElementById('view-{vid}');return [!!v&&v.classList.contains('active'), v?(v.innerText.trim().length + (v.querySelector('iframe[src]')?100:0)):0, (document.getElementById('breadcrumb-label')||{{}}).textContent]}})()")
                    erros = [c for c in rel['console'][antes:] if c[0] == 'pageerror' or (c[0] == 'error' and '403' not in c[1])]
                    log(r2[0] and r2[1] > 20 and not erros, f'  {m} › {nome} abre', (r2, erros[:2]))
                    await pg.screenshot(path=f'{OUT}/tela_{vid}.png')
                    # o menu continua com este módulo aberto
                    if 'aberto' not in (await pg.get_attribute(sel, 'class') or ''):
                        log(False, f'  menu fechou o módulo ao abrir {nome}')
                        await pg.click(f'{sel} .lay-mod-h'); await pg.wait_for_timeout(300)
            # tema claro/escuro
            await pg.click('#temaBtn'); await pg.wait_for_timeout(400)
            t1 = await pg.evaluate("[document.documentElement.dataset.tema, getComputedStyle(document.body).backgroundColor]")
            await pg.screenshot(path=f'{OUT}/tema_claro.png')
            await pg.click('#temaBtn'); await pg.wait_for_timeout(400)
            t2 = await pg.evaluate("document.documentElement.dataset.tema")
            log(t1[0] == 'claro' and t1[1] == 'rgb(243, 245, 249)' and t2 == 'escuro', 'botão de tema alterna claro e escuro', [t1, t2])
            # abas no topo
            await pg.click('.lay-mod[data-mod="Financeiro"] .lay-mod-h'); await pg.wait_for_timeout(300)
            await pg.click('#nav-receber'); await pg.wait_for_timeout(400)
            if await pg.locator('#laySubnav >> text=Contas a pagar').count():
                await pg.click('#laySubnav >> text=Contas a pagar'); await pg.wait_for_timeout(400)
            log(await pg.evaluate("document.getElementById('view-pagar').classList.contains('active')"), 'abas do topo do módulo navegam')
            # lançamento + salvar na nuvem
            await pg.click('#view-pagar >> text=+ Nova conta a pagar'); await pg.wait_for_timeout(500)
            await pg.fill('#txDesc', 'Teste robô aluguel'); await pg.fill('#txAmount', '1234.56')
            await pg.click('#txSubmitBtn'); await pg.wait_for_timeout(4000)
            log('Teste robô aluguel' in await pg.inner_text('#view-pagar'), 'conta a pagar aparece na lista')
            await pg.reload(wait_until='domcontentloaded')
            seg, ov = await esperar_painel(pg, 'painel_segunda_vez')
            log(not ov, f'painel abre (2ª vez) em {seg}s', ov)
            await pg.evaluate("switchView('pagar')"); await pg.wait_for_timeout(500)
            log('Teste robô aluguel' in await pg.inner_text('#view-pagar'), 'lançamento continua depois de recarregar')
            st, doc = rest(f'https://firestore.googleapis.com/v1/projects/max-cfo-saas/databases/(default)/documents/workspaces/{uid}', None, token, 'GET')
            texto = json.dumps(doc, ensure_ascii=False)
            z = ((doc or {}).get('fields', {}).get('dataZ') or {}).get('bytesValue')
            if z:  # formato novo: dados comprimidos (gzip) em base64
                import base64, gzip
                texto = gzip.decompress(base64.b64decode(z)).decode('utf-8')
            log(st == 200 and 'Teste robô aluguel' in texto, 'lançamento gravado na nuvem (Firestore)', st if st != 200 else ('comprimido' if z else 'texto'))
            # anexos guardados no próprio servidor (/api/anexos), com link assinado
            try:
                r = await pg.evaluate("""(async()=>{ const f=new File(['%PDF-1.4 anexo do robo'],'Recibo teste robô.pdf',{type:'application/pdf'});
                  const url=await window.uploadFileToFirebase(window.workspaceId,f); if(!url) return {url:null};
                  const a=await fetch(url); const txt=await a.text(); const b=await fetch(url.replace(/t=[^&]+/,'t=errado'));
                  const s=await (await fetch('/api/saude')).json(); return {url, st:a.status, txt, tipo:a.headers.get('content-type'), falso:b.status, saude:s}; })()""")
                log(r.get('url') and r.get('st') == 200 and r.get('txt') == '%PDF-1.4 anexo do robo' and 'pdf' in (r.get('tipo') or ''), 'anexo enviado e aberto pelo link', r)
                log(r.get('falso') == 404, 'link de anexo com assinatura errada não abre', r.get('falso'))
                sd = r.get('saude') or {}
                log(sd.get('anexos') is True and sd.get('volume') is True, 'pasta dos anexos em volume persistente (sobrevive ao Redeploy)', sd)
            except Exception as e:
                log(False, 'anexos', str(e)[:300])
            # relatório mensal em PDF
            try:
                await pg.evaluate("switchView('reports')"); await pg.wait_for_timeout(800)
                tx = await pg.inner_text('#relPrevia')
                log('Teste robô aluguel' in tx and 'EM RESUMO' in tx.upper(), 'relatório mensal mostra a prévia com os lançamentos')
                async with pg.expect_download(timeout=60000) as dl:
                    await pg.click('#relPdfBtn')
                arq = await dl.value; caminho = f'{OUT}/relatorio.pdf'; await arq.save_as(caminho)
                tam = os.path.getsize(caminho); cab = open(caminho, 'rb').read(5)
                log(cab == b'%PDF-' and tam > 20000, f'PDF do relatório baixado ({tam // 1024} KB)', arq.suggested_filename)
            except Exception as e:
                log(False, 'relatório mensal / PDF', str(e)[:300])
            # celular
            m = await b.new_page(viewport={'width': 390, 'height': 844}, storage_state=None) if False else await ctx.new_page()
            await m.set_viewport_size({'width': 390, 'height': 844})
            await m.goto(SITE + '/dashboard', wait_until='domcontentloaded')
            seg, ov = await esperar_painel(m, 'painel_celular')
            log(not ov, f'painel no celular abre em {seg}s', ov)
            await m.click('#layBottom button[data-a="menu"]'); await m.wait_for_timeout(500)
            await m.click('.lay-mod[data-mod="Vendas"] .lay-mod-h'); await m.wait_for_timeout(400)
            log(await m.is_visible('#nav-contatos'), 'celular: módulo abre no menu')
            await m.click('#nav-contatos'); await m.wait_for_timeout(600)
            log(await m.evaluate("document.getElementById('view-contatos').classList.contains('active')"), 'celular: funcionalidade abre')
            await m.screenshot(path=f'{OUT}/celular.png')
            await b.close()
    finally:
        # a regra não deixa apagar a empresa principal; o robô esvazia os dados dela
        sd, _ = rest(f'https://firestore.googleapis.com/v1/projects/max-cfo-saas/databases/(default)/documents/workspaces/{uid}?updateMask.fieldPaths=data&updateMask.fieldPaths=owner', {'fields': {'data': {'stringValue': '{}'}, 'owner': {'stringValue': uid}}}, token, 'PATCH')
        print('dados de teste esvaziados' if sd == 200 else f'não esvaziou os dados de teste ({sd})')
        rest(f'https://firestore.googleapis.com/v1/projects/max-cfo-saas/databases/(default)/documents/perfis/{uid}', None, token, 'DELETE')
        s, _ = rest(f'https://identitytoolkit.googleapis.com/v1/accounts:delete?key={KEY}', {'idToken': token})
        print('conta de teste apagada' if s == 200 else f'não apagou a conta de teste ({s})')
        json.dump(rel, open(f'{OUT}/relatorio.json', 'w'), ensure_ascii=False, indent=1)
        print('FALHAS:', rel['falhas']); print('TEMPOS:', rel['tempos'])
        print('CONSOLE:', json.dumps(rel['console'][:40], ensure_ascii=False, indent=0))

asyncio.run(main())
