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
