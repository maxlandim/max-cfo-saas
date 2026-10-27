"""Tradução do site (inglês e espanhol): páginas públicas e demonstração do painel.
Lista os textos que ficaram sem tradução e confere erros de JavaScript e de hidratação do React."""
import asyncio, json, os
from playwright.async_api import async_playwright
SITE = os.environ.get('SITE', 'https://landimadvisory.com.br'); OUT = 'saida'; os.makedirs(OUT, exist_ok=True)
PAGINAS = ['/', '/pricing', '/consultoria', '/login', '/register', '/termos', '/privacidade']
falhas = []
def log(ok, nome, extra=''):
    print(('OK   ' if ok else 'FALHA'), 'idiomas:', nome, str(extra)[:300], flush=True)
    if not ok: falhas.append(nome)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        faltando = {}
        for ling in ['en', 'es']:
            ctx = await b.new_context(viewport={'width': 1366, 'height': 900})
            await ctx.add_init_script("try{localStorage.setItem('la_faltando','1')}catch(e){}")
            pg = await ctx.new_page(); erros = []; cons = []
            pg.on('pageerror', lambda e: erros.append(str(e)))
            pg.on('console', lambda m: cons.append(m.text) if m.type == 'error' else None)
            for i, rota in enumerate(PAGINAS):
                url = SITE + rota + ('?lang=' + ling if i == 0 else '')
                await pg.goto(url, wait_until='networkidle'); await pg.wait_for_timeout(1200)
                lang = await pg.evaluate('document.documentElement.lang')
                vis = await pg.evaluate("getComputedStyle(document.body).visibility")
                txt = await pg.inner_text('body')
                if i == 0: log(lang == ling and vis == 'visible', f'{ling}: língua aplicada na página inicial', [lang, vis])
                await pg.screenshot(path=f'{OUT}/idioma_{ling}_{rota.strip("/") or "inicio"}.png', full_page=True)
                for k in await pg.evaluate("window.laIdioma ? window.laIdioma.faltando() : []"): faltando.setdefault(ling, {}).setdefault(k, rota)
            # demonstração do painel, algumas telas
            await pg.goto(SITE + '/dashboard?demo=1', wait_until='networkidle'); await pg.wait_for_timeout(6000)
            for v in ['inicio', 'receber', 'pagar', 'fluxo', 'dre', 'contatos', 'inventory', 'nfe', 'settings', 'budget', 'os', 'bpo', 'reports']:
                try: await pg.evaluate(f"try{{switchView('{v}')}}catch(e){{}}"); await pg.wait_for_timeout(700)
                except Exception: pass
            await pg.screenshot(path=f'{OUT}/idioma_{ling}_painel.png')
            for k in await pg.evaluate("window.laIdioma ? window.laIdioma.faltando() : []"): faltando.setdefault(ling, {}).setdefault(k, 'painel')
            hidr = [c for c in cons if 'ydrat' in c or 'did not match' in c or 'Minified React error' in c]
            log(not erros, f'{ling}: sem erros de JavaScript', erros[:3])
            log(not hidr, f'{ling}: sem erro de hidratação do React', hidr[:2])
            await ctx.close()
        # português continua normal
        ctx = await b.new_context(viewport={'width': 1366, 'height': 900}); pg = await ctx.new_page()
        await pg.goto(SITE + '/?lang=pt', wait_until='networkidle'); await pg.wait_for_timeout(800)
        l0 = await pg.evaluate('document.documentElement.lang'); log(l0 == 'pt-BR', 'pt: página em português', l0)
        await ctx.close(); await b.close()
        for ling, d in faltando.items():
            print(f'IDIOMAS_FALTANDO_{ling}=' + json.dumps(d, ensure_ascii=False))
        json.dump(faltando, open(f'{OUT}/idiomas_faltando.json', 'w'), ensure_ascii=False, indent=1)
    print('idiomas FALHAS:', falhas or 'nenhuma')
    for f in falhas: print('::warning::idiomas FALHA: ' + f)
asyncio.run(main())
