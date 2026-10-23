import { NextResponse } from 'next/server';

// A leitura de boletos e notas é feita no navegador pelo leitor do sistema (public/modules/leitor.js), sem IA externa.
// Esta rota fica só para responder a versões antigas da página que ainda estejam abertas.
export async function POST() {
  return NextResponse.json({ error: 'A leitura agora é feita pelo próprio sistema. Atualize a página (F5) e envie o arquivo de novo.' }, { status: 410 });
}
