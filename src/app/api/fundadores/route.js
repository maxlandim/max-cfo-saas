import { NextResponse } from 'next/server';
import { vagasFundador } from '../../../lib/fundadores';
import { FUNDADOR } from '../../../lib/plans';

export const dynamic = 'force-dynamic';

// Público: quantas vagas de preço de fundador ainda restam (para mostrar no site)
export async function GET() {
  const vagas = await vagasFundador();
  return NextResponse.json({ vagas, total: FUNDADOR.vagas, meses: FUNDADOR.meses }, { headers: { 'Cache-Control': 'public, max-age=60' } });
}
