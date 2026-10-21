'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({ user: null, loading: true, logout: async () => {} });

// O Firebase só é baixado no navegador, depois que a página já apareceu.
// Assim a página inicial, preços e login abrem na hora, sem esperar o SDK.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubscribe = null, vivo = true;
    Promise.all([import('../../lib/firebase'), import('firebase/auth')])
      .then(([fb, fa]) => {
        if (!vivo) return;
        if (!fb.auth) { setLoading(false); return; }
        unsubscribe = fa.onAuthStateChanged(fb.auth, (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        });
      })
      .catch((e) => { console.error('Erro ao carregar o login:', e); if (vivo) setLoading(false); });
    return () => { vivo = false; if (unsubscribe) unsubscribe(); };
  }, []);

  const logout = async () => {
    const [fb, fa] = await Promise.all([import('../../lib/firebase'), import('firebase/auth')]);
    await fa.signOut(fb.auth);
    try {
      localStorage.removeItem('maxcfo_user');
      // cópias locais dos dados das empresas não ficam no aparelho depois de sair
      Object.keys(localStorage).filter((k) => k.startsWith('maxcfo_copia_') || k.startsWith('maxcfo_acesso_')).forEach((k) => localStorage.removeItem(k));
    } catch {}
    // o tema do painel não vale para as páginas de fora
    try { const r = document.documentElement; delete r.dataset.tema; ['--bg', '--bg-surf', '--bg-card'].forEach((k) => r.style.removeProperty(k)); } catch {}
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook customizado para usar a Auth facilmente
export const useAuth = () => useContext(AuthContext);
