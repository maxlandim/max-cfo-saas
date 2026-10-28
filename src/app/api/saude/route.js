import { NextResponse } from 'next/server';
import { pastaGravavel } from '../../../lib/anexos';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Usado pelo servidor (Coolify/Docker) para saber se o site está no ar.
// "anexos": a pasta dos anexos aceita gravação; "volume": ela está num volume persistente (sobrevive ao Redeploy).
export async function GET() {
  const anexos = await pastaGravavel();
  return NextResponse.json({ ok: true, versao: process.env.NEXT_PUBLIC_BUILD_ID || '', hora: new Date().toISOString(), anexos, volume: anexos ? await noVolume() : false });
}

// Um volume montado aparece em /proc/self/mounts; uma pasta comum da imagem, não.
async function noVolume() {
  try {
    const { readFile } = await import('fs/promises');
    const pasta = (process.env.ANEXOS_DIR || '/data/anexos').replace(/\/+$/, '');
    const m = await readFile('/proc/self/mounts', 'utf8');
    return m.split('\n').some((l) => { const p = l.split(' ')[1] || ''; return p && p !== '/' && (pasta === p || pasta.startsWith(p + '/')); });
  } catch { return false; }
}
