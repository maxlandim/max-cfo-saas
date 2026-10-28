'use client';

import { useEffect, useState } from 'react';

// Quem toca num anúncio ou link do Instagram, Facebook, LinkedIn ou TikTok abre o site dentro do app,
// num navegador embutido. Ali o Google bloqueia o login ("Entrar com Google"). O cadastro por e-mail funciona normalmente.
// Ao tocar em "Entrar com Google" dentro do app, a mesma página é aberta direto no navegador do celular, sem aviso na tela.
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

// Abre a página atual no navegador do celular: Chrome no Android, Safari no iPhone.
// Devolve uma mensagem curta só quando não dá para abrir sozinho (iPhone em app que bloqueia), para mostrar depois do toque.
export function abrirNoNavegador(aoFalhar) {
  const l = window.location;
  const android = /Android/i.test(navigator.userAgent || '');
  const destino = android
    ? 'intent://' + l.host + l.pathname + l.search + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(l.href) + ';end'
    : 'x-safari-https://' + l.host + l.pathname + l.search;
  window.__ultimoDesvio = destino;
  window.location.href = destino;
  if (!android && aoFalhar) {
    // Se o app não deixou sair, a página continua visível: aí explica como abrir no Safari
    setTimeout(() => { if (document.visibilityState === 'visible') aoFalhar(MSG_SAFARI); }, 1500);
  }
}

export const MSG_SAFARI = 'Para entrar com o Google, abra esta página no Safari: toque em ⋯ no canto da tela e escolha “Abrir no navegador”. Ou use o cadastro por e-mail aqui mesmo.';

// Mensagem amigável para os erros mais comuns do "Entrar com Google"
export function erroDoGoogle(err) {
  const c = (err && err.code) || '';
  if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return 'A janela do Google foi fechada antes de terminar. Tente de novo.';
  if (c === 'auth/popup-blocked') return 'O navegador bloqueou a janela do Google. Libere as janelas pop-up deste site e tente de novo.';
  if (c === 'auth/network-request-failed') return 'Sem conexão com o Google agora. Confira a internet e tente de novo.';
  if (c === 'auth/account-exists-with-different-credential') return 'Esse e-mail já tem conta com senha. Entre com e-mail e senha.';
  return 'Não consegui entrar com o Google agora. Tente de novo ou use e-mail e senha.';
}
