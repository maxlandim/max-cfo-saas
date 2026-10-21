/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cada publicação gera uma versão nova dos scripts do painel (quebra o cache do navegador só quando muda)
  env: {
    NEXT_PUBLIC_BUILD_ID: (process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now())).slice(0, 10),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // O Firebase Admin roda só no servidor e não deve ser empacotado
    serverComponentsExternalPackages: ['firebase-admin'],
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
