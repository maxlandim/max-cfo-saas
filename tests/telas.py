"""Fotos das páginas públicas (início, preços, login) no computador e no celular, com checagens simples."""
import asyncio, os
from playwright.async_api import async_playwright
SITE = os.environ.get('SITE', 'https://landimadvisory.com.br'); OUT = 'saida'; os.makedirs(OUT, exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for nome, vp in [('pc', {'width': 1366, 'height': 900}), ('cel', {'width': 390, 'height': 844})]:
            pg = await b.new_page(viewport=vp); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            for rota in ['/', '/pricing', '/consultoria', '/login']:
                await pg.goto(SITE + rota, wait_until='networkidle'); await pg.wait_for_timeout(600)
                w = await pg.evaluate('document.documentElement.scrollWidth')
                txt = await pg.inner_text('body')
                print(('OK   ' if w <= vp['width'] + 2 else 'FALHA'), f'{nome} {rota} sem rolagem lateral ({w}px), {len(txt)} letras')
                await pg.screenshot(path=f'{OUT}/pag_{nome}_{rota.strip("/") or "inicio"}.png', full_page=True)
            print(('OK   ' if not errs else 'FALHA'), nome, 'sem erros nas páginas', errs[:2])
        await b.close()
asyncio.run(main())
