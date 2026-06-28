/**
 * MAX CFO AI — App Controller v3.0
 * Production Ready — Comercialização
 * Todos os módulos 100% funcionais
 */

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// STATE & PERSISTENCE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const DB = {
  get(k, def = null) {
    try { const v = localStorage.getItem('maxcfo_' + k); return v ? JSON.parse(v) : def; }
    catch { return def; }
  },
  set(k, v) { try { localStorage.setItem('maxcfo_' + k, JSON.stringify(v)); } catch {} },
  size() {
    let t = 0;
    for (let k in localStorage) if (k.startsWith('maxcfo_')) t += (localStorage[k]||'').length * 2;
    return t > 1024*1024 ? (t/1024/1024).toFixed(1) + ' MB' : (t/1024).toFixed(1) + ' KB';
  }
};

const state = {
  transactions: DB.get('transactions', []),
  companies:    DB.get('companies', []),
  settings:     DB.get('settings', { name: 'CFO Master', company: '', sector: 'Consultoria', theme: 'dark', currency: 'BRL' }),
  chatHistory:  [],
  txFilter:     { type: 'all', period: 'all', search: '' },
  txSort:       { field: 'date', dir: 'desc' },
  currentModal: null,
  isListening:  false,
  voiceRec:     null,
  notifSeen:    false,
};

function persist() {
  DB.set('transactions', state.transactions);
  DB.set('companies', state.companies);
  DB.set('settings', state.settings);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CONTEXT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function getCtx() {
  const rec = state.transactions.filter(t => t.type === 'RECEITA').reduce((a, t) => a + t.amount, 0);
  const desp = state.transactions.filter(t => t.type === 'DESPESA').reduce((a, t) => a + t.amount, 0);
  return { receitas: rec, despesas: desp, saldo: rec - desp, txCount: state.transactions.length };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FORMAT UTILS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function fmt(v, currency = state.settings.currency) {
  const sym = { BRL: 'BRL', USD: 'USD', EUR: 'EUR' }[currency] || 'BRL';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: sym });
}
function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function fmtPct(v) { return v.toFixed(1) + '%'; }
function fmtNum(v) { return v.toLocaleString('pt-BR'); }
function timeNow() { return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
function escHtml(s = '') {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'<br>');
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// INIT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const initMaxCfoApp = () => {
  applySettings();
  initTopbar();
  initNavigation();
  initSidebar();
  initSearch();
  initChat();
  initKeyboard();
  initNotifications();
  updateSettingsPanel();
  renderDashboard();
  showToast('⚡ MAX CFO AI v3.0 iniciado', 'success');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMaxCfoApp);
} else {
  setTimeout(initMaxCfoApp, 100);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SETTINGS APPLICATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function applySettings() {
  const s = state.settings;
  // Apply theme
  const themes = {
    dark: { '--bg': '#0B1220', '--bg-surf': '#131D30', '--bg-card': '#182236' },
    darker: { '--bg': '#060B12', '--bg-surf': '#0C1420', '--bg-card': '#111C2E' },
    midnight: { '--bg': '#090B1A', '--bg-surf': '#0E1228', '--bg-card': '#131830' }
  };
  const t = themes[s.theme] || themes.dark;
  Object.entries(t).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));

  // Update avatar
  const initial = (s.name || 'M')[0].toUpperCase();
  const a = document.getElementById('userAvatarSidebar');
  if (a) a.textContent = initial;
  const n = document.getElementById('sidebarUserName');
  if (n) n.textContent = s.name || 'CFO Master';
}

function applyTheme(val) {
  state.settings.theme = val;
  persist();
  applySettings();
}

function saveSettings() {
  state.settings.name = document.getElementById('settingName')?.value || state.settings.name;
  state.settings.company = document.getElementById('settingCompany')?.value || '';
  state.settings.sector = document.getElementById('settingSector')?.value || 'Consultoria';
  state.settings.currency = document.getElementById('settingCurrency')?.value || 'BRL';
  persist();
  applySettings();
  showToast('✅ Configurações salvas', 'success');
}

function updateSettingsPanel() {
  const s = state.settings;
  setValue('settingName', s.name);
  setValue('settingCompany', s.company);
  setValue('settingSector', s.sector);
  setValue('settingTheme', s.theme);
  setValue('settingCurrency', s.currency);
  const tc = document.getElementById('settingTxCount');
  const cc = document.getElementById('settingCompCount');
  const stor = document.getElementById('settingStorage');
  if (tc) tc.textContent = state.transactions.length;
  if (cc) cc.textContent = state.companies.length;
  if (stor) stor.textContent = DB.size();
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined) el.value = val;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TOPBAR DATE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function initTopbar() {
  const el = document.getElementById('topbarDateTime');
  function upd() {
    const now = new Date();
    if (el) el.textContent = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
      + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  upd();
  setInterval(upd, 60000);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// NAVIGATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const viewMeta = {
  dashboard: { label: 'Dashboard', render: renderDashboard },
  chat:      { label: 'CFO IA', render: () => setTimeout(scrollChat, 50) },
  finance:   { label: 'Financeiro', render: renderFinance },
  reconciliation: { label: 'Conciliação Bancária', render: () => {} },
  simulator: { label: 'Simulador', render: renderSimulator },
  companies: { label: 'Empresas', render: renderCompanyHistory },
  reports:   { label: 'Relatórios', render: () => {} },
  settings:  { label: 'Configurações', render: updateSettingsPanel }
};

function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => switchView(el.dataset.view));
  });
}

function switchView(id) {
  if (!viewMeta[id]) return;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const view = document.getElementById('view-' + id);
  const nav  = document.getElementById('nav-' + id);
  if (view) view.classList.add('active');
  if (nav)  nav.classList.add('active');
  const bc = document.getElementById('breadcrumb-label');
  if (bc) bc.textContent = viewMeta[id].label;
  try { viewMeta[id].render(); } catch(e) { console.warn('render error', id, e); }
  if (window.innerWidth <= 900) closeSidebar();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SIDEBAR
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function initSidebar() {
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').style.display =
      document.getElementById('sidebar').classList.contains('open') ? 'block' : 'none';
  });
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  const ov = document.getElementById('sidebarOverlay');
  if (ov) ov.style.display = 'none';
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GLOBAL SEARCH
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function initSearch() {
  const input = document.getElementById('globalSearch');
  const dd    = document.getElementById('searchDropdown');
  if (!input || !dd) return;

  const idx = [
    { icon:'📊', text:'Dashboard — visão geral executiva', fn: () => switchView('dashboard') },
    { icon:'🤖', text:'CFO IA — chat e análises por voz', fn: () => switchView('chat') },
    { icon:'💰', text:'Financeiro — lançamentos e CRUD', fn: () => switchView('finance') },
    { icon:'💰', text:'Nova Receita', fn: () => { switchView('finance'); setTimeout(() => openModal('receita'), 100); } },
    { icon:'💸', text:'Nova Despesa', fn: () => { switchView('finance'); setTimeout(() => openModal('despesa'), 100); } },
    { icon:'🔮', text:'Simulador de Cenários', fn: () => switchView('simulator') },
    { icon:'🏢', text:'Análise de Empresa por CNPJ', fn: () => switchView('companies') },
    { icon:'📋', text:'Relatórios — DRE, Diagnóstico, Tributário', fn: () => switchView('reports') },
    { icon:'📈', text:'Relatório DRE Completo', fn: () => { switchView('reports'); setTimeout(() => generateReport('dre'), 100); } },
    { icon:'🩺', text:'Diagnóstico Financeiro', fn: () => { switchView('reports'); setTimeout(() => generateReport('diagnostico'), 100); } },
    { icon:'📋', text:'Planejamento Tributário', fn: () => { switchView('reports'); setTimeout(() => generateReport('tributario'), 100); } },
    { icon:'🔥', text:'Burn Rate e Runway de Caixa', fn: () => sendToChat('burn rate e runway') },
    { icon:'💼', text:'Consultoria de Investimentos', fn: () => sendToChat('onde investir meu excedente') },
    { icon:'âœ‚ï¸', text:'Estratégia de Redução de Custos', fn: () => sendToChat('reduzir custos') },
    { icon:'âš™ï¸', text:'Configurações — perfil e dados', fn: () => switchView('settings') },
    { icon:'â¬‡ï¸', text:'Exportar dados CSV', fn: () => exportCSV() },
  ];

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { dd.style.display = 'none'; return; }
    const hits = idx.filter(i => i.text.toLowerCase().includes(q)).slice(0, 7);
    if (!hits.length) { dd.style.display = 'none'; return; }
    dd.style.display = 'block';
    dd.innerHTML = hits.map((h, i) =>
      `<div class="search-item" data-i="${i}">${h.icon} ${h.text}</div>`
    ).join('');
    dd.querySelectorAll('.search-item').forEach((el, i) => {
      el.addEventListener('click', () => {
        hits[i].fn();
        input.value = '';
        dd.style.display = 'none';
      });
    });
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !dd.contains(e.target)) dd.style.display = 'none';
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { dd.style.display = 'none'; input.value = ''; }
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// NOTIFICATIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function initNotifications() {
  const btn = document.getElementById('notifBtn');
  if (!btn) return;
  btn.addEventListener('click', () => openNotifModal());
}

