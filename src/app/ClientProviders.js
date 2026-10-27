'use client';

import { AuthProvider } from './context/AuthContext';
import Visitas from './components/Visitas';
import RegistroErros from './components/RegistroErros';
import { useEffect } from 'react';

// O conteúdo da página é renderizado no servidor e aparece na hora;
// o login (Firebase) carrega em segundo plano dentro do AuthProvider.
export default function ClientProviders({ children }) {
  // a tradução só mexe na página depois que o React terminou de montar (evita conflito na hidratação)
  useEffect(() => { if (window.laIdioma) window.laIdioma.hidratou(); }, []);
  return <AuthProvider><Visitas /><RegistroErros />{children}</AuthProvider>;
}
