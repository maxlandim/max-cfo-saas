'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const { user } = useAuth();

  // Se já estiver logado, redireciona
  if (user) {
    router.push('/dashboard');
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setErrorMsg('E-mail ou senha incorretos.');
      } else {
        setErrorMsg('Erro ao tentar fazer login. Verifique sua conexão.');
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      if (!auth) {
        throw new Error("As variáveis de ambiente do Firebase não foram carregadas.");
      }
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      localStorage.setItem('maxcfo_user', JSON.stringify({ name: user.displayName, email: user.email }));
      
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setErrorMsg(`Erro: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          <div style={{ background: '#C5A059', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#0B1220' }}>⚡</div>
          <span style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>MAX CFO AI</span>
        </div>
        <h1 style={{ textAlign: 'center' }}>Bem-vindo de volta</h1>
        <p style={{ textAlign: 'center' }}>Acesse seu painel financeiro executivo</p>
        
        {errorMsg && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center', border: '1px solid rgba(239,68,68,0.3)' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>E-mail</label>
            <input type="email" className="form-input" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com" />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" className="form-input" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #C5A059, #A0823A)', color: '#0B1220' }} disabled={loading}>
            {loading ? 'Processando...' : 'Entrar na Plataforma'}
          </button>
        </form>

        <div className="auth-divider">ou</div>
        
        <button type="button" className="btn-google" onClick={handleGoogleLogin} disabled={loading}>
          <span style={{ marginRight: '8px' }}>G</span> Entrar com Google
        </button>

        <div className="auth-link">
          Não tem uma conta? <Link href="/register">Crie agora</Link>
        </div>
      </div>
    </div>
  );
}
