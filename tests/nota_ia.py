"""Manda o DANFE de teste para a leitura de itens com IA (modo 'itens') e confere os produtos lidos."""
import base64, json, conta_teste, os, urllib.request
TOKEN = conta_teste.criar()
url = (open('nota_url.txt').read().strip() if os.path.exists('nota_url.txt') else '') or 'https://landimadvisory.com.br'
pdf = base64.b64encode(open('danfe_teste.pdf', 'rb').read()).decode()
req = urllib.request.Request(url.rstrip('/') + '/api/ler-documento', data=json.dumps({'modo': 'itens', 'arquivo': pdf, 'tipo': 'application/pdf', 'texto': ''}).encode(), headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN}, method='POST')
try:
    with urllib.request.urlopen(req, timeout=120) as r: st, corpo = r.status, r.read().decode()
except urllib.error.HTTPError as e: st, corpo = e.code, e.read().decode()
print('nota_ia status', st); print(corpo[:3000])
try:
    n = json.loads(corpo).get('nota') or {}
    it = n.get('itens') or []
    ok = len(it) == 3 and abs(it[0]['quantidade'] - 10) < 1e-6 and abs(it[2]['valorUnitario'] - 7.25) < 1e-6 and abs(n.get('valorTotal', 0) - 1409) < 0.01 and len(n.get('parcelas') or []) == 2
    print('::warning::nota_ia: ' + ('OK ' if ok else 'DIVERGENTE ') + json.dumps({'itens': [[i['codigo'], i['quantidade'], i['valorUnitario'], i['valorTotal']] for i in it], 'total': n.get('valorTotal'), 'parcelas': n.get('parcelas'), 'frete': n.get('frete'), 'ipi': n.get('ipi'), 'desc': n.get('desconto'), 'num': n.get('numero'), 'chave': n.get('chave')}, ensure_ascii=False)[:900])
except Exception as e:
    print('::warning::nota_ia: erro ' + str(st) + ' ' + corpo[:300].replace('\n', ' '))

conta_teste.apagar(TOKEN)
