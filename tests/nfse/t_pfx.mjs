import fs from 'fs';
const { abrirPfx, infoDoCertificado, pemDaChave } = await import(process.env.APP + '/src/lib/nfse/pkcs12.js');
const D='./';
for (const [f,s] of [['moderno','Senh@123'],['legado','Senh@123'],['tdes','Senh@123'],['aberto',''],['moderno','errada'],['legado','errada'],['tdes','x']]) {
  try { const c=abrirPfx(fs.readFileSync(D+f+'.pfx'), s); console.log('OK', f, JSON.stringify(infoDoCertificado(c)), pemDaChave(c).length); }
  catch(e){ console.log('ERRO', f, s, e.constructor.name, e.message); }
}
try { abrirPfx(Buffer.from('lixo qualquer'), 'x'); } catch(e){ console.log('lixo:', e.message); }
