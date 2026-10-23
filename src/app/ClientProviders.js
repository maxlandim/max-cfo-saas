'use client';

import { AuthProvider } from './context/AuthContext';
import Visitas from './components/Visitas';
import RegistroErros from './components/RegistroErros';

// O conteúdo da página é renderizado no servidor e aparece na hora;
// o login (Firebase) carrega em segundo plano dentro do AuthProvider.
export default function ClientProviders({ children }) {
  return <AuthProvider><Visitas /><RegistroErros />{children}</AuthProvider>;
}
