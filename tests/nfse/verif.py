import sys, base64, hashlib
from lxml import etree
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
X='xsd/'
P=etree.XMLParser(no_network=True, load_dtd=False, resolve_entities=False)
sch={'DPS':etree.XMLSchema(etree.parse(X+'DPS_v1.01.xsd',P)),'pedRegEvento':etree.XMLSchema(etree.parse(X+'pedRegEvento_v1.01.xsd',P))}
DS='{http://www.w3.org/2000/09/xmldsig#}'
import copy
ruins=[]
for f in sys.argv[1:]:
    doc=etree.parse(f,P); root=doc.getroot(); nome=etree.QName(root).localname
    s=sch[nome]; ok=s.validate(root)
    print(f, 'XSD', 'OK' if ok else 'FALHA', [e.message for e in s.error_log][:5])
    sig=root.find(DS+'Signature'); ref=sig.find(f'.//{DS}Reference').get('URI')[1:]
    alvo=root.find(f".//*[@Id='{ref}']")
    c=etree.tostring(copy.deepcopy(alvo), method='c14n')
    dig=base64.b64encode(hashlib.sha256(c).digest()).decode()
    print('  digest', 'OK' if dig==sig.find(f'.//{DS}DigestValue').text else 'FALHA')
    si=etree.tostring(copy.deepcopy(sig.find(DS+'SignedInfo')), method='c14n')
    cert=x509.load_der_x509_certificate(base64.b64decode(sig.find(f'.//{DS}X509Certificate').text))
    try:
        cert.public_key().verify(base64.b64decode(sig.find(DS+'SignatureValue').text), si, padding.PKCS1v15(), hashes.SHA256()); print('  assinatura OK')
    except Exception as e: print('  assinatura FALHA', e); ruins.append(f)
    if not ok or dig!=sig.find(f'.//{DS}DigestValue').text: ruins.append(f)

print('XSD/ASSINATURA FALHAS:', ruins or 'nenhuma')
