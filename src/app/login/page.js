'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, getAdditionalUserInfo } from 'firebase/auth';
import { registrarCadastro } from '../components/Visitas';
import { auth, googleProvider } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import SeletorIdioma from '../components/SeletorIdioma';
import AvisoNavegadorInterno, { useNavegadorInterno, erroDoGoogle, MSG_GOOGLE_INTERNO } from '../components/NavegadorInterno';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const appInterno = useNavegadorInterno();
  const router = useRouter();
  const { user } = useAuth();

  // Se já estiver logado, redireciona
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    try {
      if (!auth) throw new Error('firebase');
      const cred = await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem('maxcfo_user', JSON.stringify({ name: cred.user.displayName, email: cred.user.email }));
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

  const handleReset = async () => {
    setErrorMsg('');
    if (!email) { setErrorMsg('Digite seu e-mail acima para receber o link de nova senha.'); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      setErrorMsg('Enviamos um link para criar uma nova senha. Confira sua caixa de entrada e o spam.');
    } catch (err) {
      setErrorMsg('Não foi possível enviar o link agora. Confira o e-mail digitado.');
    }
  };

  const handleGoogleLogin = async () => {
    if (appInterno) { setErrorMsg(MSG_GOOGLE_INTERNO); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setLoading(true);
    setErrorMsg('');
    try {
      if (!auth) {
        throw new Error("As variáveis de ambiente do Firebase não foram carregadas.");
      }
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      localStorage.setItem('maxcfo_user', JSON.stringify({ name: user.displayName, email: user.email }));
      if (getAdditionalUserInfo(userCredential)?.isNewUser) registrarCadastro();
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setErrorMsg(erroDoGoogle(err));
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          <img src="/logo.svg" alt="" width="32" height="32" style={{ borderRadius: 8, display: "block" }} />
          <span style={{ fontSize: '20px', fontWeight: '800', color: '#fff' }}>Landim Advisory</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><SeletorIdioma escuro /></div>
        <h1 style={{ textAlign: 'center' }}>Bem-vindo de volta</h1>
        <p style={{ textAlign: 'center' }}>Acesse seu painel financeiro executivo</p>
        
        <AvisoNavegadorInterno app={appInterno} />

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
          <button type="button" onClick={handleReset} style={{ background: 'none', border: 0, color: 'var(--primary)', cursor: 'pointer', fontSize: '13px', padding: 0 }}>Esqueci minha senha</button>
        </div>
        <div className="auth-link">
          Não tem uma conta? <Link href="/register">Crie agora</Link>
        </div>
      </div>
    </div>
  );
}
