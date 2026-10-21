import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminConfigurado, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Limite simples por usuário (por instância do servidor) para a chave de IA não ser usada por terceiros.
const usos = new Map();
function limiteExcedido(uid) {
  const agora = Date.now(), janela = 60 * 60 * 1000, max = Number(process.env.CHAT_LIMIT_PER_HOUR || 40);
  const lista = (usos.get(uid) || []).filter((t) => agora - t < janela);
  lista.push(agora); usos.set(uid, lista);
  return lista.length > max;
}

export async function POST(request) {
  try {
    if (adminConfigurado) {
      const user = await usuarioDaRequisicao(request);
      if (!user) return NextResponse.json({ reply: 'Sua sessão expirou. Entre de novo para usar o CFO IA.' }, { status: 401 });
      if (limiteExcedido(user.uid)) return NextResponse.json({ reply: 'Você atingiu o limite de perguntas desta hora. Tente de novo mais tarde.' }, { status: 429 });
    }
    const body = await request.json();
    const message = String(body.message || '').slice(0, 4000);
    const context = body.context || {};
    if (!message) return NextResponse.json({ reply: 'Escreva uma pergunta.' }, { status: 400 });

    if (!genAI) {
      console.warn("GEMINI_API_KEY não está definida nas variáveis de ambiente!");
      // Em modo dev, se não tiver chave, devolvemos a chave pra pessoa configurar
      return NextResponse.json(
        { reply: "Erro: A chave do Google Gemini (GEMINI_API_KEY) não foi configurada na Vercel ou no .env.local." },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `Você é o MAX CFO AI, um Diretor Financeiro (CFO) de classe mundial focado em ajudar PMEs.
Você é extremamente analítico, direto, educado e focado em lucro, fluxo de caixa e redução de custos.
Formate suas respostas em Markdown, usando negrito para números importantes, listas e emojis profissionais (como 💰, 📈, 📉, ⚠️, ✂️).

Contexto atual da empresa do usuário (Dados extraídos do ERP):
- Receitas Totais: R$ ${context.receitas?.toFixed(2) || '0.00'}
- Despesas Totais: R$ ${context.despesas?.toFixed(2) || '0.00'}
- Saldo (Lucro/Prejuízo): R$ ${context.saldo?.toFixed(2) || '0.00'}
- Margem Líquida Estimada: ${context.receitas > 0 ? ((context.saldo / context.receitas) * 100).toFixed(1) : 0}%
- Quantidade de Lançamentos: ${context.txCount || 0}

Instruções:
- Baseie sua resposta SEMPRE nesses dados reais do ERP fornecidos acima.
- Dê conselhos acionáveis baseados nesse cenário específico.
- Nunca diga que você é um modelo de linguagem. Aja 100% como o MAX CFO AI.
- Seja objetivo e vá direto ao ponto.`;

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [{ text: "Entendido. Estou online como MAX CFO AI e tenho acesso aos dados em tempo real da empresa. Como posso ajudar agora?" }],
        },
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ reply: text });

  } catch (error) {
    console.error('Error generating AI response:', error);
    return NextResponse.json(
      { reply: "Desculpe, ocorreu um erro ao consultar o meu cérebro de IA no momento. Tente novamente em alguns segundos." },
      { status: 500 }
    );
  }
}
