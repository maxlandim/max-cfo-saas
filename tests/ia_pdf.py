"""Manda um boleto em PDF de teste para a leitura com IA do site publicado e mostra a resposta."""
import base64, json, urllib.request
pdf = base64.b64encode(open('boleto_teste.pdf', 'rb').read()).decode()
for tipo in ['application/pdf', '']:
    req = urllib.request.Request('https://max-cfo-saas.vercel.app/api/ler-documento', data=json.dumps({'arquivo': pdf, 'tipo': tipo, 'texto': '', 'categorias': {'DESPESA': ['Aluguel e Condomínio', 'Outros'], 'RECEITA': ['Outros']}}).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=90) as r: print('tipo=%r' % tipo, r.status, r.read().decode()[:600])
    except urllib.error.HTTPError as e: print('tipo=%r' % tipo, e.code, e.read().decode()[:600])
