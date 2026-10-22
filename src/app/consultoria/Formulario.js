'use client';

import { useEffect, useState } from 'react';

// Pedido de proposta: monta a mensagem e abre o WhatsApp (nada é guardado no site)
export default function Formulario({ servicos }) {
  const [f, setF] = useState({ nome: '', empresa: '', servico: servicos[0]?.id || '', faturamento: '', mensagem: '' });
  const muda = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // Os links "Pedir proposta de…" dos cartões já escolhem o serviço
  useEffect(() => {
    const clique = (e) => {
      const a = e.target.closest && e.target.closest('[data-servico]');
      if (a) setF((x) => ({ ...x, servico: a.getAttribute('data-servico') }));
    };
    document.addEventListener('click', clique);
    return () => document.removeEventListener('click', clique);
  }, []);

  const enviar = (e) => {
    e.preventDefault();
    const titulo = (servicos.find((s) => s.id === f.servico) || {}).titulo || 'Consultoria';
    const texto = [
      'Olá! Quero uma proposta da Landim Advisory.',
      `Serviço: ${titulo}`,
      f.nome && `Nome: ${f.nome}`,
      f.empresa && `Empresa: ${f.empresa}`,
      f.faturamento && `Faturamento mensal: ${f.faturamento}`,
      f.mensagem && `Sobre a empresa: ${f.mensagem}`,
    ].filter(Boolean).join('\n');
    window.open('https://wa.me/5561992105889?text=' + encodeURIComponent(texto), '_blank', 'noopener');
  };

  return (
    <form className="cs-form" onSubmit={enviar}>
      <div className="cs-duplo">
        <label>Seu nome<input required value={f.nome} onChange={muda('nome')} autoComplete="name" /></label>
        <label>Empresa<input value={f.empresa} onChange={muda('empresa')} autoComplete="organization" /></label>
      </div>
      <div className="cs-duplo">
        <label>Serviço
          <select value={f.servico} onChange={muda('servico')}>
            {servicos.map((s) => <option key={s.id} value={s.id}>{s.titulo}</option>)}
            <option value="outro">Ainda não sei, quero conversar</option>
          </select>
        </label>
        <label>Faturamento mensal
          <select value={f.faturamento} onChange={muda('faturamento')}>
            <option value="">Prefiro não dizer</option>
            <option>Até R$ 50 mil</option>
            <option>R$ 50 mil a R$ 200 mil</option>
            <option>R$ 200 mil a R$ 1 milhão</option>
            <option>Acima de R$ 1 milhão</option>
          </select>
        </label>
      </div>
      <label>O que você precisa? <textarea rows={3} value={f.mensagem} onChange={muda('mensagem')} placeholder="Ex.: quero tirar o financeiro das minhas mãos; não sei se o meu regime tributário é o melhor…" /></label>
      <button type="submit" className="cs-btn cs-btn-ouro">Enviar pelo WhatsApp</button>
      <small>Ao enviar, abrimos o WhatsApp com a mensagem pronta. Nada fica salvo no site.</small>
    </form>
  );
}
