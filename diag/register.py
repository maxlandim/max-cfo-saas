"""Diagnóstico do /register no celular: abre, interage e lista erros de JavaScript."""
import asyncio, json
from playwright.async_api import async_playwright
S = 'https://landimadvisory.com.br'
UA = 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
async def cenario(b, nome, url, acoes, locale='pt-BR'):
    ctx = await b.new_context(viewport={'width': 412, 'height': 915}, user_agent=UA, locale=locale, is_mobile=True, has_touch=True)
    pg = await ctx.new_page(); erros = []; cons = []; beacons = []
    pg.on('pageerror', lambda e: erros.append((str(e) + ' | ' + (e.stack or '')[:600])))
    pg.on('console', lambda m: cons.append(m.text[:300]) if m.type == 'error' else None)
    pg.on('request', lambda r: beacons.append((r.post_data or '')[:700]) if '/api/erro' in r.url else None)
    try:
        await pg.goto(url, wait_until='networkidle'); await pg.wait_for_timeout(2500)
        for a in acoes:
            try: await a(pg); await pg.wait_for_timeout(1500)
            except Exception as e: cons.append('ACAO: ' + str(e)[:200])
    except Exception as e: cons.append('GOTO: ' + str(e)[:200])
    print(f'::warning::{nome}: pageerror={json.dumps(erros, ensure_ascii=False)[:900]}')
    if beacons: print(f'::warning::{nome}: enviado a /api/erro={json.dumps(beacons, ensure_ascii=False)[:900]}')
    print(f'== {nome} console', cons[:8]); await ctx.close()
async def preencher(pg):
    await pg.fill('input[type=text] >> nth=0', 'Teste Diagnostico'); await pg.fill('input[type=email]', 'maxpaeslandim@gmail.com')
    await pg.fill('input[type=text] >> nth=1', '529.982.247-25'); await pg.fill('input[type=password]', 'senha123')
async def enviar(pg): await pg.click('button[type=submit]')
async def google(pg):
    async with pg.context.expect_page(timeout=8000) as p:
        await pg.click('.btn-google')
    w = await p.value; await w.wait_for_timeout(1500); await w.close()
async def trocar_lingua(pg): await pg.select_option('select[aria-label^="Idioma"]', 'en')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        await cenario(b, 'abrir', S + '/register', [])
        await cenario(b, 'cadastro e-mail já usado', S + '/register', [preencher, enviar])
        await cenario(b, 'google popup fechado', S + '/register', [google])
        await cenario(b, 'trocar lingua', S + '/register', [trocar_lingua, preencher, enviar])
        await cenario(b, 'ingles', S + '/register?lang=en', [preencher, enviar], locale='en-US')
        await cenario(b, 'vindo do anuncio', S + '/register?utm_source=instagram&utm_medium=pago&utm_campaign=nfse', [preencher, enviar])
        await cenario(b, 'inicio -> cadastro', S + '/', [lambda pg: pg.click('text=Testar grátis >> nth=0')])
        await b.close()
asyncio.run(main())
