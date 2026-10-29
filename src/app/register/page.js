'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { registrarCadastro, registrarFunil } from '../components/Visitas';
import { EMPRESA } from '../../lib/empresa';
import { auth, googleProvider } from '../lib/firebase';
import SeletorIdioma from '../components/SeletorIdioma';
import { useNavegadorInterno, erroDoGoogle, abrirNoNavegador } from '../components/NavegadorInterno';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const appInterno = useNavegadorInterno();

  // Redirect to pricing is handled in handleRegister

  const handleRegister = async (e) => {
    e.preventDefault();
    registrarFunil('enviou');
    if (email && password && name) {
      setLoading(true);
      setErrorMsg('');
      
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });
        localStorage.setItem('maxcfo_user', JSON.stringify({ name, email }));
        registrarCadastro();
        
        router.push('/dashboard');
      } catch (err) {
        console.error(err);
        registrarFunil('erro', err.code || 'outro');
        if (err.code === 'auth/email-already-in-use') {
          setErrorMsg('Este e-mail já está em uso.');
        } else if (err.code === 'auth/weak-password') {
          setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
        } else if (err.code === 'auth/invalid-email') {
          setErrorMsg('Confira o e-mail digitado.');
        } else if (err.code === 'auth/network-request-failed') {
          setErrorMsg('Sem conexão agora. Confira a internet e tente de novo.');
        } else if (err.code === 'auth/too-many-requests') {
          setErrorMsg('Muitas tentativas seguidas. Espere alguns minutos e tente de novo.');
        } else {
          setErrorMsg('Erro ao tentar criar conta. Verifique os dados.');
        }
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    // Dentro do Instagram/Facebook o Google bloqueia o login: abre a mesma página no Chrome (ou Safari)
    registrarFunil('google');
    if (appInterno) { registrarFunil('erro', 'navegador-do-app'); setErrorMsg(''); abrirNoNavegador((m) => setErrorMsg(m)); return; }
    setLoading(true);
    setErrorMsg('');
    try {
      if (!auth) {
        throw new Error("O Firebase não foi inicializado corretamente. Verifique as chaves (API Keys) na Vercel.");
      }
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      localStorage.setItem('maxcfo_user', JSON.stringify({ name: user.displayName, email: user.email }));
      if (getAdditionalUserInfo(userCredential)?.isNewUser) registrarCadastro();
      
      router.push('/dashboard');
    } catch (err) {
      console.error("Erro completo do Google Login:", err);
      registrarFunil('erro', err.code || 'outro');
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
        <h1 style={{ textAlign: 'center' }}>Comece Grátis</h1>
        <p style={{ textAlign: 'center' }}>Crie sua conta em 1 minuto e organize o financeiro da sua empresa</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'grid', gap: 8, fontSize: 14, color: '#C9D1DE' }}>
          <li>✓ Veja no celular quanto tem, quanto vai receber e quanto vai pagar</li>
          <li>✓ Cobre clientes por Pix e WhatsApp e receba o relatório do mês pronto</li>
          <li>✓ 7 dias grátis, sem cartão. Cancele quando quiser</li>
        </ul>

        {errorMsg && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center', border: '1px solid rgba(239,68,68,0.3)' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} onFocus={() => registrarFunil('preencheu')}>
          <div className="form-group">
            <label>Seu nome</label>
            <input type="text" className="form-input" required value={name} onChange={e => setName(e.target.value)} placeholder="Seu Nome" />
          </div>
          <div className="form-group">
            <label>E-mail</label>
            <input type="email" className="form-input" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com" />
          </div>
          <div className="form-group">
            <label>Crie uma Senha</label>
            <input type="password" className="form-input" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6} />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 12px', lineHeight: 1.5 }}>
            Ao criar a conta você concorda com os <a href="/termos" style={{ color: 'var(--primary)' }}>Termos de Uso</a> e a <a href="/privacidade" style={{ color: 'var(--primary)' }}>Política de Privacidade</a>. Você tem 7 dias grátis, sem cartão.
          </p>
          <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #C5A059, #A0823A)', color: '#0B1220' }} disabled={loading}>
            {loading ? 'Redirecionando...' : 'Criar Conta (7 dias grátis)'}
          </button>
        </form>

        <div className="auth-divider">ou</div>
        
        <button type="button" className="btn-google" onClick={handleGoogleLogin} disabled={loading}>
          <span style={{ marginRight: '8px' }}>G</span> Cadastrar com Google
        </button>

        <a href={'https://wa.me/' + EMPRESA.whatsapp.replace(/\D/g, '').replace(/^(?!55)/, '55') + '?text=' + encodeURIComponent('Olá! Quero conhecer o sistema da Landim Advisory.')} target="_blank" rel="noopener" onClick={() => registrarFunil('whatsapp')}
          style={{ display: 'block', textAlign: 'center', marginTop: 12, padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(37,211,102,.45)', color: '#4ADE80', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
          Prefiro falar no WhatsApp
        </a>

        <div className="auth-link">
          Já tem uma conta? <Link href="/login">Faça Login</Link>
        </div>
      </div>
    </div>
  );
}
