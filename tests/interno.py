"""Cadastro e login abertos de dentro do Instagram/Facebook (navegador embutido): aviso, Google bloqueado com explicação e sem erros."""
import asyncio, os
from playwright.async_api import async_playwright
SITE = os.environ.get('SITE', 'https://landimadvisory.com.br'); OUT = 'saida'; os.makedirs(OUT, exist_ok=True)
IG = 'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 Mobile Safari/537.36 Instagram 352.0.0.38.100 Android (34/14; 450dpi; 1080x2340; samsung; SM-A546E; a54x; s5e8835; pt_BR; 650000000)'
IOS_FB = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0.40.100;FBBV/600000000;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/pt_BR;FBOP/5]'
CHROME = 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
falhas = []
def log(ok, nome, extra=''):
    print(('OK   ' if ok else 'FALHA'), 'interno:', nome, str(extra)[:300], flush=True)
    if not ok: falhas.append(nome)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for rotulo, ua, rota in [('Instagram Android', IG, '/register?utm_source=instagram&utm_medium=pago&utm_campaign=nfse'), ('Facebook iPhone', IOS_FB, '/login'), ('Instagram Android login', IG, '/login'), ('Chrome comum', CHROME, '/register')]:
            ctx = await b.new_context(viewport={'width': 412, 'height': 915}, user_agent=ua, locale='pt-BR', is_mobile=True, has_touch=True)
            pg = await ctx.new_page(); erros = []; popups = []
            pg.on('pageerror', lambda e: erros.append(str(e)))
            ctx.on('page', lambda w: popups.append(w))
            await pg.goto(SITE + rota, wait_until='networkidle'); await pg.wait_for_timeout(1500)
            txt = await pg.inner_text('body')
            log('Você está no navegador' not in txt, f'{rotulo}: sem aviso na tela', txt[:200])
            if rotulo != 'Chrome comum':
                await pg.click('.btn-google'); await pg.wait_for_timeout(2200)
                desvio = await pg.evaluate('window.__ultimoDesvio || ""')
                txt = await pg.inner_text('body')
                if 'Android' in rotulo:
                    log(desvio.startswith('intent://') and 'package=com.android.chrome' in desvio and rota.split('?')[0] in desvio and not popups, f'{rotulo}: Google abre a página direto no Chrome', desvio[:160])
                else:
                    log(desvio.startswith('x-safari-https://') and not popups, f'{rotulo}: Google tenta abrir no Safari', desvio[:160])
                    log('abra esta página no Safari' in txt, f'{rotulo}: se o app não deixar, explica como abrir no Safari', txt[:200])
                await pg.screenshot(path=f'{OUT}/interno_{rotulo.split()[0].lower()}.png')
            log(not erros, f'{rotulo}: sem erros de JavaScript', erros[:3])
            await ctx.close()
        await b.close()
    print('interno FALHAS:', falhas or 'nenhuma')
    for f in falhas: print('::warning::interno FALHA: ' + f)
asyncio.run(main())
