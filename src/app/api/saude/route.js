import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Usado pelo servidor (Coolify/Docker) para saber se o site está no ar.
export function GET() {
  return NextResponse.json({ ok: true, versao: process.env.NEXT_PUBLIC_BUILD_ID || '', hora: new Date().toISOString() });
}
