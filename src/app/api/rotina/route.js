import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Tarefa diária única (Coolify → Scheduled Tasks): roda o backup e depois os lembretes e e-mails.
//   wget -qO- --header "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/rotina
export async function GET(req) {
  const segredo = process.env.CRON_SECRET;
  const h = req.headers.get('authorization') || '';
  const dado = h.startsWith('Bearer ') ? h.slice(7) : new URL(req.url).searchParams.get('chave');
  if (!segredo || dado !== segredo) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
  const chamar = async (rota) => {
    try {
      const r = await fetch(base + rota, { headers: { Authorization: 'Bearer ' + segredo }, cache: 'no-store' });
      return { status: r.status, ...(await r.json().catch(() => ({}))) };
    } catch (e) { return { erro: e.message }; }
  };
  const backup = await chamar('/api/backup');
  const lembretes = await chamar('/api/lembretes');
  return NextResponse.json({ backup, lembretes });
}
