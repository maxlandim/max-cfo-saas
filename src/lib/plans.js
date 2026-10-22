// Planos da Landim Advisory. Os valores estão em centavos (R$ 79,90 = 7990).
// "fundador" é o preço dos primeiros assinantes (FUNDADOR.vagas), por FUNDADOR.meses; depois vale "valor".
export const PLANOS = {
  basic: { nome: 'Landim Advisory - Básico', valor: 7990, fundador: 4990, empresas: 1 },
  intermediate: { nome: 'Landim Advisory - Intermediário', valor: 14990, fundador: 12990, empresas: 3 },
  complete: { nome: 'Landim Advisory - Completo', valor: 34990, fundador: 26990, empresas: 10 },
  unlimited: { nome: 'Landim Advisory - Escritório', valor: 59990, fundador: 29990, empresas: 30 },
};
export const FUNDADOR = { vagas: 50, meses: 12 };
// Plano anual: paga 10 mensalidades e leva 12 meses
export const MESES_PAGOS_NO_ANUAL = 10;

// Nível de cada plano: 1 Básico (financeiro), 2 Intermediário (+ vendas, fiscal, leitura com IA, relatório),
// 3 Completo (+ CFO com IA, impostos, painel BPO, marca no relatório, RH), 4 Escritório (até 30 empresas).
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

// Status do Stripe que liberam o acesso.
export const STATUS_ATIVOS = ['active', 'trialing'];
