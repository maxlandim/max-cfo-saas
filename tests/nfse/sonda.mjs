// Sonda real: o servidor da Sefin Nacional (produção restrita e produção) é confiável para o Node? E aceita o TLS mútuo?
import https from 'https'; import fs from 'fs';
const { abrirPfx, pemDaChave, pemDosCertificados } = await import(process.env.APP + '/src/lib/nfse/pkcs12.js');
const c = abrirPfx(fs.readFileSync('legado.pfx'), 'Senh@123');
for (const host of ['sefin.producaorestrita.nfse.gov.br', 'sefin.nfse.gov.br']) {
  for (const comCert of [false, true]) {
    await new Promise((fim) => {
      let pc = {};
      const req = https.request({ host, path: '/SefinNacional/dps/DPS' + '0'.repeat(42), method: 'GET', timeout: 20000, ...(comCert ? { key: pemDaChave(c), cert: pemDosCertificados(c) } : {}) }, (res) => {
        try { pc = res.socket.getPeerCertificate() || {}; } catch { pc = {}; }
        let b = ''; res.on('data', (d) => b += d); res.on('end', () => { console.log('SONDA', host, comCert ? 'com certificado de teste' : 'sem certificado', 'HTTP', res.statusCode, '| emissor do servidor:', pc.issuer && pc.issuer.CN, '|', b.slice(0, 160).replace(/\s+/g, ' ')); fim(); });
      });
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', (e) => { console.log('SONDA', host, comCert ? 'com certificado de teste' : 'sem certificado', 'ERRO', e.code || '', e.message); fim(); });
      req.end();
    });
  }
}
