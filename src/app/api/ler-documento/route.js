import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminConfigurado, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { limiteExcedido } from '../../../lib/limite';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const MODELO = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
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
    const arquivo = String(body.arquivo || '');
    const tipo = String(body.tipo || '').toLowerCase();
    if (!arquivo) return NextResponse.json({ error: 'Envie um arquivo.' }, { status: 400 });
    if (!TIPOS.includes(tipo)) return NextResponse.json({ error: 'Use foto (JPG, PNG) ou PDF.' }, { status: 400 });
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
Se não conseguir ler um campo, use "" (ou 0 para valor). Não invente.`;

    const model = genAI.getGenerativeModel({ model: MODELO, generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } });
    const result = await model.generateContent([{ inlineData: { data: arquivo, mimeType: tipo } }, { text: prompt }]);
    const texto = result.response.text();
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