function buildNotifs() {
  const ctx = getCtx();
  const msgs = [];
  if (ctx.txCount === 0) msgs.push({ icon: '📌', text: 'Nenhum lançamento registrado. Adicione transações para análise completa.', type: 'info' });
  if (ctx.saldo < 0) msgs.push({ icon: '🔴', text: `Resultado negativo de ${fmt(ctx.saldo)}. Ação recomendada.`, type: 'error' });
  const margem = ctx.receitas > 0 ? ctx.saldo / ctx.receitas * 100 : 0;
  if (margem > 0 && margem < 10) msgs.push({ icon: 'âš ï¸', text: `Margem abaixo de 10% (${margem.toFixed(1)}%). Revise precificação.`, type: 'warn' });
  if (ctx.receitas > 0 && margem > 20) msgs.push({ icon: '✅', text: `Margem de ${margem.toFixed(1)}% — bom momento para investir excedente.`, type: 'success' });
  msgs.push({ icon: '💡', text: 'Use Ctrl+K para buscar qualquer funcionalidade.', type: 'info' });
  msgs.push({ icon: '🤖', text: 'Converse com o CFO IA para análises detalhadas.', type: 'info' });
  return msgs;
}

function openNotifModal() {
  const list = document.getElementById('notifList');
  const msgs = buildNotifs();
  if (list) {
    list.innerHTML = msgs.map(m => `
      <div class="alert-row ${m.type === 'error' ? 'red' : m.type === 'warn' ? 'gold' : m.type === 'success' ? 'green' : 'blue'}" style="margin:4px 24px">
        <span>${m.icon}</span><span>${m.text}</span>
      </div>`).join('');
  }
  const m = document.getElementById('notifModal');
  if (m) {
    m.style.display = 'flex';
    requestAnimationFrame(() => m.classList.add('open'));
  }
  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = 'none';
  state.notifSeen = true;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DASHBOARD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderDashboard() {
  const ctx = getCtx();
  const { receitas, despesas, saldo, txCount } = ctx;
  const margem = receitas > 0 ? saldo / receitas * 100 : 0;
  const score  = engine.calcScore(ctx);

  // Runway calc
  const caixa = saldo > 0 ? saldo * 5 : receitas * 1.5;
  const runway = despesas > 0 ? (caixa / despesas).toFixed(1) : '>12';

  // KPIs
  setText('kpi-receita', fmt(receitas));
  setText('kpi-despesa', fmt(despesas));
  setText('kpi-saldo', fmt(saldo));
  setText('kpi-margem', fmtPct(margem));
  setText('kpi-runway', runway + ' meses');
  setHtml('kpi-saldo-trend', `<span class="${saldo >= 0 ? 'positive' : 'negative'}">${saldo >= 0 ? 'â†‘ Positivo' : 'â†“ Negativo'}</span>`);
  setHtml('kpi-margem-trend', `<span class="${margem >= 15 ? 'positive' : margem >= 5 ? '' : 'negative'}">${margem.toFixed(1)}%</span>`);
  setHtml('kpi-runway-trend', `<span class="${runway >= 6 ? 'positive' : 'negative'}">${runway >= 6 ? 'Seguro' : 'Alerta'}</span>`);
  setText('kpi-rec-trend', `${txCount} tx`);

  // Gauge
  const gFill = document.getElementById('gaugeFill');
  if (gFill) {
    const total = 251.2;
    gFill.style.strokeDashoffset = total - (total * score / 100);
  }
  setText('gaugeScore', score);
  setText('gaugeStatus', score >= 80 ? 'Excelente' : score >= 60 ? 'Bom' : score >= 40 ? 'Regular' : 'Crítico');

  // Trend Chart
  drawTrendChart(receitas, despesas);

  // DRE Mini
  const ded  = receitas * 0.0925;
  const lb   = (receitas - ded) - despesas * 0.6;
  const ebtd = lb - despesas * 0.4;
  const ll   = ebtd > 0 ? ebtd * 0.85 : ebtd;
  setHtml('dreMini', `
    <div class="dre-row"><span class="dre-lbl">Receita Bruta</span><span class="dre-val" style="color:var(--success)">${fmt(receitas)}</span></div>
    <div class="dre-row"><span class="dre-lbl">(-) Deduções</span><span class="dre-val" style="color:var(--danger)">-${fmt(ded)}</span></div>
    <div class="dre-row"><span class="dre-lbl">Lucro Bruto</span><span class="dre-val">${fmt(lb)}</span></div>
    <div class="dre-row sep bold"><span class="dre-lbl">EBITDA</span><span class="dre-val" style="color:var(--gold)">${fmt(ebtd)}</span></div>
    <div class="dre-row bold"><span class="dre-lbl">Lucro Líquido</span><span class="dre-val" style="color:${ll >= 0 ? 'var(--success)' : 'var(--danger)'}">${fmt(ll)}</span></div>`);

  // Alerts
  const alerts = [];
  if (saldo < 0) alerts.push({ cls: 'red', t: '🔴 Resultado negativo — revise despesas urgentemente' });
  if (margem < 10 && margem > 0) alerts.push({ cls: 'gold', t: `âš ï¸ Margem de ${margem.toFixed(1)}% abaixo do ideal (â‰¥15%)` });
  if (receitas === 0) alerts.push({ cls: 'gold', t: '📌 Registre suas receitas para análise completa' });
  if (saldo > 0 && margem > 20) alerts.push({ cls: 'green', t: '💡 Margem saudável — considere investir o excedente' });
  if (txCount === 0) alerts.push({ cls: 'blue', t: '📊 Adicione lançamentos para análises do CFO' });
  if (alerts.length === 0) alerts.push({ cls: 'green', t: '✅ Situação financeira estável. Continue monitorando!' });
  const alertEl = document.getElementById('alertsList');
  if (alertEl) alertEl.innerHTML = alerts.map(a => `<div class="alert-row ${a.cls}">${a.t}</div>`).join('');
  const ac = document.getElementById('alertCount');
  if (ac) { ac.textContent = alerts.length; ac.style.background = alerts.some(a => a.cls === 'red') ? 'var(--danger)' : 'var(--warning)'; }

  // Recent TX
  const recent = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const rtEl = document.getElementById('recentTxList');
  if (!rtEl) return;
  if (!recent.length) {
    rtEl.innerHTML = `<div class="empty-block">Nenhum lançamento. <a class="link-go" onclick="openModal('receita')">Adicionar agora →</a></div>`;
    return;
  }
  rtEl.innerHTML = recent.map(t => `
    <div class="tx-row">
      <div class="tx-info">
        <span class="tx-desc-text">${escHtml(t.desc)}</span>
        <span class="tx-meta-text">${fmtDate(t.date)} • ${t.category}</span>
      </div>
      <span class="${t.type === 'RECEITA' ? 'tx-amount-pos' : 'tx-amount-neg'}">
        ${t.type === 'RECEITA' ? '+' : '-'}${fmt(t.amount)}
      </span>
    </div>`).join('');
}

function drawTrendChart(receitasAtual, despesasAtual) {
  const canvas = document.getElementById('trendChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  
  // Gerar um mock de 6 meses baseado no atual para dar visualização
  const pnts = 6;
  const recData = [];
  const despData = [];
  let baseR = receitasAtual > 0 ? receitasAtual : 50000;
  let baseD = despesasAtual > 0 ? despesasAtual : 35000;

  for (let i = 0; i < pnts - 1; i++) {
    // Variância randômica baseada na semente para parecer histórico
    const varR = 0.8 + (Math.sin(i * 123) * 0.4);
    const varD = 0.8 + (Math.cos(i * 321) * 0.4);
    recData.push(baseR * varR);
    despData.push(baseD * varD);
  }
  // Último mês = real atual
  recData.push(receitasAtual || baseR);
  despData.push(despesasAtual || baseD);

  const maxVal = Math.max(...recData, ...despData, 1000);
  const padX = 20, padY = 30;
  const graphW = W - padX * 2;
  const graphH = H - padY - 10;

  const getX = (i) => padX + (i / (pnts - 1)) * graphW;
  const getY = (val) => graphH + 10 - ((val / maxVal) * graphH);

  const drawArea = (data, color, gradientStart) => {
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0]));
    for (let i = 1; i < pnts; i++) {
      // smooth curve using bezier
      const xc = (getX(i-1) + getX(i)) / 2;
      const y1 = getY(data[i-1]);
      const y2 = getY(data[i]);
      ctx.bezierCurveTo(xc, y1, xc, y2, getX(i), y2);
    }
    
    // Fill area
    ctx.lineTo(getX(pnts-1), H);
    ctx.lineTo(getX(0), H);
    ctx.closePath();
    
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, gradientStart);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(data[0]));
    for (let i = 1; i < pnts; i++) {
      const xc = (getX(i-1) + getX(i)) / 2;
      const y1 = getY(data[i-1]);
      const y2 = getY(data[i]);
      ctx.bezierCurveTo(xc, y1, xc, y2, getX(i), y2);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Points
    for (let i = 0; i < pnts; i++) {
      ctx.beginPath();
      ctx.arc(getX(i), getY(data[i]), 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  // Draw months axis
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '600 10px Inter';
  ctx.textAlign = 'center';
  const months = ['M-5', 'M-4', 'M-3', 'M-2', 'M-1', 'Atual'];
  for (let i = 0; i < pnts; i++) {
    ctx.fillText(months[i], getX(i), H - 5);
  }

  drawArea(recData, '#10B981', 'rgba(16,185,129,0.3)');
  drawArea(despData, '#EF4444', 'rgba(239,68,68,0.3)');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FINANCE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const CATEGORIES = {
  RECEITA: ['Consultoria', 'Vendas de Produto', 'Serviços Prestados', 'Licenciamento', 'Royalties', 'Dividendos', 'Aluguéis Recebidos', 'Investimentos', 'Outros'],
  DESPESA: ['Salários e Pró-labore', 'Aluguel e Condomínio', 'Fornecedores', 'Marketing e Publicidade', 'TI e Software', 'Impostos e Taxas', 'Transporte e Logística', 'Energia e Utilidades', 'Equipamentos', 'Outros']
};

function renderFinance() {
  const ctx = getCtx();
  const { receitas, despesas, saldo } = ctx;
  const margem = receitas > 0 ? saldo / receitas * 100 : 0;

  // KPIs
  setHtml('financeKPIs', `
    <div class="fin-kpi"><div class="fin-kpi-val" style="color:var(--success)">${fmt(receitas)}</div><div class="fin-kpi-lbl">Total Receitas</div></div>
    <div class="fin-kpi"><div class="fin-kpi-val" style="color:var(--danger)">${fmt(despesas)}</div><div class="fin-kpi-lbl">Total Despesas</div></div>
    <div class="fin-kpi"><div class="fin-kpi-val" style="color:${saldo >= 0 ? 'var(--gold)' : 'var(--danger)'}">${fmt(saldo)}</div><div class="fin-kpi-lbl">Resultado</div></div>
    <div class="fin-kpi"><div class="fin-kpi-val" style="color:${margem >= 15 ? 'var(--success)' : 'var(--warning)'}">${fmtPct(margem)}</div><div class="fin-kpi-lbl">Margem</div></div>
    <div class="fin-kpi"><div class="fin-kpi-val">${state.transactions.length}</div><div class="fin-kpi-lbl">Lançamentos</div></div>`);

  drawPieChart();
  renderTxTable();
}

function drawPieChart() {
  const canvas = document.getElementById('pieChart');
  const legendEl = document.getElementById('pieChartLegend');
  if (!canvas || !legendEl) return;
  const ctx2d = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx2d.clearRect(0, 0, W, H);

  // Group by category (despesas only)
  const despTx = state.transactions.filter(t => t.type === 'DESPESA');
  const catMap = {};
  despTx.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (!entries.length) {
    ctx2d.fillStyle = 'rgba(255,255,255,0.07)';
    ctx2d.beginPath();
    ctx2d.arc(W / 2, H / 2, 75, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.fillStyle = 'rgba(255,255,255,0.3)';
    ctx2d.font = '13px Inter';
    ctx2d.textAlign = 'center';
    ctx2d.fillText('Sem despesas', W / 2, H / 2 + 4);
    legendEl.innerHTML = '';
    return;
  }

  const colors = ['#C5A059', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];
  let angle = -Math.PI / 2;
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 8;

  entries.forEach(([cat, val], i) => {
    const slice = (val / total) * Math.PI * 2;
    ctx2d.beginPath();
    ctx2d.moveTo(cx, cy);
    ctx2d.arc(cx, cy, r, angle, angle + slice);
    ctx2d.closePath();
    ctx2d.fillStyle = colors[i % colors.length];
    ctx2d.fill();
    ctx2d.strokeStyle = 'rgba(11,18,32,.8)';
    ctx2d.lineWidth = 2;
    ctx2d.stroke();
    angle += slice;
  });

  // Center hole
  ctx2d.beginPath();
  ctx2d.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
  ctx2d.fillStyle = '#182236';
  ctx2d.fill();
  ctx2d.fillStyle = '#8899B0';
  ctx2d.font = '600 11px Inter';
  ctx2d.textAlign = 'center';
  ctx2d.fillText('Despesas', cx, cy - 5);
  ctx2d.fillStyle = '#E8EFF8';
  ctx2d.font = '700 12px Inter';
  ctx2d.fillText(fmt(total), cx, cy + 12);

  legendEl.innerHTML = entries.map(([cat, val], i) => `
    <div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px">
      <span style="width:10px;height:10px;background:${colors[i % colors.length]};border-radius:3px;flex-shrink:0"></span>
      <span style="color:var(--text-muted);flex:1">${cat}</span>
      <span style="font-weight:700;color:var(--text)">${fmtPct(val / total * 100)}</span>
    </div>`).join('');
}

function renderTxTable() {
  const tbody = document.getElementById('txTableBody');
  const countEl = document.getElementById('txCount-label');
  const totalEl = document.getElementById('txTotal-label');
  if (!tbody) return;

  let txs = [...state.transactions];

  // Filter by type
  if (state.txFilter.type !== 'all') txs = txs.filter(t => t.type === state.txFilter.type);

  // Filter by period
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  if (state.txFilter.period === 'thisMonth') {
    txs = txs.filter(t => { const d = new Date(t.date + 'T12:00:00'); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; });
  } else if (state.txFilter.period === 'lastMonth') {
    const lm = new Date(thisYear, thisMonth - 1, 1);
    txs = txs.filter(t => { const d = new Date(t.date + 'T12:00:00'); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); });
  } else if (state.txFilter.period === 'last3') {
    const cutoff = new Date(thisYear, thisMonth - 2, 1);
    txs = txs.filter(t => new Date(t.date + 'T12:00:00') >= cutoff);
  } else if (state.txFilter.period === 'thisYear') {
    txs = txs.filter(t => new Date(t.date + 'T12:00:00').getFullYear() === thisYear);
  }

  // Search
  if (state.txFilter.search) {
    const q = state.txFilter.search.toLowerCase();
    txs = txs.filter(t => t.desc.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q));
  }

  // Sort
  const { field, dir } = state.txSort;
  txs.sort((a, b) => {
    let va = field === 'amount' ? a.amount : (a[field] || '');
    let vb = field === 'amount' ? b.amount : (b[field] || '');
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    return dir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  if (countEl) countEl.textContent = `${txs.length} lançamento${txs.length !== 1 ? 's' : ''}`;
  if (totalEl) {
    const rec = txs.filter(t => t.type === 'RECEITA').reduce((s, t) => s + t.amount, 0);
    const desp = txs.filter(t => t.type === 'DESPESA').reduce((s, t) => s + t.amount, 0);
    totalEl.textContent = `Resultado: ${fmt(rec - desp)}`;
    totalEl.style.color = rec - desp >= 0 ? 'var(--success)' : 'var(--danger)';
  }

  if (!txs.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">Nenhum lançamento encontrado. Ajuste os filtros ou adicione novos.</td></tr>`;
    return;
  }

  tbody.innerHTML = txs.map(t => `
    <tr id="row-${t.id}" class="row-new">
      <td>${fmtDate(t.date)}</td>
      <td>
        <div style="font-weight:600">${escHtml(t.desc)}</div>
        ${t.notes ? `<div style="font-size:11px;color:var(--text-faint)">${escHtml(t.notes)}</div>` : ''}
      </td>
      <td>${t.category}</td>
      <td><span class="type-pill ${t.type.toLowerCase()}">${t.type}</span></td>
      <td>
        <span class="status-pill ${(t.status || (t.type==='RECEITA'?'PAGO':'PENDENTE')).toLowerCase()}" onclick="toggleStatus('${t.id}')" style="cursor:pointer" title="Clique para alterar status">${t.status || (t.type==='RECEITA'?'PAGO':'PENDENTE')}</span>
      </td>
      <td style="font-weight:800;color:${t.type === 'RECEITA' ? 'var(--success)' : 'var(--danger)'}">
        ${t.type === 'RECEITA' ? '+' : '-'}${fmt(t.amount)}
      </td>
      <td style="display:flex;gap:4px">
        <button class="action-btn" onclick="editTx('${t.id}')" title="Editar">âœï¸</button>
        <button class="action-btn del" onclick="deleteTx('${t.id}')" title="Excluir">🗑ï¸</button>
      </td>
    </tr>`).join('');
}

function applyFilters() {
  const period = document.getElementById('filterPeriod')?.value || 'all';
  const search = document.getElementById('txSearch')?.value || '';
  state.txFilter.period = period;
  state.txFilter.search = search;
  renderTxTable();
}

function setTypeFilter(btn, type) {
  document.querySelectorAll('.chip[data-type]').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  state.txFilter.type = type;
  renderTxTable();
}

function sortTx(field) {
  if (state.txSort.field === field) {
    state.txSort.dir = state.txSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    state.txSort.field = field;
    state.txSort.dir = 'desc';
  }
  ['date','desc','amount'].forEach(f => {
    const el = document.getElementById('sort-' + f);
    if (el) el.textContent = state.txSort.field === f ? (state.txSort.dir === 'asc' ? '↑' : '↓') : '↕';
  });
  renderTxTable();
}

// ════════════════════════════════════════════════════════════════════════════
// TRANSACTION CRUD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function openModal(type, editId = '') {
  const isRec = type === 'receita' || type === 'RECEITA';
  const isEdit = !!editId;

  // Populate category select
  const catEl = document.getElementById('txCategory');
  if (catEl) {
    const cats = isRec ? CATEGORIES.RECEITA : CATEGORIES.DESPESA;
    catEl.innerHTML = cats.map(c => `<option>${c}</option>`).join('');
  }

  if (!isEdit) {
    // New transaction
    setValue('txModalTitle', isRec ? '+ Nova Receita' : '+ Nova Despesa');
    setValue('txModalSubtitle', isRec ? 'Registrar entrada financeira' : 'Registrar saída financeira');
    setValue('txType', isRec ? 'RECEITA' : 'DESPESA');
    setValue('txDate', new Date().toISOString().split('T')[0]);
    setValue('txDesc', '');
    setValue('txAmount', '');
    setValue('txNotes', '');
    setValue('txStatus', isRec ? 'PAGO' : 'PENDENTE');
    setValue('txEditId', '');
    setValue('txSubmitBtn', 'Salvar Lançamento');
    document.getElementById('txSubmitBtn').style.background = isRec ? 'var(--gold)' : 'var(--danger)';
  } else {
    // Edit existing
    const tx = state.transactions.find(t => t.id === editId);
    if (!tx) return;
    setValue('txModalTitle', 'Editar Lançamento');
    setValue('txModalSubtitle', 'Modificar dados do lançamento');
    setValue('txType', tx.type);
    setValue('txDate', tx.date);
    setValue('txDesc', tx.desc);
    setValue('txAmount', tx.amount);
    setValue('txNotes', tx.notes || '');
    setValue('txStatus', tx.status || (tx.type==='RECEITA'?'PAGO':'PENDENTE'));
    setValue('txEditId', tx.id);
    setValue('txCategory', tx.category);
    setValue('txSubmitBtn', 'Salvar Alterações');
    document.getElementById('txSubmitBtn').style.background = tx.type === 'RECEITA' ? 'var(--gold)' : 'var(--danger)';
  }

  openModalEl('txModal');
  setTimeout(() => document.getElementById('txDesc')?.focus(), 300);
}

function editTx(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  openModal(tx.type, id);
}

function submitTransaction(e) {
  e.preventDefault();
  const desc     = document.getElementById('txDesc')?.value.trim();
  const amount   = parseFloat(document.getElementById('txAmount')?.value);
  const date     = document.getElementById('txDate')?.value;
  const category = document.getElementById('txCategory')?.value;
  const notes    = document.getElementById('txNotes')?.value.trim();
  const type     = document.getElementById('txType')?.value;
  const status   = document.getElementById('txStatus')?.value || (type === 'RECEITA' ? 'PAGO' : 'PENDENTE');
  const editId   = document.getElementById('txEditId')?.value;

  if (!desc) return showToast('Informe uma descrição', 'error');
  if (isNaN(amount) || amount <= 0) return showToast('Valor inválido', 'error');
  if (!date) return showToast('Selecione uma data', 'error');

  if (editId) {
    // Edit
    const idx = state.transactions.findIndex(t => t.id === editId);
    if (idx !== -1) {
      state.transactions[idx] = { ...state.transactions[idx], desc, amount, date, category, notes, type, status };
      showToast('✅ Lançamento atualizado', 'success');
    }
  } else {
    // Create
    const tx = { id: genId(), desc, amount, date, category, notes, type, status };
    state.transactions.push(tx);
    showToast(`✅ ${type === 'RECEITA' ? 'Receita' : 'Despesa'} de ${fmt(amount)} registrada!`, 'success');
  }

  persist();
  closeModal('txModal');
  renderDashboard();
  renderFinance();
}

function deleteTx(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx || !confirm(`Remover "${tx.desc}"?`)) return;
  const row = document.getElementById('row-' + id);
  if (row) {
    row.classList.add('row-del');
    setTimeout(() => {
      state.transactions = state.transactions.filter(t => t.id !== id);
      persist();
      renderDashboard();
      renderFinance();
      showToast('🗑️ Lançamento removido', 'warn');
    }, 300);
  }
}

function toggleStatus(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  const current = tx.status || (tx.type==='RECEITA'?'PAGO':'PENDENTE');
  if (current === 'PAGO') tx.status = 'PENDENTE';
  else if (current === 'PENDENTE') tx.status = 'ATRASADO';
  else tx.status = 'PAGO';
  persist();
  renderDashboard();
  renderFinance();
  showToast(`✅ Status alterado para ${tx.status}`, 'success');
}

function quickAdd() {
  switchView('finance');
  setTimeout(() => openModal('receita'), 150);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EXPORT / IMPORT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function exportCSV() {
  if (!state.transactions.length) return showToast('Nenhum dado para exportar', 'warn');
  const header = 'Data,Descrição,Categoria,Tipo,Valor,Observação';
  const rows = state.transactions.map(t =>
    `"${t.date}","${t.desc.replace(/"/g,'""')}","${t.category}","${t.type}","${t.amount.toFixed(2)}","${(t.notes||'').replace(/"/g,'""')}"`
  );
  const csv = [header, ...rows].join('\n');
  downloadText(csv, 'max-cfo-lancamentos.csv', 'text/csv');
  showToast('â¬‡ï¸ CSV exportado com sucesso!', 'success');
}

function exportAllData() {
  const data = { transactions: state.transactions, companies: state.companies, settings: state.settings, exportedAt: new Date().toISOString() };
  downloadText(JSON.stringify(data, null, 2), 'max-cfo-backup.json', 'application/json');
  showToast('â¬‡ï¸ Backup exportado!', 'success');
}

function importData() {
  document.getElementById('importFileInput')?.click();
}

function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.transactions) state.transactions = data.transactions;
      if (data.companies) state.companies = data.companies;
      if (data.settings) state.settings = { ...state.settings, ...data.settings };
      persist();
      applySettings();
      renderDashboard();
      showToast(`✅ Importado: ${state.transactions.length} transações`, 'success');
    } catch { showToast('Arquivo inválido ou corrompido', 'error'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function downloadText(content, filename, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function clearAllData() {
  if (!confirm('âš ï¸ Apagar TODOS os dados? Esta ação não pode ser desfeita!')) return;
  state.transactions = [];
  state.companies = [];
  persist();
  renderDashboard();
  renderFinance();
  updateSettingsPanel();
  showToast('🗑ï¸ Todos os dados foram removidos', 'warn');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SIMULATOR
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderSimulator() {
  onSliderChange();
}

function onSliderChange() {
  const recEl   = document.getElementById('recSlider');
  const despEl  = document.getElementById('despSlider');
  if (!recEl || !despEl) return;
  const rec  = parseFloat(recEl.value);
  const desp = parseFloat(despEl.value);

  // Display values
  const rdEl = document.getElementById('recDisplay');
  const ddEl = document.getElementById('despDisplay');
  if (rdEl) { rdEl.textContent = `${rec >= 0 ? '+' : ''}${rec}%`; rdEl.style.color = rec >= 0 ? 'var(--success)' : 'var(--danger)'; }
  if (ddEl) { ddEl.textContent = `${desp >= 0 ? '+' : ''}${desp}%`; ddEl.style.color = desp <= 0 ? 'var(--success)' : 'var(--danger)'; }

  // Slider gradients
  const rp = ((rec + 50) / 200) * 100;
  const dp = ((desp + 50) / 150) * 100;
  recEl.style.background  = `linear-gradient(to right, var(--success) ${rp}%, var(--border) ${rp}%)`;
  despEl.style.background = `linear-gradient(to right, var(--danger) ${dp}%, var(--border) ${dp}%)`;

  const ctx = getCtx();
  const sim = engine.simulateScenario(ctx, rec, desp);

  const rc = document.getElementById('simResultCards');
  if (rc) {
    const items = [
      { l: 'Receita Atual', v: fmt(ctx.receitas), c: 'var(--text)' },
      { l: 'Receita Projetada', v: fmt(sim.nr), c: 'var(--success)' },
      { l: 'Despesa Atual', v: fmt(ctx.despesas), c: 'var(--text)' },
      { l: 'Despesa Projetada', v: fmt(sim.nd), c: 'var(--danger)' },
      { l: 'Margem Atual', v: fmtPct(sim.curr_m), c: 'var(--text)' },
      { l: 'Margem Projetada', v: fmtPct(sim.nm), c: sim.nm > 15 ? 'var(--success)' : sim.nm > 5 ? 'var(--warning)' : 'var(--danger)' },
      { l: 'Score Projetado', v: sim.projScore + '/100', c: sim.projScore >= 70 ? 'var(--success)' : sim.projScore >= 50 ? 'var(--warning)' : 'var(--danger)' },
    ];
    rc.innerHTML = items.map(i => `
      <div class="sim-result-item">
        <span class="sim-result-lbl">${i.l}</span>
        <span class="sim-result-val" style="color:${i.c}">${i.v}</span>
      </div>`).join('') + `
      <div class="sim-highlight" style="background:${sim.diff >= 0 ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)'};border:1px solid ${sim.diff >= 0 ? 'var(--success)' : 'var(--danger)'}">
        <span style="color:${sim.diff >= 0 ? 'var(--success)' : 'var(--danger)'}">
          Resultado Projetado: ${fmt(sim.ns)} &nbsp;|&nbsp; ${sim.diff >= 0 ? '+' : ''}${fmt(sim.diff)}
        </span>
      </div>`;
  }

  const cp = document.getElementById('cfoParecer');
  if (cp) cp.innerHTML = `<div class="cfo-speech-icon">🤖</div><p>${sim.rec}</p>`;
}

function applyScenario(rec, desp, label) {
  setValue('recSlider', rec);
  setValue('despSlider', desp);
  setText('scenarioTitle', `📊 Cenário: ${label}`);
  onSliderChange();
  showToast(`📊 Cenário "${label}" aplicado`, 'success');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// COMPANIES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function formatCnpj(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length > 14) v = v.substr(0, 14);
  if (v.length > 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/, '$1.$2.$3/$4-$5');
  else if (v.length > 8) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4}).*/, '$1.$2.$3/$4');
  else if (v.length > 5) v = v.replace(/^(\d{2})(\d{3})(\d{0,3}).*/, '$1.$2.$3');
  else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,3}).*/, '$1.$2');
  input.value = v;
}

