'use client';

import { useEffect } from 'react';

// Avisa o servidor quando algo quebra no navegador de um cliente (sem dados pessoais nem conteúdo dos lançamentos).
// Cada erro igual é enviado no máximo uma vez por página aberta; até 10 por página.
export default function RegistroErros() {
  useEffect(() => {
    const vistos = new Set();
    const enviar = (tipo, mensagem, pilha) => {
      try {
        const msg = String(mensagem || '').slice(0, 300);
        if (!msg || vistos.has(msg) || vistos.size >= 10) return;
        // ruído comum que não é erro do sistema (extensões, rede, scripts de terceiros)
        if (/ResizeObserver loop|Script error\.?$|chrome-extension:|moz-extension:|Load failed|Failed to fetch|NetworkError|AbortError|cancelad/i.test(msg + ' ' + (pilha || ''))) return;
        vistos.add(msg);
        const corpo = JSON.stringify({ tipo, mensagem: msg, pilha: String(pilha || '').slice(0, 1500), pagina: location.pathname, versao: document.documentElement.dataset.versao || '' });
        if (!(navigator.sendBeacon && navigator.sendBeacon('/api/erro', new Blob([corpo], { type: 'text/plain' })))) fetch('/api/erro', { method: 'POST', body: corpo, keepalive: true }).catch(() => {});
      } catch {}
    };
    const aoErro = (e) => enviar('erro', e.message || (e.error && e.error.message), e.error && e.error.stack ? e.error.stack : `${e.filename || ''}:${e.lineno || ''}:${e.colno || ''}`);
    const aoPromessa = (e) => { const r = e.reason; enviar('promessa', (r && r.message) || String(r), r && r.stack); };
    window.addEventListener('error', aoErro);
    window.addEventListener('unhandledrejection', aoPromessa);
    return () => { window.removeEventListener('error', aoErro); window.removeEventListener('unhandledrejection', aoPromessa); };
  }, []);
  return null;
}
