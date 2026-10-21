// Planos da Landim Advisory. Os valores estão em centavos (R$ 49,90 = 4990).
export const PLANOS = {
  basic: { nome: 'Landim Advisory - Básico', valor: 4990 },
  intermediate: { nome: 'Landim Advisory - Intermediário', valor: 12990 },
  complete: { nome: 'Landim Advisory - Completo', valor: 26990 },
  unlimited: { nome: 'Landim Advisory - Ilimitado', valor: 29990 },
};

// Nível de cada plano: 1 Básico (financeiro), 2 Intermediário (+ vendas, fiscal, leitura com IA, relatório),
// 3 Completo (+ CFO com IA, impostos, painel BPO, marca no relatório, RH), 4 Ilimitado.
export const NIVEL_PLANO = { basic: 1, intermediate: 2, complete: 3, unlimited: 4 };
export const NOME_PLANO = { 1: 'Básico', 2: 'Intermediário', 3: 'Completo', 4: 'Ilimitado' };
// Teste grátis, administrador e modo de configuração usam tudo
export function nivelDoStatus(st) {
  if (!st || !st.acesso) return 0;
  return st.motivo === 'assinatura' ? (NIVEL_PLANO[st.plano] || 1) : 4;
}

// Dias de teste grátis a partir da criação da conta.
export const DIAS_DE_TESTE = Number(process.env.TRIAL_DAYS || 7);

// Status do Stripe que liberam o acesso.
export const STATUS_ATIVOS = ['active', 'trialing'];
