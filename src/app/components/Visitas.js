'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Descobre de onde a pessoa veio: ?utm_source=..., marcas de clique (fbclid) ou o site de origem.
function descobrirOrigem() {
  try {
    const url = new URL(window.location.href);
    const utm = url.searchParams.get('utm_source') || url.searchParams.get('origem');
    if (utm) return utm;
    const ua = navigator.userAgent || '';
    if (/Instagram/i.test(ua)) return 'instagram';
    if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook';
    if (/LinkedInApp/i.test(ua)) return 'linkedin';
    if (url.searchParams.get('fbclid')) return 'instagram';
    const ref = document.referrer ? new URL(document.referrer).hostname : '';
    if (!ref || ref === window.location.hostname) return 'direto';
    if (/instagram/.test(ref)) return 'instagram';
    if (/facebook|fb\.com/.test(ref)) return 'facebook';
    if (/linkedin|lnkd/.test(ref)) return 'linkedin';
    if (/whatsapp|wa\.me/.test(ref)) return 'whatsapp';
    if (/google/.test(ref)) return 'google';
    if (/youtube/.test(ref)) return 'youtube';
    if (/tiktok/.test(ref)) return 'tiktok';
    if (/mail/.test(ref)) return 'email';
    return 'outros';
  } catch { return 'direto'; }
}

function hoje() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); }
function ler(k) { try { return localStorage.getItem(k); } catch { return null; } }
function gravar(k, v) { try { localStorage.setItem(k, v); } catch {} }

function enviar(dados) {
  const corpo = JSON.stringify(dados);
  try {
    if (navigator.sendBeacon && navigator.sendBeacon('/api/visita', new Blob([corpo], { type: 'text/plain' }))) return;
  } catch {}
  fetch('/api/visita', { method: 'POST', body: corpo, keepalive: true }).catch(() => {});
}

// A origem da primeira visita fica guardada neste aparelho para saber de onde veio quem criou conta
export function registrarCadastro() {
  enviar({ evento: 'cadastro', origem: ler('la_origem') || descobrirOrigem() });
}

// Conta as visitas das páginas públicas (o painel e a área do administrador não entram)
export default function Visitas() {
  const caminho = usePathname();
  useEffect(() => {
    if (!caminho || /^\/(dashboard|admin|success|assinatura|api)/.test(caminho)) return;
    const origemAgora = descobrirOrigem();
    if (!ler('la_origem') || origemAgora !== 'direto') gravar('la_origem', origemAgora);
    const dia = hoje(), novo = ler('la_visita_dia') !== dia;
    if (novo) gravar('la_visita_dia', dia);
    enviar({ pagina: caminho, origem: origemAgora, novo });
  }, [caminho]);
  return null;
}
