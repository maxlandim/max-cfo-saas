"""Conta de teste temporária no Firebase (o servidor exige login quando o Firebase Admin está configurado)."""
import json, random, string, urllib.request
KEY = 'AIzaSyAsQS2b0oYMHJ_BExiXH0xgD49j68pwZ6M'  # chave Web pública do Firebase (a mesma do site)
def _post(url, corpo):
    req = urllib.request.Request(url, data=json.dumps(corpo).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=30) as r: return json.loads(r.read())
def criar():
    email = 'robo.ia.' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8)) + '@exemplo.com'
    senha = ''.join(random.choices(string.ascii_letters + string.digits, k=16)) + 'a1'
    return _post(f'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={KEY}', {'email': email, 'password': senha, 'returnSecureToken': True})['idToken']
def apagar(token):
    try: _post(f'https://identitytoolkit.googleapis.com/v1/accounts:delete?key={KEY}', {'idToken': token})
    except Exception: pass
