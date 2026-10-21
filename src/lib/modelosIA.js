// Modelos do Google Gemini, em ordem de preferência. O Google aposenta modelos para chaves novas
// (o gemini-2.5-flash deixou de valer para chaves criadas em out/2026) e às vezes um modelo fica
// sobrecarregado; por isso a chamada tenta o próximo da lista quando um falha.
// GEMINI_MODEL na Vercel pode trocar a lista (separada por vírgulas).
export const MODELOS = (process.env.GEMINI_MODEL || 'gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-flash-latest')
  .split(',').map((m) => m.trim()).filter(Boolean);

function codigoDoErro(e) {
  const msg = String((e && e.message) || '');
  return Number(e && e.status) || Number((msg.match(/\[(\d{3})\b/) || [])[1]) || 0;
}

// Executa fn(nomeDoModelo) tentando cada modelo. Erros de chave inválida param na hora.
export async function comModelos(fn) {
  let ultimo;
  for (const modelo of MODELOS) {
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        return await fn(modelo);
      } catch (e) {
        ultimo = e;
        const c = codigoDoErro(e), msg = String((e && e.message) || '');
        console.warn('IA', modelo, 'falhou:', c, msg.slice(0, 200));
        if (c === 400 && /API key not valid|API_KEY_INVALID/i.test(msg)) throw e;
        if (c === 401 || c === 403) throw e;
        if ((c === 503 || c === 500) && tentativa === 0) { await new Promise((r) => setTimeout(r, 1200)); continue; }
        break; // 404 (modelo aposentado), 429 (limite), 400 de conteúdo: vai para o próximo modelo
      }
    }
  }
  throw ultimo;
}
