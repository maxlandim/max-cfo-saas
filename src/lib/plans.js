// Planos do MAX CFO AI. Os valores estão em centavos (R$ 49,90 = 4990).
export const PLANOS = {
  basic: { nome: 'MAX CFO AI - Básico', valor: 4990 },
  intermediate: { nome: 'MAX CFO AI - Intermediário', valor: 12990 },
  complete: { nome: 'MAX CFO AI - Completo', valor: 26990 },
  unlimited: { nome: 'MAX CFO AI - Unlimited', valor: 29990 },
};

// Dias de teste grátis a partir da criação da conta.
export const DIAS_DE_TESTE = Number(process.env.TRIAL_DAYS || 7);

// Status do Stripe que liberam o acesso.
export const STATUS_ATIVOS = ['active', 'trialing'];