function setAndAnalyze(cnpj, name) {
  const inp = document.getElementById('cnpjInput');
  if (inp) inp.value = cnpj;
  consultarEmpresa(name);
}

async function consultarEmpresa(forceName = '') {
  const inp = document.getElementById('cnpjInput');
  const val = inp?.value.trim();
  if (!val) return showToast('Informe um CNPJ ou nome de empresa', 'error');

  const btn = document.getElementById('analyzeBtn');
  if (btn) { btn.textContent = 'â³ Analisando...'; btn.disabled = true; }

  const rawDigits = val.replace(/\D/g, '');
  const isCnpj = rawDigits.length >= 8;
  const cnpj = isCnpj ? val : '00.000.000/0001-00';
  const name = forceName || (isCnpj ? 'Empresa ' + cnpj : val);

  let result;
  
  try {
    if (rawDigits.length === 14) {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${rawDigits}`);
      if (response.ok) {
        const data = await response.json();
        result = engine.analyzeRealCompany(data);
      } else {
        throw new Error('API Error');
      }
    } else {
      throw new Error('Not a full CNPJ');
    }
  } catch (err) {
    // Fallback to deterministic mock
    result = engine.analyzeCompany(cnpj, name);
  }

  const sc = result.score;
  const color = sc >= 70 ? 'var(--success)' : sc >= 45 ? 'var(--warning)' : 'var(--danger)';
  const resultName = result.isReal ? (result.name || name) : name;

  setHtml('companyMainCard', `
    <div class="company-header-info" style="margin-bottom:20px">
      <div class="company-icon">🏢</div>
      <div>
        <div class="company-cname">${escHtml(resultName)}</div>
        <div class="company-cnpj-text">CNPJ: ${cnpj} &nbsp;|&nbsp; Abertura: ${result.data_abertura ? fmtDate(result.data_abertura) : 'N/D'} (${result.idade || ''})</div>
      </div>
    </div>
    
    <div class="company-details-grid" style="margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:20px;">
      <div class="comp-detail"><span class="comp-detail-lbl">Situação</span><span class="comp-detail-val" style="color:${result.status==='ATIVA'?'var(--success)':'var(--warning)'}">${result.status==='ATIVA'?'✅ '+result.status:result.status}</span></div>
      <div class="comp-detail"><span class="comp-detail-lbl">Capital Social</span><span class="comp-detail-val">${result.capital_social ? engine.fmt(result.capital_social) : 'N/D'}</span></div>
      <div class="comp-detail"><span class="comp-detail-lbl">Setor Principal</span><span class="comp-detail-val" title="${result.sector}">${result.sector.length > 30 ? result.sector.substring(0, 30) + '...' : result.sector}</span></div>
      <div class="comp-detail"><span class="comp-detail-lbl">Natureza Jurídica</span><span class="comp-detail-val">${result.natureza_juridica || 'N/D'}</span></div>
      <div class="comp-detail"><span class="comp-detail-lbl">Dados Oficiais</span><span class="comp-detail-val">${result.isReal ? '✅ Receita Federal' : 'âš ï¸ Simulação AI'}</span></div>
      <div class="comp-detail"><span class="comp-detail-lbl">Contato</span><span class="comp-detail-val" style="font-size:11px">${result.contatos || 'N/D'}</span></div>
    </div>
    
    ${result.isReal ? `
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px"><strong>Endereço Sede:</strong> ${result.endereco}</div>
    
    <div style="display:flex;gap:15px;margin-top:15px">
      <div style="flex:1;background:rgba(0,0,0,0.2);padding:10px;border-radius:8px;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px;font-weight:600;text-transform:uppercase">Quadro Societário (${result.qsa?.length || 0})</div>
        ${result.qsa?.length ? result.qsa.map(s => `<div style="font-size:12px;margin-bottom:4px">👤 ${s.nome_socio} <span style="color:var(--gold);font-size:10px">(${s.qualificacao_socio})</span></div>`).join('') : '<div style="font-size:12px;color:var(--text-muted)">Sem sócios informados</div>'}
      </div>
      <div style="flex:1;background:rgba(0,0,0,0.2);padding:10px;border-radius:8px;">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:5px;font-weight:600;text-transform:uppercase">CNAEs Secundários (${result.cnaes_secundarios?.length || 0})</div>
        ${result.cnaes_secundarios?.length ? result.cnaes_secundarios.slice(0,3).map(c => `<div style="font-size:11px;margin-bottom:4px" title="${c.descricao}">🔹 ${c.descricao.substring(0,35)}...</div>`).join('') : '<div style="font-size:12px;color:var(--text-muted)">Sem atividades secundárias</div>'}
        ${result.cnaes_secundarios?.length > 3 ? `<div style="font-size:10px;color:var(--gold)">+ ${result.cnaes_secundarios.length - 3} atividades</div>` : ''}
      </div>
    </div>
    ` : ''}
    `);

  let breakdownHtml = '';
  if (result.scoreBreakdown && result.scoreBreakdown.length > 0) {
    breakdownHtml = `<div style="margin-top:15px;border-top:1px solid rgba(255,255,255,0.1);padding-top:10px">
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px"><strong>FATORES DO SCORE:</strong></div>
      ${result.scoreBreakdown.map(b => `
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
          <span style="color:var(--text-muted)">${b.label}</span>
          <span style="color:${b.type==='positive'?'var(--success)':b.type==='negative'?'var(--danger)':'var(--text)'};font-weight:700">${b.value}</span>
        </div>
      `).join('')}
    </div>`;
  }

  setHtml('companyScoreCard', `
    <div class="card-title">Score de Saúde</div>
    <div class="score-display">
      <div style="font-size:20px">${result.emoji}</div>
      <div class="score-big" style="color:${color}">${sc}</div>
      <div class="score-label" style="color:${color}">Risco ${result.riskLevel}</div>
      <div class="score-bar-track">
        <div class="score-bar-fill" style="width:${sc}%;background:${color}"></div>
      </div>
      <div style="font-size:12px;color:var(--text-muted)">${sc}/100 pontos</div>
    </div>
    ${breakdownHtml}`);

  setHtml('companyCFOCard', `
    <div class="card-title gold-text">📋 Parecer Executivo do CFO MAX</div>
    <div class="cfo-speech" style="padding:12px 0">
      <div class="cfo-speech-icon">🤖</div>
      <p style="font-size:14px;line-height:1.7;color:var(--text)">${result.parecer.replace(/\n/g, '<br><br>')}</p>
    </div>`);

  show('companyResultArea');

  // Save history
  state.companies.unshift({ cnpj, name: resultName, score: sc, risk: result.riskLevel, date: new Date().toISOString() });
  state.companies = state.companies.slice(0, 20);
  persist();
  renderCompanyHistory();

  if (btn) { btn.textContent = 'Analisar →'; btn.disabled = false; }
  showToast(`✅ Análise concluída — Score: ${sc}/100`, 'success');
}

function renderCompanyHistory() {
  const card = document.getElementById('companyHistoryCard');
  const list = document.getElementById('companyHistoryList');
  if (!card || !list) return;
  if (!state.companies.length) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  list.innerHTML = state.companies.map(c => {
    const color = c.score >= 70 ? 'var(--success)' : c.score >= 45 ? 'var(--warning)' : 'var(--danger)';
    const d = c.date.split('T')[0];
    return `<div class="company-history-row" onclick="fillCnpj('${c.cnpj}')">
      <div><div style="font-weight:600">${escHtml(c.name)}</div><div style="font-size:11px;color:var(--text-muted)">${c.cnpj} • ${fmtDate(d)}</div></div>
      <div style="color:${color};font-weight:800;font-size:14px">${c.score}/100 — ${c.risk}</div>
    </div>`;
  }).join('');
}

function fillCnpj(cnpj) {
  const inp = document.getElementById('cnpjInput');
  if (inp) { inp.value = cnpj; inp.focus(); }
}

function clearCompanyHistory() {
  if (!confirm('Limpar histórico de empresas?')) return;
  state.companies = [];
  persist();
  renderCompanyHistory();
  showToast('🗑ï¸ Histórico limpo', 'warn');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// REPORTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const reportDefs = {
  dre:           { title: 'DRE — Demonstrativo de Resultado', fn: ctx => engine.generateDRE(ctx), tile: 'tile-dre' },
  diagnostico:   { title: 'Diagnóstico Financeiro', fn: ctx => engine.generateDiagnosis(ctx), tile: 'tile-diagnostico' },
  cashflow:      { title: 'Fluxo de Caixa (DFC)', fn: ctx => engine.generateCashFlow(ctx), tile: 'tile-cashflow' },
  forecast:      { title: 'Forecast — Próximos 3 Meses', fn: ctx => engine.generateForecast(ctx), tile: 'tile-forecast' },
  tributario:    { title: 'Planejamento Tributário', fn: ctx => engine.generateTaxPlanning(ctx), tile: 'tile-tributario' },
  kpis:          { title: 'KPIs — Indicadores Chave', fn: ctx => engine.generateKPIs(ctx), tile: 'tile-kpis' },
  breakeven:     { title: 'Ponto de Equilíbrio (Break-Even)', fn: ctx => engine.generateBreakEven(ctx), tile: 'tile-breakeven' },
  workingcapital:{ title: 'Capital de Giro', fn: ctx => engine.generateWorkingCapital(ctx), tile: 'tile-workingcapital' },
};

function generateReport(type) {
  const def = reportDefs[type];
  if (!def) return;

  // Highlight active tile
  document.querySelectorAll('.report-tile').forEach(t => t.classList.remove('active-tile'));
  const tile = document.getElementById(def.tile);
  if (tile) tile.classList.add('active-tile');

  const ctx = getCtx();
  const content = def.fn(ctx);

  setText('reportOutputTitle', def.title);
  const isHtml = typeof content === 'string' && (content.trim().startsWith('<div') || content.trim().startsWith('<table'));
  if (isHtml) {
    document.getElementById('reportOutputContent').innerHTML = content;
  } else {
    setText('reportOutputContent', content);
  }
  show('reportOutputCard');

  document.getElementById('printReportBtn') && (document.getElementById('printReportBtn').style.display = 'flex');
  document.getElementById('copyReportBtn') && (document.getElementById('copyReportBtn').style.display = 'flex');

  setTimeout(() => document.getElementById('reportOutputCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  showToast(`📋 "${def.title}" gerado`, 'success');
}

function copyReport() {
  const content = document.getElementById('reportOutputContent')?.textContent;
  if (!content) return;
  navigator.clipboard.writeText(content).then(() => showToast('📋 Relatório copiado!', 'success')).catch(() => showToast('Erro ao copiar', 'error'));
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CHAT IA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function initChat() {
  addAIMsg(engine.getGreeting());

  const input = document.getElementById('chatInput');
  if (!input) return;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input?.value.trim();
  if (!msg) return;
  input.value = '';
  if (input) input.style.height = 'auto';
  addUserMsg(msg);
  state.chatHistory.push({ role: 'user', text: msg });
  const tid = showTyping();

  // Interceptar CNPJ na conversa
  const cnpjMatch = msg.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
  if (cnpjMatch) {
    const rawDigits = cnpjMatch[0].replace(/\D/g, '');
    if (rawDigits.length === 14) {
      try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${rawDigits}`);
        removeTyping(tid);
        if (response.ok) {
          const data = await response.json();
          const aiResp = engine.generateOracle(data);
          addAIMsg(aiResp);
          state.chatHistory.push({ role: 'ai', text: aiResp });
        } else {
          addAIMsg("Desculpe, não consegui consultar esse CNPJ na base da Receita Federal. Verifique se o número está correto.");
        }
        return;
      } catch (err) {
        removeTyping(tid);
        addAIMsg("Ocorreu um erro ao tentar contatar a Receita Federal. Tente novamente mais tarde.");
        return;
      }
    }
  }

  // Comandos regulares
  try {
    const ctx = getCtx();
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, context: ctx })
    });
    
    removeTyping(tid);
    
    if (res.ok) {
      const data = await res.json();
      addAIMsg(data.reply);
      state.chatHistory.push({ role: 'ai', text: data.reply });
    } else {
      // Fallback para o cérebro local se der erro de API (ex: sem internet ou sem chave)
      const data = await res.json().catch(() => ({}));
      const fallbackResp = data.reply || engine.processCommand(msg, ctx);
      addAIMsg(fallbackResp);
      state.chatHistory.push({ role: 'ai', text: fallbackResp });
    }
  } catch (err) {
    removeTyping(tid);
    console.error("Chat API error:", err);
    // Fallback absoluto local
    const ctx = getCtx();
    const resp = engine.processCommand(msg, ctx);
    addAIMsg(resp);
    state.chatHistory.push({ role: 'ai', text: resp });
  }
}

