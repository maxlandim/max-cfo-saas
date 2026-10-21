import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminConfigurado, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { limiteExcedido } from '../../../lib/limite';
import { comModelos } from '../../../lib/modelosIA';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
const LIMITE_BYTES = 3.2 * 1024 * 1024;

// Lê boleto, nota fiscal, recibo ou comprovante e devolve os campos de um lançamento.
export async function POST(request) {
  try {
    if (adminConfigurado) {
      const user = await usuarioDaRequisicao(request);
      if (!user) return NextResponse.json({ error: 'Sua sessão expirou. Entre de novo.' }, { status: 401 });
      if (limiteExcedido('doc:' + user.uid, Number(process.env.DOC_LIMIT_PER_HOUR || 30))) return NextResponse.json({ error: 'Limite de leituras desta hora atingido. Tente mais tarde.' }, { status: 429 });
    }
    if (!genAI) return NextResponse.json({ error: 'A leitura com IA ainda não foi ativada neste site (falta a chave da IA no servidor).' }, { status: 503 });

    const body = await request.json();
    const arquivo = String(body.arquivo || '').replace(/^data:[^,]*,/, '');
    if (!arquivo) return NextResponse.json({ error: 'Envie um arquivo.' }, { status: 400 });
    // O tipo é confirmado pelo conteúdo (o navegador às vezes manda PDF sem tipo ou como "octet-stream")
    const inicio = arquivo.slice(0, 16);
    const pelaAssinatura = inicio.startsWith('JVBER') ? 'application/pdf' : inicio.startsWith('/9j/') ? 'image/jpeg' : inicio.startsWith('iVBOR') ? 'image/png' : inicio.startsWith('UklGR') ? 'image/webp' : '';
    let tipo = String(body.tipo || '').toLowerCase().replace('image/jpg', 'image/jpeg').replace('application/x-pdf', 'application/pdf');
    if (pelaAssinatura) tipo = pelaAssinatura;
    if (!TIPOS.includes(tipo)) return NextResponse.json({ error: 'Use foto (JPG, PNG) ou PDF.' }, { status: 400 });
    const textoPdf = String(body.texto || '').slice(0, 20000);
    if (arquivo.length * 0.75 > LIMITE_BYTES) return NextResponse.json({ error: 'O arquivo precisa ter até 3 MB.' }, { status: 413 });

    const cats = body.categorias && typeof body.categorias === 'object' ? body.categorias : {};
    const lista = (k) => (Array.isArray(cats[k]) ? cats[k].slice(0, 40).map((c) => String(c).slice(0, 60)) : []);
    const hoje = new Date().toISOString().slice(0, 10);

    const prompt = `Você lê documentos financeiros brasileiros (boleto, nota fiscal, NFS-e, DANFE, recibo, comprovante de Pix, fatura, conta de consumo).
Hoje é ${hoje}. Extraia os dados e responda SOMENTE com um JSON neste formato:
{
  "tipo": "DESPESA" ou "RECEITA" (DESPESA se o documento é uma conta a pagar ou compra; RECEITA se é uma nota que a empresa emitiu para um cliente),
  "descricao": "texto curto do que é (ex.: Conta de energia set/2026, Nota 1234 - Serviço de manutenção)",
  "contato": "nome do fornecedor ou do cliente (a outra parte)",
  "documento": "CNPJ ou CPF da outra parte, se houver",
  "valor": número em reais com ponto decimal (valor total a pagar),
  "vencimento": "AAAA-MM-DD" ou "",
  "dataEmissao": "AAAA-MM-DD" ou "",
  "numeroDocumento": "número da nota/fatura, se houver",
  "linhaDigitavel": "linha digitável do boleto, só números, se houver",
  "forma": uma de "Pix", "Boleto", "Cartão de crédito", "Transferência", "Débito automático" ou "",
  "jaPago": true se for comprovante de pagamento já feito, senão false,
  "categoria": a melhor opção da lista correspondente ao tipo
}
Categorias de DESPESA: ${lista('DESPESA').join(' | ')}
Categorias de RECEITA: ${lista('RECEITA').join(' | ')}
Se não conseguir ler um campo, use "" (ou 0 para valor). Não invente.${textoPdf ? `

Texto extraído do arquivo (use para conferir números, nomes e a linha digitável):
---
${textoPdf}
---` : ''}`;

    let texto;
    try {
      texto = await comModelos(async (nome) => {
        const model = genAI.getGenerativeModel({ model: nome, generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } });
        const result = await model.generateContent([{ inlineData: { data: arquivo, mimeType: tipo } }, { text: prompt }]);
        return result.response.text();
      });
    } catch (e) {
      console.error('Gemini recusou o arquivo:', tipo, Math.round(arquivo.length * 0.75 / 1024) + ' KB', e && e.message);
      const msg = String((e && e.message) || '');
      const codigo = Number(e && e.status) || Number((msg.match(/\[(\d{3})\b/) || [])[1]) || 0;
      // detalhe curto do erro da IA (sem dados do arquivo) para diagnóstico
      const detalhe = msg.replace(/key=[^&\s]+/gi, 'key=***').slice(0, 300);
      if (codigo === 401 || codigo === 403 || /API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(msg)) return NextResponse.json({ error: 'A chave da IA no servidor não é válida. Confira a GEMINI_API_KEY na Vercel.', detalhe }, { status: 503 });
      if (codigo === 429 || /RESOURCE_EXHAUSTED|\bquota\b|rate limit/i.test(msg)) return NextResponse.json({ error: 'A IA atingiu o limite de uso agora. Tente de novo em 1 minuto.', detalhe }, { status: 429 });
      if (codigo === 503 || codigo === 500) return NextResponse.json({ error: 'A IA do Google está sobrecarregada agora. Tente de novo em alguns segundos.', detalhe }, { status: 503 });
      if (codigo === 404 || /not found for API version|is not found/i.test(msg)) return NextResponse.json({ error: 'O modelo de IA configurado não está disponível para esta chave.', detalhe }, { status: 503 });
      return NextResponse.json({ error: tipo === 'application/pdf' ? 'A IA não conseguiu abrir este PDF (pode estar protegido por senha).' : 'A IA não conseguiu ler esta imagem. Tente uma foto mais nítida.', detalhe }, { status: 422 });
    }
    let dados;
    try { dados = JSON.parse(texto.replace(/^```json\s*|\s*```$/g, '')); } catch { return NextResponse.json({ error: 'Não consegui entender o documento. Tente uma foto mais nítida.' }, { status: 422 }); }

    const data = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
    const limpo = {
      tipo: dados.tipo === 'RECEITA' ? 'RECEITA' : 'DESPESA',
      descricao: String(dados.descricao || '').slice(0, 120),
      contato: String(dados.contato || '').slice(0, 80),
      documento: String(dados.documento || '').slice(0, 20),
      valor: Math.max(0, Math.round((Number(dados.valor) || 0) * 100) / 100),
      vencimento: data(dados.vencimento),
      dataEmissao: data(dados.dataEmissao),
      numeroDocumento: String(dados.numeroDocumento || '').slice(0, 40),
      linhaDigitavel: String(dados.linhaDigitavel || '').replace(/\D/g, '').slice(0, 60),
      forma: String(dados.forma || '').slice(0, 30),
      jaPago: dados.jaPago === true,
      categoria: String(dados.categoria || '').slice(0, 60),
    };
    if (!limpo.valor && !limpo.descricao) return NextResponse.json({ error: 'Não encontrei valor nem descrição nesse arquivo.' }, { status: 422 });
    return NextResponse.json({ dados: limpo });
  } catch (e) {
    console.error('Erro ao ler documento:', e);
    return NextResponse.json({ error: 'Não foi possível ler o documento agora. Tente de novo.' }, { status: 500 });
  }
}
