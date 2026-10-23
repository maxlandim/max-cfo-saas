// Empresa fictícia da demonstração (/dashboard?demo=1): três meses de movimento e os próximos vencimentos.
// Tudo é gerado no navegador a partir da data de hoje; nada é gravado.

function semente(n) { let x = n; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; }
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const somaDias = (base, n) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };

export function estadoDemo() {
  const r = semente(42);
  const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
  const tx = [];
  let id = 0;
  const add = (o) => tx.push({ id: 'demo' + (++id), contaId: o.contaId || 'conta-itau', ...o });
  const clientes = ['Mercado Bom Preço', 'Café da Esquina', 'Hotel Planalto', 'Restaurante Sabor Caseiro', 'Lanchonete Ponto Certo', 'Condomínio Vila Verde'];

  // Vendas no balcão (Pix e cartão) e vendas a prazo para clientes, nos últimos 90 dias e próximos 30
  for (let dia = -90; dia <= 30; dia++) {
    const d = somaDias(hoje, dia);
    const fimDeSemana = d.getDay() === 0 || d.getDay() === 6;
    if (dia <= 0) {
      const v = Math.round((fimDeSemana ? 2400 : 1500) + r() * 900);
      add({ type: 'RECEITA', desc: 'Vendas do dia (Pix e cartão)', amount: v, date: iso(d), vencimento: iso(d), status: 'pago', pagoEm: iso(d), category: 'Vendas de Produto', contaId: r() < 0.5 ? 'conta-itau' : 'conta-nubank' });
    }
    if (d.getDay() === 2 || d.getDay() === 4) {
      const c = clientes[Math.floor(r() * clientes.length)];
      const v = Math.round(380 + r() * 1400);
      const venc = somaDias(d, 15);
      const pago = venc < hoje && r() < 0.85;
      add({ type: 'RECEITA', desc: 'Encomenda de pães e salgados', contato: c, amount: v, date: iso(d), vencimento: iso(venc), status: pago ? 'pago' : 'pendente', ...(pago ? { pagoEm: iso(somaDias(venc, Math.floor(r() * 3))) } : {}), category: 'Vendas de Produto' });
    }
  }

  // Despesas fixas e variáveis por mês (3 meses para trás e 2 para frente)
  for (let m = -3; m <= 1; m++) {
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() + m, 1, 12);
    const dia = (n) => new Date(ref.getFullYear(), ref.getMonth(), n, 12);
    const fixo = (n, desc, valor, cat, contato) => {
      const d = dia(n), pago = d < hoje;
      add({ type: 'DESPESA', desc, contato, amount: valor, date: iso(d), vencimento: iso(d), status: pago ? 'pago' : 'pendente', ...(pago ? { pagoEm: iso(d) } : {}), category: cat });
    };
    fixo(5, 'Aluguel da loja', 6500, 'Aluguel e Condomínio', 'Imobiliária Central');
    fixo(5, 'Salários da equipe', 14800, 'Salários e Pró-labore');
    fixo(10, 'Pró-labore dos sócios', 8000, 'Salários e Pró-labore');
    fixo(20, 'DAS do Simples Nacional', Math.round(3900 + r() * 700), 'Impostos e Taxas', 'Receita Federal');
    fixo(15, 'Energia elétrica', Math.round(1650 + r() * 400), 'Energia e Utilidades', 'Neoenergia');
    fixo(12, 'Água e esgoto', Math.round(380 + r() * 90), 'Energia e Utilidades', 'Caesb');
    fixo(8, 'Internet e telefone', 289.9, 'Energia e Utilidades', 'Operadora Fibra');
    fixo(3, 'Sistema de PDV', 199, 'TI e Software', 'PDV Fácil');
    fixo(25, 'Anúncios no Instagram', Math.round(450 + r() * 300), 'Marketing e Publicidade', 'Meta');
    for (let s = 0; s < 4; s++) {
      fixo(3 + s * 7, 'Farinha, fermento e insumos', Math.round(2600 + r() * 1600), 'Fornecedores', s % 2 ? 'Moinho Planalto' : 'Distribuidora Centro-Oeste');
    }
    fixo(18, 'Embalagens', Math.round(700 + r() * 400), 'Fornecedores', 'Embala Tudo');
  }
  // Uma conta atrasada e um cliente atrasado, para os alertas aparecerem
  add({ type: 'DESPESA', desc: 'Manutenção do forno', contato: 'Frio & Forno Assistência', amount: 1250, date: iso(somaDias(hoje, -12)), vencimento: iso(somaDias(hoje, -3)), status: 'pendente', category: 'Equipamentos' });

  const contatos = {};
  clientes.forEach((c) => { contatos[c] = { nome: c, tipo: 'cliente' }; });

  return {
    transactions: tx,
    contas: [
      { id: 'conta-itau', nome: 'Itaú (conta empresa)', tipo: 'Conta corrente', saldoInicial: 18500, dataSaldo: iso(somaDias(hoje, -91)) },
      { id: 'conta-nubank', nome: 'Nubank PJ', tipo: 'Conta corrente', saldoInicial: 6200, dataSaldo: iso(somaDias(hoje, -91)) },
    ],
    contatos,
    regras: {},
    settings: {
      company: 'Padaria Pão Dourado (demonstração)',
      cnpj: '',
      regime: 'simples',
      perfil: 'comercio',
      boasVindas: true,
      pix: { chave: 'financeiro@paodourado.exemplo', nome: 'PADARIA PAO DOURADO', cidade: 'BRASILIA' },
    },
    team: [{ id: 'dono', name: 'Visitante da demonstração', email: '', role: 'Admin', permissions: ['dashboard', 'finance', 'crm', 'inventory', 'nfe', 'os'], lastLogin: new Date().toISOString() }],
    audit: [],
  };
}

export const USUARIO_DEMO = {
  uid: 'demonstracao',
  email: '',
  displayName: 'Visitante',
  emailVerified: false,
  getIdToken: async () => '',
};