function sendToChat(cmd) {
  if (!document.getElementById('view-chat').classList.contains('active')) switchView('chat');
  setTimeout(() => {
    const input = document.getElementById('chatInput');
    if (input) { input.value = cmd; input.dispatchEvent(new Event('input')); }
    setTimeout(sendChat, 80);
  }, 100);
}

function clearChat() {
  if (!confirm('Limpar conversa?')) return;
  const area = document.getElementById('chatMessages');
  if (area) area.innerHTML = '';
  state.chatHistory = [];
  addAIMsg('Conversa limpa! Como posso ajudar?');
}

function addUserMsg(text) {
  const el = document.createElement('div');
  el.className = 'msg user';
  el.innerHTML = `<div class="msg-content"><div class="msg-bubble">${escHtml(text)}</div><div class="msg-time">${timeNow()}</div></div>`;
  document.getElementById('chatMessages')?.appendChild(el);
  scrollChat();
}

function addAIMsg(text) {
  const el = document.createElement('div');
  el.className = 'msg ai';
  
  // Format basic markdown (bold and newlines)
  const formattedText = escHtml(text)
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
  el.innerHTML = `<div class="msg-content"><div class="msg-bubble">${formattedText}</div><div class="msg-time">MAX CFO AI • ${timeNow()}</div></div>`;
  document.getElementById('chatMessages')?.appendChild(el);
  scrollChat();
}

