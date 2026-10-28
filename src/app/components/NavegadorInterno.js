'use client';

import { useEffect, useState } from 'react';

// Quem toca num anúncio ou link do Instagram, Facebook, LinkedIn ou TikTok abre o site dentro do app,
// num navegador embutido. Ali o Google bloqueia o login ("Entrar com Google"), e algumas janelas não abrem.
// Este aviso explica e oferece abrir a mesma página no navegador do celular. O cadastro por e-mail funciona normalmente.
export function navegadorInterno() {
  if (typeof navigator === 'undefined') return '';
  const ua = navigator.userAgent || '';
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS|FB4A|Messenger/i.test(ua)) return 'Facebook';
  if (/LinkedInApp/i.test(ua)) return 'LinkedIn';
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return 'TikTok';
  if (/Android/.test(ua) && /; wv\)/.test(ua)) return 'app';
  return '';
}

export function useNavegadorInterno() {
  const [app, setApp] = useState('');
  useEffect(() => { setApp(navegadorInterno()); }, []);
  return app;
}

export const MSG_GOOGLE_INTERNO = 'O Google não permite entrar pelo navegador de dentro do app. Abra a página no navegador do celular ou use o cadastro por e-mail aqui mesmo.';

// Mensagem amigável para os erros mais comuns do "Entrar com Google"
export function erroDoGoogle(err) {
  const c = (err && err.code) || '';
  if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return 'A janela do Google foi fechada antes de terminar. Tente de novo.';
  if (c === 'auth/popup-blocked') return 'O navegador bloqueou a janela do Google. Libere as janelas pop-up deste site e tente de novo.';
  if (c === 'auth/network-request-failed') return 'Sem conexão com o Google agora. Confira a internet e tente de novo.';
  if (c === 'auth/operation-not-supported-in-this-environment' || c === 'auth/web-storage-unsupported') return MSG_GOOGLE_INTERNO;
  if (c === 'auth/account-exists-with-different-credential') return 'Esse e-mail já tem conta com senha. Entre com e-mail e senha.';
  return 'Não consegui entrar com o Google agora. Tente de novo ou use e-mail e senha.';
}

export default function AvisoNavegadorInterno({ app }) {
  const [copiado, setCopiado] = useState(false);
  const [android, setAndroid] = useState(false);
  useEffect(() => { setAndroid(/Android/i.test(navigator.userAgent || '')); }, []);
  if (!app) return null;
  const abrirFora = () => {
    const l = window.location;
    if (android) {
      window.location.href = 'intent://' + l.host + l.pathname + l.search + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(l.href) + ';end';
    } else {
      window.open(l.href, '_blank');
    }
  };
  const copiar = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopiado(true); setTimeout(() => setCopiado(false), 2500); } catch { /* sem área de transferência */ }
  };
  const nome = app === 'app' ? 'do aplicativo' : 'do ' + app;
  return (
    <div role="note" style={{ background: 'rgba(197,160,89,.12)', border: '1px solid rgba(197,160,89,.45)', borderRadius: 12, padding: '12px 14px', margin: '0 0 16px', fontSize: 13.5, lineHeight: 1.5, color: '#E8EFF8', textAlign: 'left' }}>
      <b style={{ color: '#E2C27F', display: 'block', marginBottom: 2 }}>{'Você está no navegador ' + nome + '.'}</b>
      <span>{android ? 'O cadastro por e-mail funciona aqui. Para entrar com Google, abra no navegador do celular.' : 'O cadastro por e-mail funciona aqui. Para entrar com Google, toque em ⋯ no canto da tela e escolha “Abrir no navegador”.'}</span>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {android && <button type="button" onClick={abrirFora} style={{ background: '#C5A059', color: '#0B1220', border: 0, borderRadius: 8, padding: '8px 12px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Abrir no Chrome</button>}
        <button type="button" onClick={copiar} style={{ background: 'transparent', color: '#E2C27F', border: '1px solid rgba(197,160,89,.6)', borderRadius: 8, padding: '8px 12px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{copiado ? 'Link copiado ✓' : 'Copiar link'}</button>
      </div>
    </div>
  );
}
