/**
 * MAX CFO AI - RH & Provisões Module
 */

window.initHRModule = function() {
    if (!window.state) window.state = {};
    
    let employees = JSON.parse(localStorage.getItem('maxcfo_employees') || 'null');
    if (!employees) {
        employees = [
            { id: "e1", nome: "Carlos Almeida", cargo: "Desenvolvedor Sênior", salarioBruto: 12500, dataAdmissao: "2023-01-15", ativo: true },
            { id: "e2", nome: "Ana Paula", cargo: "Analista Financeiro", salarioBruto: 6800, dataAdmissao: "2024-03-10", ativo: true }
        ];
        localStorage.setItem('maxcfo_employees', JSON.stringify(employees));
    }
    window.state.employees = employees;
};

window.renderHR = function() {
    const hrView = document.getElementById('view-hr');
    if (!hrView) return;
    
    let totalCusto = 0;
    
    let tbody = '';
    window.state.employees.forEach(emp => {
        if (!emp.ativo) return;
        const provisao = window.calculateProvisions(emp);
        totalCusto += provisao.total;
        
        tbody += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td>
                <div style="font-weight:bold; color:white;">${emp.nome}</div>
                <div style="font-size:12px; color:var(--text-muted);">${emp.cargo}</div>
            </td>
            <td>R$ ${emp.salarioBruto.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td style="color:var(--warning);">R$ ${provisao.ferias.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td style="color:var(--warning);">R$ ${provisao.decimoTerceiro.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td style="color:var(--danger);">R$ ${provisao.encargos.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td style="font-weight:bold; color:var(--success);">R$ ${provisao.total.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td><button class="btn-ghost" style="padding:4px 8px; font-size:12px;" onclick="removeEmployee('${emp.id}')">Demitir</button></td>
        </tr>`;
    });
    
    hrView.innerHTML = `
      <div class="page-header">
        <div class="page-header-text">
          <h1>RH Financeiro & Provisões</h1>
          <p class="page-subtitle">Projeção automática de Férias, 13º e Encargos no fluxo de caixa</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-primary" onclick="openModal('hrModal')">+ Novo Colaborador</button>
        </div>
      </div>
      
      <div class="grid-3col" style="margin-top:20px;">
        <div class="card" style="border-left: 4px solid var(--primary);">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">Headcount Ativo</div>
            <div style="font-size:32px; font-weight:bold; color:white;">${window.state.employees.filter(e=>e.ativo).length}</div>
        </div>
        <div class="card" style="border-left: 4px solid var(--warning);">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">Provisões Mensais (Férias + 13º)</div>
            <div style="font-size:32px; font-weight:bold; color:var(--warning);">R$ ${(totalCusto - window.state.employees.reduce((acc,e)=>acc+e.salarioBruto,0)).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
        </div>
        <div class="card" style="border-left: 4px solid var(--danger);">
            <div style="color:var(--text-muted); font-size:14px; margin-bottom:8px;">Custo Total Mensal (Folha Real)</div>
            <div style="font-size:32px; font-weight:bold; color:var(--danger);">R$ ${totalCusto.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
        </div>
      </div>
      
      <div class="card" style="margin-top:20px;">
        <h3 class="card-title">Espelho da Folha e Provisões</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Colaborador</th>
                    <th>Salário Bruto</th>
                    <th>Prov. Férias (1/12)</th>
                    <th>Prov. 13º (1/12)</th>
                    <th>Encargos (INSS/FGTS)</th>
                    <th>Custo Total/Mês</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>${tbody}</tbody>
        </table>
      </div>
    `;
};

window.calculateProvisions = function(employee) {
    const s = employee.salarioBruto;
    const ferias = (s / 12) + ((s / 12) / 3); // 1/12 + 1/3
    const decimo = s / 12;
    const inss = s * 0.20; // 20% patronal aprox
    const fgts = s * 0.08; // 8%
    const total = s + ferias + decimo + inss + fgts;
    
    return {
        ferias: ferias,
        decimoTerceiro: decimo,
        encargos: inss + fgts,
        total: total
    };
};

window.submitEmployee = function(e) {
    e.preventDefault();
    const nome = document.getElementById('hrName').value;
    const cargo = document.getElementById('hrRole').value;
    const salarioBruto = parseFloat(document.getElementById('hrSalary').value);
    const dataAdmissao = document.getElementById('hrDate').value;
    
    window.state.employees.push({
        id: Date.now().toString(),
        nome,
        cargo,
        salarioBruto,
        dataAdmissao,
        ativo: true
    });
    
    localStorage.setItem('maxcfo_employees', JSON.stringify(window.state.employees));
    closeModal('hrModal');
    if (window.showToast) window.showToast('Colaborador adicionado!', 'success');
    renderHR();
};

window.removeEmployee = function(id) {
    if (!confirm('Demitir colaborador?')) return;
    const emp = window.state.employees.find(e => e.id === id);
    if (emp) emp.ativo = false;
    localStorage.setItem('maxcfo_employees', JSON.stringify(window.state.employees));
    if (window.showToast) window.showToast('Colaborador desligado.', 'success');
    renderHR();
};
