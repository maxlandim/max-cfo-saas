import { NextResponse } from 'next/server';

// O CFO responde no navegador, com os números da empresa (public/modules/cfo-local.js), sem IA externa.
// Esta rota fica só para responder a versões antigas da página que ainda estejam abertas.
export async function POST() {
  return NextResponse.json({ reply: 'O CFO agora responde direto no sistema. Atualize a página (F5) e pergunte de novo.' }, { status: 410 });
}
