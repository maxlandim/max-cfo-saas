// Política de segurança de conteúdo (CSP): o navegador só carrega scripts, estilos, conexões e janelas
// dos endereços abaixo. Se um script de outro site for injetado (XSS), ele não roda nem consegue enviar dados para fora.
// Para usar um serviço novo no navegador, inclua o endereço aqui. As violações são contadas em /api/csp.
const CSP = [
  "default-src 'self'",
  // 'unsafe-inline': o Next.js e o painel usam scripts e onclick no próprio HTML; 'wasm-unsafe-eval': leitor de documentos (OCR)
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://apis.google.com https://www.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  // Firebase (login e banco), consultas de CNPJ e CEP, bibliotecas do leitor de PDF e OCR
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://brasilapi.com.br https://minhareceita.org https://viacep.com.br https://max-cfo-api.onrender.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://tessdata.projectnaptha.com",
  "worker-src 'self' blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
  // Login com Google (janela e iframe do Firebase Auth)
  "frame-src 'self' https://max-cfo-saas.firebaseapp.com https://accounts.google.com https://apis.google.com",
  "media-src 'self' blob: data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  'upgrade-insecure-requests',
  'report-uri /api/csp',
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Gera um servidor enxuto em .next/standalone, usado pela imagem Docker do servidor próprio
  output: 'standalone',
  // Cada publicação gera uma versão nova dos scripts do painel (quebra o cache do navegador só quando muda)
  env: {
    NEXT_PUBLIC_BUILD_ID: (process.env.VERCEL_GIT_COMMIT_SHA || process.env.SOURCE_COMMIT || String(Date.now())).slice(0, 10),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // O Firebase Admin roda só no servidor e não deve ser empacotado
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  // Login com Google pelo próprio domínio: a janela do Google abre em landimadvisory.com.br/__/auth/...
  // e não em max-cfo-saas.firebaseapp.com. Só passa a valer quando NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  // aponta para o domínio do site (veja LANCAMENTO.md, seção Firebase).
  async rewrites() {
    return [
      { source: '/__/auth/:path*', destination: 'https://max-cfo-saas.firebaseapp.com/__/auth/:path*' },
      { source: '/__/firebase/:path*', destination: 'https://max-cfo-saas.firebaseapp.com/__/firebase/:path*' },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: CSP },
          // Câmera e microfone só para o próprio site (leitura de documentos e comando de voz); o resto, bloqueado
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        ],
      },
      // Scripts do painel são pedidos com ?v=<versão>; podem ficar guardados no navegador
      ...['/engine.js', '/app.js', '/modules/:arquivo*', '/vendor/:arquivo*'].map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      })),
    ];
  },
};

export default nextConfig;
