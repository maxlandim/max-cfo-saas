import { NextResponse } from 'next/server';
import { cronAutorizado } from '../../../lib/seguranca';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Tarefa diária única (Coolify → Scheduled Tasks): roda o backup, os lembretes e e-mails e a manutenção.
// Na Vercel, as três rotas são agendadas separadas em vercel.json (cada uma tem até 5 minutos).
//   wget -qO- --header "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/rotina
export async function GET(req) {
  const segredo = process.env.CRON_SECRET;
  if (!cronAutorizado(req)) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  // Na Vercel chama o próprio endereço; no Coolify, o servidor local
  const base = process.env.VERCEL ? new URL(req.url).origin : `http://127.0.0.1:${process.env.PORT || 3000}`;
  const chamar = async (rota) => {
    try {
      const r = await fetch(base + rota, { headers: { Authorization: 'Bearer ' + segredo }, cache: 'no-store' });
      return { status: r.status, ...(await r.json().catch(() => ({}))) };
    } catch (e) { return { erro: e.message }; }
  };
  const backup = await chamar('/api/backup');
  const lembretes = await chamar('/api/lembretes');
  const manutencao = await chamar('/api/manutencao');
  return NextResponse.json({ backup, lembretes, manutencao });
}
