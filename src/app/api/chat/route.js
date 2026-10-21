import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminConfigurado, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { limiteExcedido } from '../../../lib/limite';
import { comModelos } from '../../../lib/modelosIA';

export const dynamic = 'force-dynamic';

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function descreverContexto(c) {
  const linhas = [];
  if (c.empresa) linhas.push(`- Empresa: ${String(c.empresa).slice(0, 80)}${c.setor ? ` (setor: ${String(c.setor).slice(0, 40)})` : ''}`);
  if (c.saldoCaixa !== undefined) linhas.push(`- Saldo em caixa hoje: ${brl(c.saldoCaixa)}`);
  if (c.mesAtual) linhas.push(`- Mês atual (competência): receitas ${brl(c.mesAtual.receitas)}, despesas ${brl(c.mesAtual.despesas)}, resultado ${brl(c.mesAtual.resultado)}`);
  if (c.mesAnterior) linhas.push(`- Mês anterior: receitas ${brl(c.mesAnterior.receitas)}, despesas ${brl(c.mesAnterior.despesas)}, resultado ${brl(c.mesAnterior.resultado)}`);
  if (c.aReceber !== undefined) linhas.push(`- A receber em aberto: ${brl(c.aReceber)} (próximos 30 dias: ${brl(c.aReceber30)}; em atraso: ${brl(c.vencidosReceber)})`);
  if (c.aPagar !== undefined) linhas.push(`- A pagar em aberto: ${brl(c.aPagar)} (próximos 30 dias: ${brl(c.aPagar30)}; vencido: ${brl(c.vencidosPagar)})`);
  if (c.queimaMensal !== undefined) linhas.push(`- Gasto médio mensal pago (últimos 3 meses): ${brl(c.queimaMensal)}; runway: ${c.runwayMeses == null ? 'sem dado' : Number(c.runwayMeses).toFixed(1) + ' meses'}`);
  linhas.push(`- Caixa projetado: ${c.caixaNegativoEm ? 'fica NEGATIVO em ' + c.caixaNegativoEm : 'positivo nos próximos 90 dias'}`);
  if (Array.isArray(c.maioresDespesasMes) && c.maioresDespesasMes.length) linhas.push(`- Maiores despesas do mês: ${c.maioresDespesasMes.slice(0, 5).join('; ')}`);
  linhas.push(`- Total histórico: receitas ${brl(c.receitas)}, despesas ${brl(c.despesas)}, ${Number(c.txCount) || 0} lançamentos`);
  return linhas.join('\n');
}

export async function POST(request) {
  try {
    if (adminConfigurado) {
      const user = await usuarioDaRequisicao(request);
      if (!user) return NextResponse.json({ reply: 'Sua sessão expirou. Entre de novo para usar o CFO IA.' }, { status: 401 });
      if (limiteExcedido('chat:' + user.uid, Number(process.env.CHAT_LIMIT_PER_HOUR || 40))) return NextResponse.json({ reply: 'Você atingiu o limite de perguntas desta hora. Tente de novo mais tarde.' }, { status: 429 });
    }
    const body = await request.json();
    const message = String(body.message || '').slice(0, 4000);
    const context = body.context && typeof body.context === 'object' ? body.context : {};
    if (!message) return NextResponse.json({ reply: 'Escreva uma pergunta.' }, { status: 400 });

    if (!genAI) {
      console.warn('GEMINI_API_KEY não está definida nas variáveis de ambiente.');
      return NextResponse.json({ reply: 'O CFO IA ainda não foi ativado neste site (falta a chave da IA nas configurações do servidor).' }, { status: 503 });
    }

    const systemPrompt = `Você é o MAX CFO AI, diretor financeiro virtual de pequenas e médias empresas brasileiras.
Seja analítico, direto e educado. Fale português do Brasil, com números em reais.
Use os dados reais do sistema abaixo. Não invente números que não estão aqui; se faltar dado, diga qual lançamento ou cadastro resolveria.
Dê recomendações práticas (o que fazer esta semana). Em temas tributários, lembre que a decisão final é do contador.
Formate com **negrito** nos números principais e listas curtas.

Dados da empresa no MAX CFO (hoje):
${descreverContexto(context)}`;

    const historico = (Array.isArray(body.historico) ? body.historico : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'ai') && m.text)
      .slice(-8, -1)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: String(m.text).slice(0, 2000) }] }));
    // A conversa precisa começar com o usuário
    while (historico.length && historico[0].role !== 'user') historico.shift();

    const result = await comModelos(async (nome) => {
      const model = genAI.getGenerativeModel({ model: nome, systemInstruction: systemPrompt });
      const chat = model.startChat({ history: historico });
      return chat.sendMessage(message);
    });
    const text = result.response.text();
    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error('Erro no CFO IA:', error);
    return NextResponse.json({ reply: 'Não consegui responder agora. Tente de novo em alguns segundos.' }, { status: 500 });
  }
}
