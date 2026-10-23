// Planos da Landim Advisory. Os valores estão em centavos (R$ 79,90 = 7990).
// "fundador" é o preço dos primeiros assinantes (FUNDADOR.vagas), por FUNDADOR.meses; depois vale "valor".
export const PLANOS = {
  basic: { nome: 'Landim Advisory - Básico', valor: 7990, fundador: 4990, empresas: 1 },
  intermediate: { nome: 'Landim Advisory - Intermediário', valor: 14990, fundador: 12990, empresas: 3 },
  complete: { nome: 'Landim Advisory - Completo', valor: 34990, fundador: 26990, empresas: 3 },
  unlimited: { nome: 'Landim Advisory - Escritório', valor: 59990, fundador: 29990, empresas: 3 },
};
// Empresa adicional (além das incluídas no plano), em qualquer plano: valor por mês, em centavos
export const EMPRESA_EXTRA = 2990;
export const MAX_EMPRESAS = 200;
// Empresas incluídas no plano e total liberado com as adicionais contratadas
export const empresasIncluidas = (planId) => (PLANOS[planId] || PLANOS.basic).empresas;
export const limiteDeEmpresas = (planId, extras) => Math.min(MAX_EMPRESAS, empresasIncluidas(planId) + Math.max(0, Math.floor(Number(extras) || 0)));
export const FUNDADOR = { vagas: 50, meses: 12 };
// Plano anual: paga 10 mensalidades e leva 12 meses
export const MESES_PAGOS_NO_ANUAL = 10;

// Nível de cada plano: 1 Básico (financeiro), 2 Intermediário (+ vendas, fiscal, leitura com IA, relatório),
// 3 Completo (+ CFO, impostos, painel BPO, marca no relatório, RH), 4 Escritório (+ suporte prioritário).
// Empresas: Básico inclui 1, os demais 3; cada empresa a mais custa EMPRESA_EXTRA por mês, em qualquer plano.
export const NIVEL_PLANO = { basic: 1, intermediate: 2, complete: 3, unlimited: 4 };
export const NOME_PLANO = { 1: 'Básico', 2: 'Intermediário', 3: 'Completo', 4: 'Escritório' };
// Teste grátis, administrador e modo de configuração usam tudo
export function nivelDoStatus(st) {
  if (!st || !st.acesso) return 0;
  // assinou durante o teste grátis (status "trialing"): continua com tudo liberado até o teste acabar
  return st.motivo === 'assinatura' && st.status !== 'trialing' ? (NIVEL_PLANO[st.plano] || 1) : 4;
}

// Dias de teste grátis a partir da criação da conta.
export const DIAS_DE_TESTE = Number(process.env.TRIAL_DAYS || 7);

// Dias que a pessoa continua usando depois do vencimento de uma cobrança não paga
export const CARENCIA_DIAS = 5;
export function somarMeses(ms, meses) {
  const d = new Date(ms);
  const dia = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + meses);
  if (d.getUTCDate() < dia) d.setUTCDate(0); // 31/01 + 1 mês = 28 ou 29/02
  return d.getTime();
}

// Status que liberam o acesso (calculados em statusDoUsuario).
export const STATUS_ATIVOS = ['active', 'trialing'];
