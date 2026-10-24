// Firestore em memória, só o que o emissor usa
export function fakeDb() {
  const dados = new Map();
  const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
  function checar(o, p = '') { for (const [k, v] of Object.entries(o || {})) { if (v === undefined) throw new Error('undefined em ' + p + k); if (v && typeof v === 'object' && !Array.isArray(v)) checar(v, p + k + '.'); } }
  function doc(caminho) {
    return {
      caminho,
      async get() { const d = dados.get(caminho); return { exists: d !== undefined, data: () => clone(d) }; },
      async set(v, op = {}) { checar(v); const atual = dados.get(caminho); dados.set(caminho, op.merge && atual ? { ...atual, ...clone(v) } : clone(v)); },
      collection(n) { return col(caminho + '/' + n); },
    };
  }
  function col(caminho) {
    return {
      doc: (id) => doc(caminho + '/' + id),
      orderBy(campo, dir) { const self = this; return { limit(n) { return { async get() { const docs = [...dados.entries()].filter(([k]) => k.startsWith(caminho + '/') && !k.slice(caminho.length + 1).includes('/')).map(([, v]) => v).sort((a, b) => dir === 'desc' ? b[campo] - a[campo] : a[campo] - b[campo]).slice(0, n); return { docs: docs.map((d) => ({ data: () => clone(d) })) }; } }; } }; },
    };
  }
  return {
    dados,
    collection: (n) => col(n),
    async runTransaction(fn) { const tx = { get: (r) => r.get(), set: (r, v, o) => r.set(v, o) }; return fn(tx); },
  };
}
