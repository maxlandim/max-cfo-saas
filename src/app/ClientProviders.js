'use client';

import dynamic from 'next/dynamic';

// Dynamically import AuthProvider with SSR disabled
// This prevents Firebase SDK from ever loading on the server
const AuthProvider = dynamic(
  () => import('./context/AuthContext').then(mod => {
    // Return a component that wraps children with the provider
    const Provider = mod.AuthProvider;
    return function AuthWrapper({ children }) {
      return <Provider>{children}</Provider>;
    };
  }),
  { ssr: false }
);

export default function ClientProviders({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
