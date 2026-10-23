import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminConfigurado, usuarioDaRequisicao } from '../../../lib/firebaseAdmin';
import { limiteExcedido } from '../../../lib/limite';
import { comModelos } from '../../../lib/modelosIA';
import { statusDoUsuario } from '../../../lib/assinatura';
import { nivelDoStatus } from '../../../lib/plans';

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
      const st = await statusDoUsuario(user).catch(() => null);
      if (st && nivelDoStatus(st) < 2) return NextResponse.json({ error: 'A leitura de documentos com IA faz parte do plano Intermediário ou superior.', plano: true }, { status: 403 });
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
    const modoItens = body.modo === 'itens'; // nota de compra: lista os produtos para dar entrada no estoque
    const textoPdf = String(body.texto || '').slice(0, modoItens ? 45000 : 20000);
    if (arquivo.length * 0.75 > LIMITE_BYTES) return NextResponse.json({ error: 'O arquivo precisa ter até 3 MB.' }, { status: 413 });

    const cats = body.categorias && typeof body.categorias === 'object' ? body.categorias : {};
    const lista = (k) => (Array.isArray(cats[k]) ? cats[k].slice(0, 40).map((c) => String(c).slice(0, 60)) : []);
    const hoje = new Date().toISOString().slice(0, 10);

    if (modoItens) return await lerItens(arquivo, tipo, textoPdf);

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

// ── Nota fiscal de compra (DANFE): fornecedor, parcelas e itens para a entrada no estoque ──
function erroIA(e, tipo) {
  const msg = String((e && e.message) || '');
  const codigo = Number(e && e.status) || Number((msg.match(/\[(\d{3})\b/) || [])[1]) || 0;
  const detalhe = msg.replace(/key=[^&\s]+/gi, 'key=***').slice(0, 300);
  if (codigo === 401 || codigo === 403 || /API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(msg)) return NextResponse.json({ error: 'A chave da IA no servidor não é válida.', detalhe }, { status: 503 });
  if (codigo === 429 || /RESOURCE_EXHAUSTED|\bquota\b|rate limit/i.test(msg)) return NextResponse.json({ error: 'A IA atingiu o limite de uso agora. Tente de novo em 1 minuto.', detalhe }, { status: 429 });
  if (codigo === 503 || codigo === 500) return NextResponse.json({ error: 'A IA do Google está sobrecarregada agora. Tente de novo em alguns segundos.', detalhe }, { status: 503 });
  return NextResponse.json({ error: tipo === 'application/pdf' ? 'A IA não conseguiu abrir este PDF.' : 'A IA não conseguiu ler esta imagem. Tente uma foto mais nítida.', detalhe }, { status: 422 });
}

async function lerItens(arquivo, tipo, textoPdf) {
  const prompt = `Você lê notas fiscais de compra brasileiras (DANFE da NF-e ou NFC-e). Extraia os dados e responda SOMENTE com um JSON:
{
  "fornecedor": "razão social do EMITENTE da nota",
  "cnpj": "CNPJ ou CPF do emitente, só números",
  "numero": "número da nota", "serie": "série",
  "chave": "chave de acesso de 44 dígitos, só números",
  "dataEmissao": "AAAA-MM-DD",
  "valorProdutos": número (total dos produtos),
  "frete": número, "seguro": número, "desconto": número, "outras": número, "ipi": número, "icmsST": número,
  "valorTotal": número (valor total da nota),
  "parcelas": [ { "numero": "001", "vencimento": "AAAA-MM-DD", "valor": número } ] (da seção Fatura/Duplicatas; [] se não houver),
  "itens": [ { "codigo": "código do produto", "descricao": "descrição completa", "ncm": "só números", "unidade": "UN, CX, KG…", "quantidade": número, "valorUnitario": número, "valorTotal": número, "desconto": número, "lote": "número do lote, se a nota informar", "validade": "AAAA-MM-DD, se a nota informar a validade do lote" } ]
}
Regras: liste TODOS os itens da tabela "Dados dos produtos/serviços", na ordem, em todas as páginas. Números com ponto decimal (1.234,56 vira 1234.56).
Quantidade e valor unitário exatamente como na nota (podem ter até 4 casas). Lote e validade costumam aparecer na descrição ou nas informações adicionais do produto (ex.: "Lote: 123 Val: 10/12/2026"); se não houver, deixe "". Não invente: campo ilegível fica "" ou 0.${textoPdf ? `

Texto extraído do PDF (use para conferir códigos, quantidades e valores):
---
${textoPdf}
---` : ''}`;
  let texto;
  try {
    texto = await comModelos(async (nome) => {
      const model = genAI.getGenerativeModel({ model: nome, generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 16384 } });
      const result = await model.generateContent([{ inlineData: { data: arquivo, mimeType: tipo } }, { text: prompt }]);
      return result.response.text();
    });
  } catch (e) {
    console.error('Gemini (itens) recusou o arquivo:', tipo, e && e.message);
    return erroIA(e, tipo);
  }
  let d;
  try { d = JSON.parse(texto.replace(/^```json\s*|\s*```$/g, '')); } catch { return NextResponse.json({ error: 'Não consegui entender a nota. Se tiver o XML, use ele: é exato.' }, { status: 422 }); }
  const n = (v) => { const x = typeof v === 'string' && v.includes(',') ? Number(v.replace(/\./g, '').replace(',', '.')) : Number(v); return Number.isFinite(x) && x > 0 ? Math.round(x * 10000) / 10000 : 0; };
  const r2 = (v) => Math.round(n(v) * 100) / 100;
  const data = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
  const txt = (v, m) => String(v == null ? '' : v).trim().slice(0, m);
  const itens = (Array.isArray(d.itens) ? d.itens : []).slice(0, 300).map((i) => {
    const qtd = n(i.quantidade), vu = n(i.valorUnitario), vt = r2(i.valorTotal) || r2(qtd * vu);
    return { codigo: txt(i.codigo, 40), descricao: txt(i.descricao, 120), ncm: txt(i.ncm, 10).replace(/\D/g, ''), unidade: txt(i.unidade, 8).toUpperCase(), quantidade: qtd, valorUnitario: vu || (qtd ? Math.round(vt / qtd * 10000) / 10000 : 0), valorTotal: vt, desconto: r2(i.desconto), lotes: data(i.validade) || txt(i.lote, 40) ? [{ lote: txt(i.lote, 40), qtd, validade: data(i.validade) }] : [] };
  }).filter((i) => i.descricao && i.quantidade > 0);
  if (!itens.length) return NextResponse.json({ error: 'Não encontrei os produtos nessa nota. Confira se é o DANFE (nota de produtos) ou use o XML.' }, { status: 422 });
  return NextResponse.json({
    nota: {
      fornecedor: txt(d.fornecedor, 80), cnpj: txt(d.cnpj, 20).replace(/\D/g, ''), numero: txt(d.numero, 20), serie: txt(d.serie, 5),
      chave: txt(d.chave, 60).replace(/\D/g, '').slice(0, 44), dataEmissao: data(d.dataEmissao),
      valorProdutos: r2(d.valorProdutos), frete: r2(d.frete), seguro: r2(d.seguro), desconto: r2(d.desconto), outras: r2(d.outras), ipi: r2(d.ipi), icmsST: r2(d.icmsST), valorTotal: r2(d.valorTotal),
      parcelas: (Array.isArray(d.parcelas) ? d.parcelas : []).slice(0, 36).map((p) => ({ numero: txt(p.numero, 10), vencimento: data(p.vencimento), valor: r2(p.valor) })).filter((p) => p.valor > 0),
      itens, origem: 'ia',
    },
  });
}
