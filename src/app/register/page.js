'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Redirect to pricing is handled in handleRegister

  const handleRegister = async (e) => {
    e.preventDefault();
    if (email && password && name) {
      setLoading(true);
      setErrorMsg('');
      
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });
        localStorage.setItem('maxcfo_user', JSON.stringify({ name, email }));
        
        router.push('/pricing');
      } catch (err) {
        console.error(err);
        if (err.code === 'auth/email-already-in-use') {
          setErrorMsg('Este e-mail já está em uso.');
        } else if (err.code === 'auth/weak-password') {
          setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
        } else {
          setErrorMsg('Erro ao tentar criar conta. Verifique os dados.');
        }
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      if (!auth) {
        throw new Error("O Firebase não foi inicializado corretamente. Verifique as chaves (API Keys) na Vercel.");
      }
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      localStorage.setItem('maxcfo_user', JSON.stringify({ name: user.displayName, email: user.email }));
      
      router.push('/pricing');
    } catch (err) {
      console.error("Erro completo do Google Login:", err);
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
        <h1 style={{ textAlign: 'center' }}>Comece Grátis</h1>
        <p style={{ textAlign: 'center' }}>Crie sua conta e tenha um CFO Virtual</p>

        {errorMsg && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center', border: '1px solid rgba(239,68,68,0.3)' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Nome Completo</label>
            <input type="text" className="form-input" required value={name} onChange={e => setName(e.target.value)} placeholder="Seu Nome" />
          </div>
          <div className="form-group">
            <label>E-mail Profissional</label>
            <input type="email" className="form-input" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com" />
          </div>
          <div className="form-group">
            <label>Crie uma Senha</label>
            <input type="password" className="form-input" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6} />
          </div>
          <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #C5A059, #A0823A)', color: '#0B1220' }} disabled={loading}>
            {loading ? 'Redirecionando...' : 'Criar Conta (7 dias grátis)'}
          </button>
        </form>

        <div className="auth-divider">ou</div>
        
        <button type="button" className="btn-google" onClick={handleGoogleLogin} disabled={loading}>
          <span style={{ marginRight: '8px' }}>G</span> Cadastrar com Google
        </button>

        <div className="auth-link">
          Já tem uma conta? <Link href="/login">Faça Login</Link>
        </div>
      </div>
    </div>
  );
}
