#!/bin/bash
# Testes do emissor de NFS-e (Node 24, como no servidor). APP = pasta do código do app.
cd "$(dirname "$0")"
# certificados de teste gerados na hora (CNPJ fictício, autoassinados)
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 -config cert.cnf 2>/dev/null
openssl pkcs12 -export -inkey key.pem -in cert.pem -out moderno.pfx -passout pass:'Senh@123'
openssl pkcs12 -export -legacy -inkey key.pem -in cert.pem -out legado.pfx -passout pass:'Senh@123' || openssl pkcs12 -export -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-RC2-40 -inkey key.pem -in cert.pem -out legado.pfx -passout pass:'Senh@123'
openssl pkcs12 -export -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES -macalg sha1 -inkey key.pem -in cert.pem -out tdes.pfx -passout pass:'Senh@123'
openssl pkcs12 -export -keypbe NONE -certpbe NONE -inkey key.pem -in cert.pem -out aberto.pfx -passout pass:''
openssl req -x509 -newkey rsa:2048 -nodes -keyout srv.key -out srv.crt -days 30 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost" 2>/dev/null
openssl pkcs12 -in legado.pfx -info -noout -passin pass:'Senh@123' -legacy 2>&1 | grep -i "encrypted data" | head -2
echo "=== NFS-e: certificado A1 (pkcs12)"; node --no-warnings --import ./reg.mjs t_pfx.mjs
echo "=== NFS-e: DPS e cancelamento"; node --no-warnings --import ./reg.mjs t_dps.mjs && python verif.py dps.xml dps2.xml dps3.xml canc.xml
echo "=== NFS-e: emissor (numeração, recusas, sem resposta, cancelamento)"; CHAVE_CRIPTO=x node --no-warnings --import ./reg.mjs t_emissor.mjs
echo "=== NFS-e: cliente da Sefin com TLS mútuo (servidor local)"; NODE_EXTRA_CA_CERTS=srv.crt node --no-warnings --import ./reg.mjs t_sefin.mjs
echo "=== NFS-e: sonda nos servidores reais da Sefin"; node --no-warnings --import ./reg.mjs sonda.mjs
echo "=== NFS-e: cadeia do servidor"; for h in sefin.producaorestrita.nfse.gov.br sefin.nfse.gov.br; do echo | timeout 20 openssl s_client -connect $h:443 -servername $h 2>/dev/null | grep -E "^ *[0-9] s:|^ *i:|Verify return" | head -8; done
true
