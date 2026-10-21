// Limite simples de uso por usuário (por instância do servidor), para a chave de IA não ser abusada.
const usos = new Map();

export function limiteExcedido(chave, maxPorHora) {
  const agora = Date.now();
  const janela = 60 * 60 * 1000;
  const lista = (usos.get(chave) || []).filter((t) => agora - t < janela);
  lista.push(agora);
  usos.set(chave, lista);
  return lista.length > maxPorHora;
}
