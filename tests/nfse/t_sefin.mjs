import https from 'https'; import fs from 'fs'; import zlib from 'zlib';
const { abrirPfx, pemDaChave, pemDosCertificados } = await import(process.env.APP + '/src/lib/nfse/pkcs12.js');
const { BASES, cliente, gzipB64, ErroSefin, mensagemDeRede } = await import(process.env.APP + '/src/lib/nfse/sefin.js');
const c = abrirPfx(fs.readFileSync('legado.pfx'), 'Senh@123');
let visto = {};
const srv = https.createServer({ key: fs.readFileSync('srv.key'), cert: fs.readFileSync('srv.crt'), requestCert: true, rejectUnauthorized: true, ca: [fs.readFileSync('cert.pem')] }, (req, res) => {
  let b = ''; req.on('data', (d) => b += d); req.on('end', () => {
    visto = { metodo: req.method, url: req.url, cn: req.socket.getPeerCertificate().subject.CN, corpo: b };
    res.setHeader('Content-Type', 'application/json');
    if (req.url.endsWith('/nfse') && req.method === 'POST') {
      const xml = zlib.gunzipSync(Buffer.from(JSON.parse(b).dpsXmlGZipB64, 'base64')).toString();
      if (xml.includes('RECUSAR')) { res.statusCode = 400; return res.end(JSON.stringify({ tipoAmbiente: 2, erros: [{ Codigo: 'E0312', Descricao: 'Código inexistente', Complemento: 'cTribNac' }] })); }
      res.statusCode = 201; return res.end(JSON.stringify({ tipoAmbiente: 2, idDps: 'DPS1', chaveAcesso: '1'.repeat(50), nfseXmlGZipB64: gzipB64('<NFSe>ok</NFSe>'), alertas: [{ codigo: 'A001', descricao: 'Aviso' }] }));
    }
    if (req.url.includes('/dps/')) { res.statusCode = 404; return res.end(''); }
    if (req.url.endsWith('/eventos')) { res.statusCode = 201; return res.end(JSON.stringify({ eventoXmlGZipB64: gzipB64('<evento/>') })); }
    if (req.url.includes('/html')) { res.statusCode = 403; res.setHeader('Content-Type', 'text/html'); return res.end('<html><title>Forbidden</title></html>'); }
    res.statusCode = 500; res.end('{}');
  });
});
await new Promise((r) => srv.listen(0, r));
BASES[2] = `https://localhost:${srv.address().port}/SefinNacional`;
const falhas = []; const ok = (x, n, d = '') => { console.log(x ? 'OK   ' : 'FALHA', n, x ? '' : JSON.stringify(d)); if (!x) falhas.push(n); };
const s = cliente({ ambiente: '2', chavePem: pemDaChave(c), certPem: pemDosCertificados(c) });
const r = await s.emitir('<DPS>ok</DPS>');
ok(r.chave === '1'.repeat(50) && r.xml === '<NFSe>ok</NFSe>' && r.alertas[0] === 'A001 Aviso' && visto.cn.startsWith('PADARIA'), 'emissão com TLS mútuo (certificado do cliente apresentado)', [r, visto.cn]);
try { await s.emitir('<DPS>RECUSAR</DPS>'); ok(false, 'recusa'); } catch (e) { ok(e instanceof ErroSefin && e.codigos[0] === 'E0312' && /cTribNac/.test(e.message), 'erros da Sefin lidos (maiúsculas variadas)', e.message); }
ok((await s.consultarDps('DPS' + '0'.repeat(42))) === null, 'DPS inexistente = null');
ok((await s.testar()) === 404, 'teste de conexão');
const ev = await s.evento('1'.repeat(50), '<pedRegEvento/>');
ok(ev.xml === '<evento/>' && visto.url.endsWith('/nfse/' + '1'.repeat(50) + '/eventos') && JSON.parse(visto.corpo).pedidoRegistroEventoXmlGZipB64, 'evento de cancelamento', visto);
// sem certificado do cliente: o servidor recusa
const semCert = cliente({ ambiente: '2', chavePem: undefined, certPem: undefined });
try { await semCert.testar(); ok(false, 'sem certificado'); } catch (e) { ok(/conexão segura|falar com/.test(mensagemDeRede(e)), 'sem certificado: mensagem de TLS', [e.code, e.message, mensagemDeRede(e)]); }
srv.close(); console.log('\nFALHAS:', falhas.length ? falhas : 'nenhuma'); process.exit(0);
