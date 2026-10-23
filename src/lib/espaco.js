// Leitura e gravação dos dados de uma empresa (workspaces/{wsId}) no Firestore, sem o limite de 1 MB por documento.
//
// Formatos aceitos na leitura:
//   antigo:  { data: "<json>" }                         (texto puro, até ~1 MB)
//   2:       { formato: 2, dataZ: <bytes gzip> }        (comprimido: cabe de 6 a 10 vezes mais)
//   2 grande:{ formato: 2, partes: N, versao: "v" }     + workspaces/{wsId}/partes/{v}_{0..N-1} { z: <bytes> }
// A gravação usa sempre o formato 2 (comprimido; dividido em partes só quando passa de ~900 KB comprimido).
// As partes e o documento principal são gravados juntos (writeBatch), então quem lê nunca vê metade.
import { doc, getDoc, setDoc, writeBatch, collection, getDocs, deleteDoc, deleteField, Bytes } from 'firebase/firestore/lite';

export const LIMITE_INLINE = 900 * 1024; // bytes comprimidos que cabem no documento principal
export const TAMANHO_PARTE = 900 * 1024;
export const LIMITE_TOTAL = 9 * 1024 * 1024; // o Firestore aceita até 10 MB por gravação em lote

export const temCompressao = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

export async function comprimir(texto) {
  const fluxo = new Blob([texto]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}
export async function descomprimir(bytes) {
  const fluxo = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(fluxo).text();
}

const paraBytes = (v) => (v && typeof v.toUint8Array === 'function' ? v.toUint8Array() : v instanceof Uint8Array ? v : new Uint8Array(v || []));
function juntar(pedacos) {
  const total = pedacos.reduce((s, p) => s + p.length, 0);
  const saida = new Uint8Array(total);
  let pos = 0;
  for (const p of pedacos) { saida.set(p, pos); pos += p.length; }
  return saida;
}

// As funções do Firestore entram como parâmetro para poderem ser testadas fora do navegador
export function criarArmazem(fs) {
  const ref = (db, wsId) => fs.doc(db, 'workspaces', wsId);
  const refParte = (db, wsId, id) => fs.doc(db, 'workspaces', wsId, 'partes', id);
  const ultimaVersao = {}; // versão das partes gravadas por último em cada empresa (não é apagada na limpeza)

  // Devolve o JSON (texto) da empresa a partir do documento já lido, ou null se não houver dados
  async function lerDados(db, wsId, snap) {
    if (!snap || !snap.exists()) return null;
    const d = snap.data() || {};
    if (d.formato === 2 && d.dataZ) return descomprimir(paraBytes(d.dataZ));
    if (d.formato === 2 && d.partes) {
      const ids = Array.from({ length: d.partes }, (_, i) => `${d.versao}_${i}`);
      const partes = await Promise.all(ids.map((id) => fs.getDoc(refParte(db, wsId, id))));
      if (partes.some((p) => !p.exists())) throw new Error('Partes dos dados incompletas');
      ultimaVersao[wsId] = d.versao;
      return descomprimir(juntar(partes.map((p) => paraBytes(p.data().z))));
    }
    return d.data || null;
  }

  // Apaga partes de versões antigas, mantendo a atual e a anterior (alguém pode estar lendo a anterior agora)
  async function limparPartes(db, wsId, manter) {
    try {
      const q = await fs.getDocs(fs.collection(db, 'workspaces', wsId, 'partes'));
      const velhas = q.docs.filter((p) => !manter.some((v) => v && p.id.startsWith(v + '_')));
      await Promise.all(velhas.map((p) => fs.deleteDoc(p.ref)));
    } catch (e) { /* limpeza é opcional */ }
  }

  // Grava o JSON (texto) da empresa. Devolve { bytes, partes } para avisos de tamanho.
  async function gravarDados(db, wsId, json, owner, quando) {
    if (!temCompressao()) {
      // Navegador muito antigo: formato antigo (limite de 1 MB)
      await fs.setDoc(ref(db, wsId), { data: json, owner, updatedAt: quando, formato: fs.deleteField(), dataZ: fs.deleteField(), partes: fs.deleteField(), versao: fs.deleteField() }, { merge: true });
      return { bytes: json.length, partes: 0 };
    }
    const z = await comprimir(json);
    const base = { owner, updatedAt: quando, formato: 2, tamanho: json.length, data: fs.deleteField() };
    const anterior = ultimaVersao[wsId];
    if (z.length <= LIMITE_INLINE) {
      await fs.setDoc(ref(db, wsId), { ...base, dataZ: fs.Bytes.fromUint8Array(z), partes: fs.deleteField(), versao: fs.deleteField() }, { merge: true });
      if (anterior) { ultimaVersao[wsId] = null; limparPartes(db, wsId, []); }
      return { bytes: z.length, partes: 0 };
    }
    if (z.length > LIMITE_TOTAL) throw Object.assign(new Error('Dados grandes demais para gravar de uma vez'), { code: 'grande-demais' });
    const versao = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const n = Math.ceil(z.length / TAMANHO_PARTE);
    const lote = fs.writeBatch(db);
    for (let i = 0; i < n; i++) {
      lote.set(refParte(db, wsId, `${versao}_${i}`), { z: fs.Bytes.fromUint8Array(z.subarray(i * TAMANHO_PARTE, (i + 1) * TAMANHO_PARTE)), owner });
    }
    lote.set(ref(db, wsId), { ...base, dataZ: fs.deleteField(), partes: n, versao }, { merge: true });
    await lote.commit();
    ultimaVersao[wsId] = versao;
    limparPartes(db, wsId, [versao, anterior]);
    return { bytes: z.length, partes: n };
  }

  async function apagarPartes(db, wsId) { return limparPartes(db, wsId, []); }

  return { lerDados, gravarDados, apagarPartes, ref };
}

const armazem = criarArmazem({ doc, getDoc, setDoc, writeBatch, collection, getDocs, deleteDoc, deleteField, Bytes });
export const lerDadosDoEspaco = armazem.lerDados;
export const gravarDadosDoEspaco = armazem.gravarDados;
export const apagarPartesDoEspaco = armazem.apagarPartes;
