'use client';

import { useEffect, useState } from 'react';

// Botão para escolher a língua do site (português, inglês ou espanhol). A tradução é feita por /i18n/i18n.js.
const OPCOES = [['pt', 'PT', 'Português'], ['en', 'EN', 'English'], ['es', 'ES', 'Español']];
// Mostra só a sigla (PT, EN, ES) para caber no topo do celular; o nome da língua fica no title da opção.

export default function SeletorIdioma({ escuro = false, style }) {
  const [atual, setAtual] = useState('pt');
  useEffect(() => { if (window.laIdioma) setAtual(window.laIdioma.atual()); }, []);
  const cor = escuro ? '#E8EFF8' : '#0B1220';
  return (
    <select
      data-sem-traducao=""
      aria-label="Idioma / Language / Idioma"
      title="Idioma / Language / Idioma"
      value={atual}
      onChange={(e) => { setAtual(e.target.value); if (window.laIdioma) window.laIdioma.trocar(e.target.value); }}
      style={{ font: 'inherit', fontSize: 14, fontWeight: 600, color: cor, background: 'transparent', border: `1px solid ${escuro ? 'rgba(255,255,255,.25)' : '#D5D9E0'}`, borderRadius: 8, padding: '6px 6px', minHeight: 36, flex: 'none', cursor: 'pointer', ...style }}
    >
      {OPCOES.map(([v, curto, nome]) => <option key={v} value={v} title={nome} style={{ color: '#0B1220' }}>{curto}</option>)}
    </select>
  );
}