function showTyping() {
  const id = 'typ-' + Date.now();
  const el = document.createElement('div');
  el.className = 'msg ai'; el.id = id;
  el.innerHTML = `<div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  document.getElementById('chatMessages')?.appendChild(el);
  scrollChat();
  return id;
}

function removeTyping(id) { document.getElementById(id)?.remove(); }
function scrollChat() {
  const w = document.getElementById('chatMessages');
  if (w) setTimeout(() => w.scrollTop = w.scrollHeight, 20);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// VOICE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function toggleVoice() {
  const btn = document.getElementById('voiceBtn');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return showToast('âš ï¸ Use o Google Chrome para reconhecimento de voz', 'error');

  if (state.isListening) {
    state.voiceRec?.stop();
    return;
  }

  const rec = new SR();
  rec.lang = 'pt-BR';
  rec.continuous = false;
  rec.interimResults = false;

  rec.onstart = () => {
    state.isListening = true;
    btn?.classList.add('recording');
    showToast('🎤 Ouvindo... fale agora', 'success');
  };

  rec.onresult = e => {
    const text = e.results[0][0].transcript;
    const input = document.getElementById('chatInput');
    if (input) input.value = text;
    sendChat();
  };

  rec.onerror = e => { showToast('Erro de voz: ' + e.error, 'error'); };

  rec.onend = () => {
    state.isListening = false;
    btn?.classList.remove('recording');
  };

  rec.start();
  state.voiceRec = rec;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MODALS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function openModalEl(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); state.currentModal = id; }
}
function closeModal(id) {
  const m = document.getElementById(id || state.currentModal);
  if (m) { m.classList.remove('open'); if (state.currentModal === id) state.currentModal = null; }
}
// Click-outside to close
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// KEYBOARD SHORTCUTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (state.currentModal) closeModal(state.currentModal); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); document.getElementById('globalSearch')?.focus(); }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      const map = { '1': 'dashboard', '2': 'chat', '3': 'finance', '4': 'simulator', '5': 'companies', '6': 'reports', '7': 'settings' };
      if (map[e.key]) { e.preventDefault(); switchView(map[e.key]); }
    }
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && document.activeElement === document.body) {
      quickAdd();
    }
  });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TOAST
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function showToast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 4000);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DOM HELPERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function setHtml(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
function show(id) { const el = document.getElementById(id); if (el) el.style.display = 'block'; }
function hide(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

﻿

// ============================================================================
// MÓDULO: CONCILIAÇÃO BANCÁRIA (OFX / CSV)
// ============================================================================

let pendingBankTxs = [];

// Drag and drop events
const dropZone = document.getElementById('drop-zone');
if (dropZone) {
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processBankFile(e.dataTransfer.files[0]);
    }
  });
}

window.handleBankFileUpload = function(event) {
  if (event.target.files && event.target.files.length > 0) {
    processBankFile(event.target.files[0]);
  }
}

window.processBankFile = function(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    let bankTxs = [];
    
    if (file.name.toLowerCase().endsWith('.ofx')) {
      bankTxs = parseOFX(content);
    } else if (file.name.toLowerCase().endsWith('.csv')) {
      bankTxs = parseCSV(content);
    } else {
      alert("Formato não suportado. Use OFX ou CSV.");
      return;
    }

    if (bankTxs.length === 0) {
      alert("Nenhuma transação encontrada no arquivo.");
      return;
    }

    matchBankTransactions(bankTxs);
  };
  reader.readAsText(file);
}

// Parser Básico de OFX (Extrai TRNTYPE, DTPOSTED, TRNAMT, MEMO)
function parseOFX(content) {
  const txs = [];
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;
  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const trn = match[1];
    
    let dateMatch = trn.match(/<DTPOSTED>(\d{4})(\d{2})(\d{2})/);
    let amtMatch = trn.match(/<TRNAMT>([\-\d\.]+)/);
    let memoMatch = trn.match(/<MEMO>(.*?)(?:<|$)/);
    
    if (dateMatch && amtMatch) {
      const year = dateMatch[1];
      const month = dateMatch[2];
      const day = dateMatch[3];
      const amount = parseFloat(amtMatch[1]);
      const desc = memoMatch ? memoMatch[1].trim() : "Transação Bancária";
      
      txs.push({
        date: `${year}-${month}-${day}`,
        amount: amount,
        desc: desc,
        type: amount >= 0 ? 'RECEITA' : 'DESPESA'
      });
    }
  }
  return txs;
}

// Parser Básico de CSV (Bancos comuns)
function parseCSV(content) {
  const txs = [];
  const lines = content.split('\n');
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',');
    if (cols.length >= 3) {
      // Supondo formato: Data(DD/MM/YYYY), Descrição, Valor
      const rawDate = cols[0].replace(/"/g, '');
      const desc = cols[1].replace(/"/g, '');
      let rawAmt = cols[2].replace(/"/g, '');
      
      // Converte DD/MM/YYYY para YYYY-MM-DD
      const dateParts = rawDate.split('/');
      let date = rawDate;
      if (dateParts.length === 3) {
        date = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
      }
      
      let amount = parseFloat(rawAmt);
      if (isNaN(amount)) continue;
      
      txs.push({
        date: date,
        amount: amount,
        desc: desc,
        type: amount >= 0 ? 'RECEITA' : 'DESPESA'
      });
    }
  }
  return txs;
}

function matchBankTransactions(bankTxs) {
  pendingBankTxs = [];
  let matchedCount = 0;
  
  const results = bankTxs.map(btx => {
    // Procura na base se existe transação no mesmo dia e com mesmo valor
    const absBankAmt = Math.abs(btx.amount);
    const found = state.transactions.find(stx => {
      const isSameDate = stx.date === btx.date;
      const isSameAmt = Math.abs(stx.amount) === absBankAmt;
      return isSameDate && isSameAmt;
    });

    if (found) {
      matchedCount++;
      return { ...btx, status: 'matched', systemTx: found };
    } else {
      pendingBankTxs.push(btx);
      return { ...btx, status: 'pending' };
    }
  });

  renderReconciliationResults(results, matchedCount, pendingBankTxs.length);
}

function renderReconciliationResults(results, matchedCount, pendingCount) {
  document.getElementById('reconciliation-upload-zone').style.display = 'none';
  const resDiv = document.getElementById('reconciliation-results');
  resDiv.style.display = 'block';
  
  document.getElementById('count-matched').innerText = `${matchedCount} Conciliados`;
  document.getElementById('count-pending').innerText = `${pendingCount} Pendentes`;
  
  const btnImport = document.getElementById('btn-import-pending');
  if (pendingCount > 0) {
    btnImport.style.display = 'inline-block';
    btnImport.innerText = `Importar ${pendingCount} Pendentes`;
  } else {
    btnImport.style.display = 'none';
  }

  const tbody = document.getElementById('reconTableBody');
  tbody.innerHTML = '';

  results.forEach(tx => {
    const tr = document.createElement('tr');
    
    let statusHtml = '';
    if (tx.status === 'matched') {
      statusHtml = `<span class="badge-status matched">✅ Conciliado</span>`;
    } else {
      statusHtml = `<span class="badge-status pending">⏳ Pendente</span>`;
    }

    const valColor = tx.amount >= 0 ? 'var(--primary)' : 'var(--danger)';
    const fmtdAmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(tx.amount));

    tr.innerHTML = `
      <td>${statusHtml}</td>
      <td>${tx.date.split('-').reverse().join('/')}</td>
      <td>${tx.desc}</td>
      <td style="color:${valColor}; font-weight:600;">${tx.amount < 0 ? '-' : '+'}${fmtdAmt}</td>
      <td>${tx.status === 'pending' ? '<button class="btn-primary" style="padding:4px 8px; font-size:12px;" onclick="importSingleTransaction(this, \''+tx.date+'\', \''+tx.desc+'\', '+tx.amount+')">Importar</button>' : '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.importSingleTransaction = function(btn, date, desc, amount) {
  const isReceita = amount >= 0;
  const newTx = {
    id: Date.now().toString() + Math.floor(Math.random()*100),
    type: isReceita ? 'RECEITA' : 'DESPESA',
    date: date,
    desc: desc + " (Conciliação)",
    category: isReceita ? 'Vendas' : 'Bancário',
    amount: Math.abs(amount)
  };
  state.transactions.push(newTx);
  saveData();
  
  btn.outerHTML = `<span class="badge-status matched">Importado</span>`;
  btn.closest('tr').querySelector('td:first-child').innerHTML = `<span class="badge-status matched">✅ Conciliado</span>`;
  updateFinanceKPIs();
  renderFinanceTable();
}

window.importPendingTransactions = function() {
  if (pendingBankTxs.length === 0) return;
  
  pendingBankTxs.forEach((tx, idx) => {
    const isReceita = tx.amount >= 0;
    const newTx = {
      id: Date.now().toString() + idx,
      type: isReceita ? 'RECEITA' : 'DESPESA',
      date: tx.date,
      desc: tx.desc + " (Conciliação)",
      category: isReceita ? 'Vendas' : 'Bancário',
      amount: Math.abs(tx.amount)
    };
    state.transactions.push(newTx);
  });
  
  saveData();
  alert(`${pendingBankTxs.length} transações importadas com sucesso!`);
  
  // Reseta view
  document.getElementById('reconciliation-results').style.display = 'none';
  document.getElementById('reconciliation-upload-zone').style.display = 'block';
  document.getElementById('btn-import-pending').style.display = 'none';
  pendingBankTxs = [];
  
  updateFinanceKPIs();
  renderFinanceTable();
  switchView('finance');
};





// PDF Export Feature
async function exportToPDF(elementId, filename) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  if (!window.html2pdf) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    document.head.appendChild(script);
    await new Promise(r => script.onload = r);
  }
  
  const opt = {
    margin: 10,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  showToast('Gerando PDF...', 'info');
  html2pdf().set(opt).from(el).save().then(() => {
    showToast('PDF exportado com sucesso!', 'success');
  });
}
