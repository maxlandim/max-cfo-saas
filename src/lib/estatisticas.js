// Contador de visitas do site, sem dados pessoais: só totais por dia, por página e por origem.
// Fica em estatisticas/dia-AAAA-MM-DD (só o servidor lê e grava; as regras do Firestore fecham para o navegador).

export const PAGINAS = { '/': 'inicio', '/pricing': 'planos', '/consultoria': 'consultoria', '/register': 'cadastro', '/login': 'login', '/termos': 'termos', '/privacidade': 'privacidade' };
export const NOME_PAGINA = { inicio: 'Página inicial', planos: 'Planos', consultoria: 'Consultoria', cadastro: 'Criar conta', login: 'Entrar', termos: 'Termos de uso', privacidade: 'Privacidade' };
export const ORIGENS = ['instagram', 'facebook', 'linkedin', 'whatsapp', 'google', 'youtube', 'tiktok', 'email', 'direto', 'outros'];
export const NOME_ORIGEM = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', whatsapp: 'WhatsApp', google: 'Google', youtube: 'YouTube', tiktok: 'TikTok', email: 'E-mail', direto: 'Direto ou sem origem', outros: 'Outros sites' };

export function origemValida(o) {
  o = String(o || '').toLowerCase().trim();
  if (ORIGENS.includes(o)) return o;
  if (/insta|^ig$/.test(o)) return 'instagram';
  if (/face|^fb$|meta/.test(o)) return 'facebook';
  if (/linked/.test(o)) return 'linkedin';
  if (/whats|^wa$|zap/.test(o)) return 'whatsapp';
  if (/google/.test(o)) return 'google';
  if (/mail/.test(o)) return 'email';
  return o ? 'outros' : 'direto';
}

export const ROBOS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp\/|linkedinbot|headless|lighthouse|pingdom|uptime|curl|wget|python|axios|node-fetch/i;

export function diaId(dia) { return 'dia-' + dia; }
