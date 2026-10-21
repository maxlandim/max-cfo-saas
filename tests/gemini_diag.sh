#!/usr/bin/env bash
# Diagnóstico da chave da IA sem expor a chave: o robô cria um par de chaves (a privada fica só no cache do GitHub Actions),
# publica a pública; a chave da IA chega criptografada em tests/gemini.enc e só é aberta aqui dentro.
set +e
mkdir -p saida ~/.diag
if [ ! -f ~/.diag/priv.pem ]; then openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out ~/.diag/priv.pem 2>/dev/null; fi
openssl pkey -in ~/.diag/priv.pem -pubout -out saida/diag_pub.pem
if [ -f gemini.enc ]; then
  K=$(base64 -d gemini.enc | openssl pkeyutl -decrypt -inkey ~/.diag/priv.pem -pkeyopt rsa_padding_mode:oaep 2>/dev/null)
  if [ -z "$K" ]; then echo "diag: não consegui abrir a chave (par de chaves mudou)"; exit 0; fi
  echo "diag: chave aberta (${#K} caracteres)"
  curl -s -H "x-goog-api-key: $K" "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200" | python3 -c "import sys,json; d=json.load(sys.stdin); print('diag: modelos', [m['name'].split('/')[-1] for m in d.get('models',[]) if 'generateContent' in m.get('supportedGenerationMethods',[]) and 'flash' in m['name']][:20], d.get('error',{}).get('message','')[:200])"
  for M in gemini-2.5-flash gemini-3.6-flash gemini-3.8-flash gemini-3.5-flash-lite gemini-2.5-flash-lite; do
    R=$(curl -s -w ' HTTP%{http_code}' -H "x-goog-api-key: $K" -H 'Content-Type: application/json' "https://generativelanguage.googleapis.com/v1beta/models/$M:generateContent" -d '{"contents":[{"parts":[{"text":"Responda só: ok"}]}]}')
    echo "diag: $M -> $(echo "$R" | tail -c 12) $(echo "$R" | python3 -c "import sys,json,re; t=sys.stdin.read(); t=re.sub(r' HTTP\d+$','',t);
try:
  d=json.loads(t); e=d.get('error'); print((e['status']+': '+e['message'][:220]) if e else 'resposta: '+d['candidates'][0]['content']['parts'][0]['text'][:30])
except Exception as x: print('?', t[:200])")"
  done
fi
