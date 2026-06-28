import re
import codecs

def patch_app_js():
    file_path = "public/app.js"
    with codecs.open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Inject API Client after "STATE & PERSISTENCE" header
    api_code = """
const API_BASE = 'http://localhost:8000/api/v1';
const API = {
  getToken() { return localStorage.getItem('maxcfo_jwt'); },
  setToken(token) { localStorage.setItem('maxcfo_jwt', token); },
  async req(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, options);
      if (res.status === 401) { console.warn('Sessão expirada'); return null; }
      return await res.json();
    } catch (err) { console.error('API Error:', err); return null; }
  }
};

"""
    # Find "var DB = {" and inject API_BASE right before it
    content = re.sub(r'var DB = \{', api_code + 'var DB = {', content, count=1)

    # 2. Modify state.transactions to start empty
    content = content.replace("transactions: DB.get('transactions', []),", "transactions: [], // Loaded via API")

    # 3. Modify persist() to not save transactions
    content = content.replace("DB.set('transactions', state.transactions);", "// DB.set('transactions', state.transactions); // Managed by API")

    # 4. Modify initMaxCfoApp
    old_init = """var initMaxCfoApp = () => {
  applySettings();"""
    new_init = """var initMaxCfoApp = async () => {
  // Load transactions from Backend API
  try {
    const data = await API.req('/transactions/', 'GET');
    if (data && Array.isArray(data)) {
      state.transactions = data;
    }
  } catch (e) { console.error("Failed to load tx", e); }
  
  applySettings();"""
    content = content.replace(old_init, new_init)

    # 5. Modify submitTransaction
    old_submit = """  if (editId) {
    // Edit
    const idx = state.transactions.findIndex(t => t.id === editId);
    if (idx !== -1) {
      state.transactions[idx] = { ...state.transactions[idx], desc, amount, date, category, notes, type };
      showToast('✅ Lançamento atualizado', 'success');
    }
  } else {
    // Create
    const tx = { id: genId(), desc, amount, date, category, notes, type };
    state.transactions.push(tx);
    showToast(`✅ ${type === 'RECEITA' ? 'Receita' : 'Despesa'} de ${fmt(amount)} registrada!`, 'success');
  }"""
    
    new_submit = """  if (editId) {
    // Edit (mocked)
    const idx = state.transactions.findIndex(t => t.id === editId);
    if (idx !== -1) {
      state.transactions[idx] = { ...state.transactions[idx], desc, amount, date, category, notes, type };
      showToast('✅ Lançamento atualizado', 'success');
    }
  } else {
    // Create via API
    try {
      const payload = { type, description: desc, amount: amount };
      const newTx = await API.req('/transactions/', 'POST', payload);
      if (newTx && newTx.id) {
        state.transactions.push({ id: newTx.id, desc: newTx.description, amount: newTx.amount, date: newTx.date, category: category || 'Outros', notes: '', type: newTx.type });
        showToast(`✅ ${type === 'RECEITA' ? 'Receita' : 'Despesa'} de ${fmt(amount)} salva na nuvem!`, 'success');
      } else {
        state.transactions.push({ id: genId(), desc, amount, date, category, notes, type });
        showToast('Modo offline', 'warn');
      }
    } catch(err) {
      showToast('Erro de rede', 'error');
    }
  }"""
    content = content.replace(old_submit, new_submit)
    
    # 6. Make submitTransaction async
    content = content.replace("function submitTransaction(e) {", "async function submitTransaction(e) {")

    with codecs.open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Frontend app.js refactored successfully.")

if __name__ == "__main__":
    patch_app_js()
