// Mescla de três vias para quando duas pessoas (ou dois aparelhos) alteram a mesma empresa.
// base = como estava na última leitura/gravação deste aparelho; local = como está aqui agora; remoto = como está na nuvem.
// Regra por item: quem mudou em relação à base vence; se os dois mudaram o mesmo lançamento, vence a alteração
// mais recente (atualizadoEm) e, empatando, a deste aparelho. Exclusões valem se o outro lado não mexeu no item.

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function mesclarLista(base = [], local = [], remoto = [], chave = 'id') {
  const mapa = (l) => { const m = new Map(); (Array.isArray(l) ? l : []).forEach((x) => { if (x && x[chave] != null) m.set(String(x[chave]), x); }); return m; };
  const B = mapa(base), L = mapa(local), R = mapa(remoto);
  const ids = new Set([...L.keys(), ...R.keys(), ...B.keys()]);
  const saida = [];
  const ordem = [...L.keys(), ...[...R.keys()].filter((k) => !L.has(k))]; // mantém a ordem local e acrescenta os novos de fora
  const conflitos = [];
  const decidir = (id) => {
    const b = B.get(id), l = L.get(id), r = R.get(id);
    if (b === undefined) return l !== undefined ? l : r; // novo de um dos lados (ou dos dois com o mesmo id)
    if (l === undefined && r === undefined) return undefined; // apagado nos dois
    if (l === undefined) return igual(r, b) ? undefined : r; // apagado aqui; o outro lado editou → mantém a edição
    if (r === undefined) return igual(l, b) ? undefined : l; // apagado lá; aqui editei → mantém a minha edição
    if (igual(l, b)) return r;
    if (igual(r, b) || igual(l, r)) return l;
    conflitos.push(id);
    return (Number(r.atualizadoEm) || 0) > (Number(l.atualizadoEm) || 0) ? r : l;
  };
  for (const id of ordem) { const v = decidir(id); if (v !== undefined) saida.push(v); ids.delete(id); }
  // itens que só existem na base foram apagados nos dois lados
  return { lista: saida, conflitos };
}

function mesclarObjeto(base = {}, local = {}, remoto = {}) {
  const saida = {};
  const chaves = new Set([...Object.keys(local || {}), ...Object.keys(remoto || {}), ...Object.keys(base || {})]);
  for (const k of chaves) {
    const b = (base || {})[k], l = (local || {})[k], r = (remoto || {})[k];
    let v;
    if (igual(l, b)) v = r; else if (igual(r, b)) v = l; else v = l; // os dois mudaram: fica a deste aparelho
    if (v !== undefined) saida[k] = v;
  }
  return saida;
}

// Campos que são listas de itens com "id" e mesclam item a item
const LISTAS = ['transactions', 'contas', 'team', 'audit', 'notasEntrada', 'produtos', 'clientes', 'orcamentos', 'ordens', 'contratos', 'funcionarios', 'bens', 'acessosLeitura'];
// Campos que são objetos e mesclam chave a chave
const OBJETOS = ['contatos', 'regras', 'settings'];

export function mesclarEstados(base, local, remoto) {
  base = base || {}; local = local || {}; remoto = remoto || {};
  const saida = {};
  const conflitos = [];
  const chaves = new Set([...Object.keys(local), ...Object.keys(remoto), ...Object.keys(base)]);
  for (const k of chaves) {
    const b = base[k], l = local[k], r = remoto[k];
    const chave = k === 'acessosLeitura' ? 'email' : 'id';
    // só mescla item a item quando todos os itens têm identificador (senão poderia perder itens)
    const comChave = (v) => v === undefined || (Array.isArray(v) && v.every((x) => x && typeof x === 'object' && x[chave] != null));
    const algumaLista = Array.isArray(l) || Array.isArray(r);
    if (algumaLista && (LISTAS.includes(k) || Array.isArray(l) || Array.isArray(r)) && comChave(l) && comChave(r) && comChave(b)) {
      const m = mesclarLista(b, l, r, chave);
      saida[k] = m.lista;
      if (m.conflitos.length) conflitos.push(...m.conflitos.map((id) => k + ':' + id));
    } else if (OBJETOS.includes(k) && (l && typeof l === 'object') && (r && typeof r === 'object')) {
      saida[k] = mesclarObjeto(b, l, r);
    } else {
      const v = igual(l, b) ? r : l;
      if (v !== undefined) saida[k] = v;
    }
  }
  return { estado: saida, conflitos };
}

// Compara dois estados ignorando a ordem das chaves dos objetos
function canonico(v) {
  if (Array.isArray(v)) return '[' + v.map(canonico).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ':' + canonico(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
export const mesmoEstado = (a, b) => canonico(a) === canonico(b);
