'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { app, db, authFetch } from '../../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore/lite';
import { lerDadosDoEspaco, gravarDadosDoEspaco, apagarPartesDoEspaco } from '../../lib/espaco';
import { estadoDemo, USUARIO_DEMO } from '../../lib/demo';
import { mesclarEstados, mesmoEstado } from '../../lib/mesclar';
import { limiteDeEmpresas, EMPRESA_EXTRA, empresasIncluidas } from '../../lib/plans';
import { sendEmailVerification } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';

// Campos do estado do painel que não devem ir para a nuvem (são temporários da tela)
const CAMPOS_TEMPORARIOS = ['currentModal', 'isListening', 'voiceRec', 'txFilter', 'txSort', 'notifSeen'];

// Versão dos scripts do painel: muda a cada publicação, então o navegador pode guardá-los em cache sem medo
const VERSAO = 'v=' + (process.env.NEXT_PUBLIC_BUILD_ID || '9');
const SCRIPTS = ['/engine.js', ...['financeiro', 'empresas', 'operacao', 'gestao', 'accountant', 'nfe', 'team', 'relatorio', 'importar', 'leitor', 'cfo-local', 'estoque-nota', 'validade', 'equipe', 'acessos', 'cobranca', 'tutorial', 'layout'].map((m) => `/modules/${m}.js`), '/app.js'].map((s) => `${s}?${VERSAO}`);
const CACHE_ACESSO_MS = 12 * 3600 * 1000; // a verificação da assinatura é refeita em segundo plano

// Nenhuma etapa de rede pode travar a abertura: depois do prazo, desiste e segue com o plano B
function comPrazo(promessa, ms) {
  return Promise.race([promessa, new Promise((_, rej) => setTimeout(() => rej(new Error('tempo esgotado')), ms))]);
}
// Cópia dos dados da empresa neste aparelho: abre mesmo com a nuvem lenta e não perde nada offline
function lerCopia(wsId) { try { return JSON.parse(localStorage.getItem('maxcfo_copia_' + wsId) || 'null'); } catch { return null; } }
function gravarCopia(wsId, c) { try { localStorage.setItem('maxcfo_copia_' + wsId, JSON.stringify(c)); } catch {} }

function lerCache(chave) { try { const v = JSON.parse(localStorage.getItem(chave) || 'null'); return v && Date.now() - v.t < CACHE_ACESSO_MS ? v.dados : null; } catch { return null; } }
function gravarCache(chave, dados) { try { localStorage.setItem(chave, JSON.stringify({ t: Date.now(), dados })); } catch {} }

// Nível do plano para liberar as telas: 1 Básico, 2 Intermediário, 3 Completo, 4 Escritório (teste grátis usa tudo)
const NIVEIS = { basic: 1, intermediate: 2, complete: 3, unlimited: 4 };
function nivelPlano(a) {
  // quem assinou durante o teste grátis (status "trialing") continua com tudo liberado até o teste acabar
  const nivel = a && a.motivo === 'assinatura' && a.status !== 'trialing' ? (NIVEIS[a.plano] || 1) : 4;
  return { nivel, plano: (a && a.plano) || null, motivo: (a && a.motivo) || '' };
}

function limparEstado(estado) {
  const copia = {};
  for (const k of Object.keys(estado || {})) {
    if (!CAMPOS_TEMPORARIOS.includes(k) && typeof estado[k] !== 'function') copia[k] = estado[k];
  }
  return copia;
}

export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  // Demonstração: /dashboard?demo=1 sem login abre uma empresa fictícia; nada é gravado
  const [demo] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1');
  const emDemo = demo && !auth.loading && !auth.user;
  const user = emDemo ? USUARIO_DEMO : auth.user;
  const loading = auth.loading;
  const logout = emDemo ? async () => { window.location.href = '/register?origem=demo'; } : auth.logout;
  const [acesso, setAcesso] = useState(null); // resposta de /api/subscription
  const [pronto, setPronto] = useState(false);
  const [etapa, setEtapa] = useState('');
  const [segundos, setSegundos] = useState(0);
  const [erroNuvem, setErroNuvem] = useState(false);
  const [convites, setConvites] = useState(null); // empresas que outras pessoas compartilharam com este e-mail (somente leitura)
  const iniciado = useRef(false);
  const leituras = useRef(null); // leituras do Firestore iniciadas junto com o login
  const raiz = useRef(null);

  // 0) Começa a baixar os scripts do painel enquanto o login e a assinatura são conferidos
  useEffect(() => {
    for (const src of SCRIPTS) {
      if (document.querySelector(`link[href="${src}"]`)) continue;
      const l = document.createElement('link'); l.rel = 'preload'; l.as = 'script'; l.href = src; document.head.appendChild(l);
    }
  }, []);

  // Relógio da tela de carregamento (mostra há quanto tempo está abrindo)
  useEffect(() => {
    if (pronto) return;
    const t0 = Date.now(), id = setInterval(() => setSegundos(Math.round((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [pronto]);

  // 1) Sem login, volta para a tela de entrada
  useEffect(() => {
    if (!loading && !user && !demo) router.replace('/login');
  }, [loading, user, router]);

  // 2) Verifica a assinatura no servidor. Quem já entrou antes abre na hora com a última resposta,
  //    e a verificação roda em paralelo: se o acesso tiver acabado, o painel é bloqueado.
  useEffect(() => {
    if (!user) return;
    if (user === USUARIO_DEMO) {
      window.maxcfoDemo = true;
      leituras.current = { perfil: Promise.resolve(null), wsId: 'demonstracao', espaco: Promise.resolve(null), convites: Promise.resolve([]) };
      setConvites([]);
      setAcesso({ acesso: true, motivo: 'demo', plano: 'unlimited' });
      return;
    }
    let vivo = true;
    const chave = 'maxcfo_acesso_' + user.uid;
    const anterior = lerCache(chave);
    if (anterior && anterior.acesso) setAcesso(anterior);

    // Leituras do Firestore já começam aqui, sem esperar a assinatura
    if (!leituras.current) {
      let ativa = '';
      try { ativa = localStorage.getItem('maxcfo_empresa_' + user.uid) || ''; } catch {}
      const wsId = ativa ? `${user.uid}__${ativa}` : user.uid;
      leituras.current = {
        perfil: getDoc(doc(db, 'perfis', user.uid)).catch((e) => { console.warn('Não foi possível ler a lista de empresas:', e); return null; }),
        wsId,
        espaco: getDoc(doc(db, 'workspaces', wsId)).catch(() => null),
        convites: (user.email
          ? comPrazo(getDocs(collection(db, 'convites', user.email.toLowerCase(), 'espacos')), 8000).then((q) => q.docs.map((d) => ({ wsId: d.id, ...d.data() })))
          : Promise.resolve([])).catch(() => []),
      };
      leituras.current.convites.then((lista) => setConvites(lista || []));
    }

    (async () => {
      try {
        const r = await comPrazo(authFetch('/api/subscription'), 12000);
        const dados = await r.json();
        if (!vivo) return;
        if (r.ok) {
          gravarCache(chave, dados);
          if (!anterior || !dados.acesso || anterior.motivo !== dados.motivo || anterior.plano !== dados.plano || anterior.diasRestantes !== dados.diasRestantes || anterior.diasParaVencer !== dados.diasParaVencer || JSON.stringify(anterior.faturaPendente || null) !== JSON.stringify(dados.faturaPendente || null) || anterior.status !== dados.status) setAcesso(dados);
        } else if (!anterior) setAcesso({ acesso: false, motivo: 'erro', erro: dados.error });
      } catch (e) {
        // Servidor lento ou fora: abre o painel e confere de novo em seguida (bloqueia se o acesso tiver acabado)
        if (!vivo) return;
        console.warn('Verificação de acesso:', e.message);
        if (!anterior) setAcesso({ acesso: true, motivo: 'verificando' });
        setTimeout(async () => {
          try { const r2 = await authFetch('/api/subscription'); const d2 = await r2.json(); if (vivo && r2.ok) { gravarCache(chave, d2); setAcesso(d2); } } catch {}
        }, 20000);
      }
    })();
    return () => { vivo = false; };
  }, [user]);

  // 3) Liga o painel quando o acesso está liberado
  useEffect(() => {
    // Sem assinatura própria, ainda abre se alguém compartilhou uma empresa com este e-mail (somente leitura)
    if (!user || !acesso || iniciado.current) return;
    if (!acesso.acesso && !(convites && convites.length)) return;
    iniciado.current = true;
    if (raiz.current && !raiz.current.firstChild) raiz.current.innerHTML = PAINEL_HTML;
    // aplica o tema salvo neste aparelho antes de mostrar o painel (evita piscar)
    try { const t = localStorage.getItem('maxcfo_tema'); const claro = t === 'claro' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches); document.documentElement.dataset.tema = claro ? 'claro' : 'escuro'; } catch {}

    const emailLegado = (user.email || '').toLowerCase();
    window.maxcfoUser = { uid: user.uid, name: user.displayName || '', email: user.email || '' };
    // Módulos antigos (equipe, auditoria) leem o usuário daqui
    try { localStorage.setItem('maxcfo_user', JSON.stringify({ name: user.displayName || '', email: user.email || '' })); } catch {}
    window.getAuthToken = () => user.getIdToken();
    window.maxcfoSair = async () => { await salvarAgora(); await logout(); };
    const nomesPlano = { basic: 'Plano Básico', intermediate: 'Plano Intermediário', complete: 'Plano Completo', unlimited: 'Plano Escritório' };
    window.maxcfoPlano = nivelPlano(acesso);
    window.maxcfoAdmin = acesso.motivo === 'admin';
    window.maxcfoPlanoTexto = acesso.motivo === 'teste' ? `Teste grátis · ${acesso.diasRestantes} ${acesso.diasRestantes === 1 ? 'dia' : 'dias'}`
      : acesso.motivo === 'admin' ? 'Administrador'
      : acesso.motivo === 'assinatura' ? (nomesPlano[acesso.plano] || 'Assinante')
      : acesso.motivo === 'demo' ? 'Demonstração'
      : '';

    let timer = null, pendente = null, aviso = false, avisoNuvem = false;
    // Enquanto a nuvem não foi lida com sucesso, nada é enviado para ela (evita apagar dados com um painel vazio)
    let nuvemLida = false;
    let avisoLeitura = 0;
    const avisarLeitura = () => {
      if (Date.now() - avisoLeitura > 6000 && window.showToast) window.showToast('Acesso somente leitura: alterações não são salvas.', 'info');
      avisoLeitura = Date.now();
    };
    let avisoDemo = Date.now() + 5000; // não avisa no carregamento, só quando a pessoa mexer
    // Última versão lida ou gravada de cada empresa (base da mescla quando outra pessoa também altera)
    const base = {};
    const colaborativo = () => !!window.maxcfoEquipe || ((window.state && window.state.acessosLeitura) || []).some((a) => a && (a.papel === 'analista' || a.papel === 'gestor'));
    const trocarEstado = (novo) => {
      const s = window.state; if (!s) return;
      Object.keys(s).forEach((k) => { if (!CAMPOS_TEMPORARIOS.includes(k) && typeof s[k] !== 'function' && !(k in novo)) delete s[k]; });
      Object.assign(s, novo);
    };
    // Lê a nuvem; se mudou desde a base, mescla com o que está aqui e devolve o JSON mesclado (ou null se nada mudou)
    const mesclarComNuvem = async (wsId, local) => {
      const snap = await comPrazo(getDoc(doc(db, 'workspaces', wsId)), 15000);
      const quandoR = snap.exists() ? snap.data().updatedAt || '' : '';
      if (!quandoR || quandoR === base[wsId].quando) return null;
      const textoR = await comPrazo(lerDadosDoEspaco(db, wsId, snap), 30000);
      if (!textoR) return null;
      const remoto = JSON.parse(textoR);
      const { estado: m } = mesclarEstados(JSON.parse(base[wsId].json), local, remoto);
      trocarEstado(m);
      base[wsId] = { json: textoR, quando: quandoR };
      if (window.fin && window.fin.atualizarTudo) { try { window.fin.atualizarTudo(); } catch {} }
      if (window.showToast) window.showToast('Alterações feitas por outra pessoa da equipe foram juntadas às suas.', 'info');
      const json = JSON.stringify(limparEstado(window.state));
      return { json, temAlgoDaqui: !mesmoEstado(JSON.parse(json), remoto) };
    };
    // A cada 45 s, com a equipe trabalhando junto, traz o que os outros gravaram (sem esperar a próxima gravação daqui)
    const puxar = setInterval(async () => {
      const wsId = window.workspaceId;
      if (!wsId || !nuvemLida || pendente || !base[wsId] || !colaborativo() || document.hidden || window.maxcfoDemo) return;
      try {
        const m = await mesclarComNuvem(wsId, JSON.parse(JSON.stringify(limparEstado(window.state))));
        if (m && m.temAlgoDaqui) window.saveStateToFirebase(wsId, window.state); // havia algo aqui que ainda não estava lá
      } catch (e) { console.warn('Atualizar da nuvem:', e.message); }
    }, 45000);
    const gravar = async (wsId, estado) => {
      if (window.maxcfoDemo) {
        if (Date.now() - avisoDemo > 20000 && window.showToast) window.showToast('Na demonstração nada é salvo. Crie sua conta grátis para usar com os seus dados.', 'info');
        avisoDemo = Date.now();
        return;
      }
      if (window.maxcfoLeitura) return; // empresa de outra pessoa, aberta só para consulta
      let json = JSON.stringify(limparEstado(estado));
      const copia = lerCopia(wsId) || {};
      gravarCopia(wsId, { ...copia, t: Date.now(), pendente: true, dados: json });
      if (!nuvemLida) return;
      try {
        // Mais de uma pessoa nesta empresa: junta as alterações que chegaram da nuvem antes de gravar
        if (colaborativo() && base[wsId]) {
          const m = await mesclarComNuvem(wsId, JSON.parse(json));
          if (m) json = m.json;
        }
        const quando = new Date().toISOString();
        const dono = window.maxcfoEquipe ? window.maxcfoEquipe.dono : user.uid;
        // Grava comprimido (e em partes, se precisar): sem o limite de 1 MB por documento
        const r = await comPrazo(gravarDadosDoEspaco(db, wsId, json, dono, quando), 30000);
        base[wsId] = { json, quando };
        if (r && r.bytes > 7 * 1024 * 1024 && !aviso && window.showToast) {
          window.showToast('Esta empresa tem muitos dados. Exporte um backup em Configurações e fale com o suporte.', 'error');
          aviso = true;
        }
        const atual = lerCopia(wsId) || {};
        if (atual.dados === json) gravarCopia(wsId, { ...atual, pendente: false, nuvem: quando });
        avisoNuvem = false;
      } catch (e) {
        console.error('Erro ao salvar na nuvem:', e);
        if (e && (e.code === 'grande-demais' || e.code === 'permission-denied') && !aviso && window.showToast) {
          window.showToast(e.code === 'grande-demais' ? 'Esta empresa passou do limite de armazenamento. Exporte um backup em Configurações e fale com o suporte.' : 'A nuvem recusou a gravação. Publique as regras novas do Firestore (firestore.rules) ou fale com o suporte.', 'error');
          aviso = true; avisoNuvem = true;
        }
        if (!avisoNuvem && window.showToast) window.showToast('Sem conexão com a nuvem agora. Suas alterações ficam guardadas neste aparelho e sobem quando a conexão voltar.', 'error');
        avisoNuvem = true;
        clearTimeout(timer); timer = setTimeout(() => { if (window.state) gravar(wsId, window.state); }, 30000);
      }
    };
    // Junta várias alterações seguidas numa gravação só
    window.saveStateToFirebase = (wsId, estado) => {
      if (!wsId) return;
      if (window.maxcfoLeitura) { avisarLeitura(); return; }
      pendente = estado;
      clearTimeout(timer);
      timer = setTimeout(() => { const e = pendente; pendente = null; gravar(wsId, e); }, 1200);
    };
    const salvarAgora = () => { if (pendente) { clearTimeout(timer); const e = pendente; pendente = null; return gravar(window.workspaceId, e); } return Promise.resolve(); };
    window.addEventListener('pagehide', salvarAgora);

    // Lê a nuvem (com prazo). Se a cópia do aparelho tiver alterações que ainda não subiram, ela vale.
    const lerNuvem = async (wsId, pre) => {
      const snap = (pre && await comPrazo(pre, 15000)) || await comPrazo(getDoc(doc(db, 'workspaces', wsId)), 15000);
      const texto = await comPrazo(lerDadosDoEspaco(db, wsId, snap), 30000);
      if (texto) return { dados: texto, quando: snap.data().updatedAt || '' };
      if (emailLegado && wsId === user.uid) {
        // Migração: versões antigas guardavam os dados com o e-mail como identificador (só na empresa principal)
        const antigo = await comPrazo(getDoc(doc(db, 'workspaces', emailLegado)), 10000).catch(() => null);
        if (antigo && antigo.exists() && antigo.data().data) return { dados: antigo.data().data, quando: '', migrar: true };
      }
      return { dados: null, quando: '' };
    };
    window.loadStateFromFirebase = async (wsId) => {
      if (window.maxcfoDemo) return estadoDemo();
      if (!wsId) return null;
      setEtapa('Lendo os dados da empresa…');
      const pre = leituras.current && leituras.current.wsId === wsId ? leituras.current.espaco : null;
      if (leituras.current) leituras.current.espaco = null; // a leitura antecipada vale só uma vez
      const copia = lerCopia(wsId);
      try {
        const n = await lerNuvem(wsId, pre);
        nuvemLida = true;
        if (copia && copia.pendente && copia.dados && (!n.quando || !copia.nuvem || n.quando <= copia.nuvem)) {
          // alterações feitas sem internet neste aparelho: sobem agora
          setTimeout(() => gravar(wsId, JSON.parse(copia.dados)), 1500);
          return JSON.parse(copia.dados);
        }
        if (n.dados) {
          base[wsId] = { json: n.dados, quando: n.quando };
          gravarCopia(wsId, { t: Date.now(), pendente: false, nuvem: n.quando, dados: n.dados });
          const dados = JSON.parse(n.dados);
          if (n.migrar) setTimeout(() => gravar(wsId, dados), 1500);
          return dados;
        }
        return null; // empresa nova, sem dados ainda
      } catch (e) {
        console.error('Erro ao carregar da nuvem:', e);
        if (copia && copia.dados) {
          // Abre com a cópia do aparelho e tenta a nuvem de novo em segundo plano
          setTimeout(async function tentar() {
            try {
              const n = await lerNuvem(wsId, null);
              const atual = lerCopia(wsId) || {};
              if (n.quando && atual.nuvem && n.quando > atual.nuvem) {
                if (window.showToast) window.showToast('Há dados mais novos na nuvem (de outro aparelho). Recarregando…', 'info');
                gravarCopia(wsId, { t: Date.now(), pendente: false, nuvem: n.quando, dados: n.dados });
                setTimeout(() => window.location.reload(), 1500);
                return;
              }
              nuvemLida = true;
              if (atual.pendente && window.state) gravar(wsId, window.state);
            } catch { setTimeout(tentar, 30000); }
          }, 15000);
          if (window.showToast) setTimeout(() => window.showToast('A nuvem está lenta: abrimos a cópia salva neste aparelho. Ela será sincronizada sozinha.', 'info'), 800);
          return JSON.parse(copia.dados);
        }
        if (e && e.code === 'permission-denied') {
          // Regras do Firestore desatualizadas: abre (sem risco, a nuvem também recusa gravar) e avisa
          const semBanco = /has not been used|is disabled/i.test(String(e.message || ''));
          if (window.showToast) setTimeout(() => window.showToast(semBanco
            ? 'O banco de dados na nuvem (Firestore) ainda não foi criado no Firebase. Seus dados ficam só neste aparelho até ele ser ativado.'
            : 'O banco de dados recusou o acesso. Publique as regras do Firestore (firestore.rules) no console do Firebase.', 'error'), 800);
          return null;
        }
        setErroNuvem(true);
        return null;
      }
    };

    window.uploadFileToFirebase = async (wsId, file) => {
      if (!wsId || !file || window.maxcfoLeitura) return null;
      if (file.size > 10 * 1024 * 1024) { if (window.showToast) window.showToast('O anexo precisa ter até 10 MB.', 'error'); return null; }
      try {
        const { getStorage, ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
        const fileRef = ref(getStorage(app), `workspaces/${wsId}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytesResumable(fileRef, file);
        return await getDownloadURL(snapshot.ref);
      } catch (e) {
        console.error('Erro ao enviar anexo:', e);
        return null;
      }
    };

    // Todos os scripts entram de uma vez (já baixados pelo preload) e rodam na ordem
    const carregarScripts = () => Promise.all(SCRIPTS.map((src) => new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => { console.error('Falha ao carregar', src); resolve(); };
      document.body.appendChild(script);
    })));

    // Empresas do mesmo login (BPO, grupo de empresas). A principal usa o uid; as demais, "<uid>__<id>".
    // Básico inclui 1 empresa e os demais planos 3; cada empresa a mais é cobrada à parte (EMPRESA_EXTRA por mês)
    const limiteEmpresas = acesso.motivo === 'assinatura' ? (acesso.status === 'trialing' ? Math.max(limiteDeEmpresas(acesso.plano, acesso.empresasExtras), 3) : limiteDeEmpresas(acesso.plano, acesso.empresasExtras))
      : acesso.motivo === 'teste' ? 3 : 9999; // admin e modo de configuração
    const chaveAtiva = 'maxcfo_empresa_' + user.uid;
    const perfilRef = doc(db, 'perfis', user.uid);
    const empresas = { lista: [], ativa: '', limite: limiteEmpresas, plano: acesso.plano || null, motivo: acesso.motivo,
      // quem tem assinatura ativa pode contratar empresas a mais direto no app
      podeContratar: acesso.motivo === 'assinatura' && Boolean(acesso.renovaEm), valorExtra: EMPRESA_EXTRA, incluidas: acesso.plano ? empresasIncluidas(acesso.plano) : 3, extras: Number(acesso.empresasExtras) || 0 };
    const novoIdEmpresa = () => Math.random().toString(36).slice(2, 10).replace(/[^a-z0-9]/g, 'x').padEnd(8, '0');
    const salvarPerfil = () => window.maxcfoDemo ? Promise.resolve() : setDoc(perfilRef, { empresas: empresas.lista, principal: empresas.principal || '', updatedAt: new Date().toISOString() }, { merge: true });
    empresas.espacoDe = (id) => (id ? `${user.uid}__${id}` : user.uid);
    const chaveCompart = 'maxcfo_compart_' + user.uid;
    empresas.trocar = async (id) => {
      await salvarAgora();
      try { if (id) localStorage.setItem(chaveAtiva, id); else localStorage.removeItem(chaveAtiva); localStorage.removeItem(chaveCompart); } catch {}
      window.location.reload();
    };
    const valorExtraTxt = 'R$ ' + (EMPRESA_EXTRA / 100).toFixed(2).replace('.', ',');
    empresas.criar = async (nome, cnpj, confirmado) => {
      if (1 + empresas.lista.length >= empresas.limite) { // a principal conta como uma
        if (!empresas.podeContratar) {
          return { erro: acesso.motivo === 'assinatura' || acesso.motivo === 'teste' ? `Você já tem ${empresas.limite} ${empresas.limite === 1 ? 'empresa' : 'empresas'}. Depois de assinar, cada empresa a mais custa ${valorExtraTxt} por mês.` : `Seu acesso permite ${empresas.limite} empresas.` };
        }
        if (!confirmado) return { confirmar: true, valor: valorExtraTxt };
        try {
          const r = await authFetch('/api/assinatura', { method: 'POST', body: JSON.stringify({ acao: 'empresas', modo: 'adicionar' }) });
          const d = await r.json().catch(() => ({}));
          if (!r.ok) return { erro: d.error || 'Não consegui incluir a empresa na assinatura.' };
          empresas.limite = d.limite; empresas.extras = d.extras;
          try { localStorage.removeItem('maxcfo_acesso_' + user.uid); } catch {}
        } catch { return { erro: 'Sem conexão. Tente de novo.' }; }
      }
      const item = { id: novoIdEmpresa(), nome: String(nome || '').trim().slice(0, 80) || 'Nova empresa', cnpj: String(cnpj || '').replace(/\D/g, '').slice(0, 14), criadaEm: new Date().toISOString() };
      empresas.lista.push(item);
      await salvarPerfil();
      // Cria o espaço já com o nome da empresa nas configurações
      await gravarDadosDoEspaco(db, empresas.espacoDe(item.id), JSON.stringify({ transactions: [], settings: { company: item.nome, cnpj: item.cnpj } }), user.uid, new Date().toISOString());
      return { item };
    };
    empresas.renomear = async (id, nome) => {
      if (!id) { empresas.principal = String(nome || '').slice(0, 80); await salvarPerfil(); return; }
      const e = empresas.lista.find((x) => x.id === id); if (!e) return;
      e.nome = String(nome || '').trim().slice(0, 80) || e.nome; await salvarPerfil();
    };
    empresas.remover = async (id) => {
      if (!id) return;
      empresas.lista = empresas.lista.filter((x) => x.id !== id);
      await salvarPerfil();
      try { await apagarPartesDoEspaco(db, empresas.espacoDe(id)); await deleteDoc(doc(db, 'workspaces', empresas.espacoDe(id))); } catch (e) { console.warn(e); }
      // empresa adicional excluída: a cobrança dela sai das próximas faturas
      if (empresas.podeContratar && empresas.extras > 0) {
        try {
          const r = await authFetch('/api/assinatura', { method: 'POST', body: JSON.stringify({ acao: 'empresas', modo: 'sincronizar' }) });
          const d = await r.json().catch(() => ({}));
          if (r.ok) { empresas.extras = d.extras; empresas.limite = d.limite; try { localStorage.removeItem('maxcfo_acesso_' + user.uid); } catch {} }
        } catch {}
      }
      if (empresas.ativa === id) await empresas.trocar('');
    };
    // Lê os dados de todas as empresas (painel do BPO)
    empresas.carregarTodas = async () => {
      if (window.maxcfoDemo) return [{ id: '', nome: 'Padaria Pão Dourado (demonstração)', estado: estadoDemo(), atualizadoEm: new Date().toISOString() }];
      const todas = [{ id: '', nome: empresas.principal || 'Empresa principal' }].concat(empresas.lista);
      return Promise.all(todas.map(async (e) => {
        try {
          const wsE = empresas.espacoDe(e.id);
          const snap = await comPrazo(getDoc(doc(db, 'workspaces', wsE)), 20000);
          const texto = await comPrazo(lerDadosDoEspaco(db, wsE, snap), 30000);
          return { ...e, estado: texto ? JSON.parse(texto) : { transactions: [] }, atualizadoEm: snap.exists() ? snap.data().updatedAt : null };
        } catch (err) { return { ...e, estado: { transactions: [] }, erro: true }; }
      }));
    };
    window.maxcfoEmpresas = empresas;

    // Acesso somente leitura para o cliente ou o contador: o dono grava convites/<e-mail>/espacos/<empresa>
    // e as regras do Firestore liberam a leitura dessa empresa para quem entrar com aquele e-mail (confirmado).
    const acessos = {
      compartilhadas: [], leitura: null, temAcessoProprio: !!acesso.acesso,
      emailVerificado: !!user.emailVerified, email: (user.email || '').toLowerCase(),
      convidar: async (email, empresa, papel) => {
        papel = ['leitura', 'analista', 'gestor'].includes(papel) ? papel : 'leitura';
        email = String(email || '').trim().toLowerCase();
        if (!/^[^\s@\/]+@[^\s@\/]+\.[^\s@\/]+$/.test(email)) return { erro: 'Informe um e-mail válido.' };
        if (email === acessos.email) return { erro: 'Este é o seu próprio e-mail.' };
        if (window.maxcfoLeitura || window.maxcfoEquipe) return { erro: 'Só o dono da empresa pode dar acessos.' };
        try {
          await comPrazo(setDoc(doc(db, 'convites', email, 'espacos', window.workspaceId), {
            dono: user.uid, donoNome: user.displayName || user.email || '', donoEmail: user.email || '',
            empresa: String(empresa || 'Empresa').slice(0, 80), papel, criadoEm: new Date().toISOString(),
          }), 15000);
          return { ok: true };
        } catch (e) {
          console.error('Convite:', e);
          return { erro: e && e.code === 'permission-denied' ? 'O banco recusou o convite. Publique as regras novas do Firestore (firestore.rules) no console do Firebase.' : 'Não consegui salvar o convite. Verifique a internet e tente de novo.' };
        }
      },
      revogar: async (email) => {
        try { await comPrazo(deleteDoc(doc(db, 'convites', String(email || '').toLowerCase(), 'espacos', window.workspaceId)), 15000); return { ok: true }; }
        catch (e) { console.error('Revogar:', e); return { erro: 'Não consegui remover o acesso agora. Tente de novo.' }; }
      },
      abrir: async (wsId) => { await salvarAgora(); try { localStorage.setItem(chaveCompart, wsId); } catch {} window.location.reload(); },
      voltar: async () => { try { localStorage.removeItem(chaveCompart); } catch {} window.location.reload(); },
      enviarVerificacao: async () => {
        try { await sendEmailVerification(user); return { ok: true }; }
        catch (e) { return { erro: e && e.code === 'auth/too-many-requests' ? 'Muitas tentativas. Aguarde alguns minutos.' : 'Não consegui enviar o e-mail agora.' }; }
      },
      jaVerifiquei: async () => {
        try { await user.reload(); await user.getIdToken(true); } catch {}
        if (user.emailVerified) { window.location.reload(); return { ok: true }; }
        return { erro: 'Ainda não aparece como confirmado. Abra o link do e-mail e tente de novo.' };
      },
    };
    window.maxcfoAcessos = acessos;

    (async () => {
      try {
        setEtapa('Lendo suas empresas…');
        const snap = (leituras.current && await comPrazo(leituras.current.perfil, 10000).catch(() => null)) || await comPrazo(getDoc(perfilRef), 10000);
        if (snap.exists()) { empresas.lista = Array.isArray(snap.data().empresas) ? snap.data().empresas : []; empresas.principal = snap.data().principal || ''; }
      } catch (e) { console.warn('Não foi possível ler a lista de empresas:', e); }
      let ativa = '';
      try { ativa = localStorage.getItem(chaveAtiva) || ''; } catch {}
      if (ativa && !empresas.lista.some((e) => e.id === ativa)) ativa = '';
      empresas.ativa = ativa;
      window.workspaceId = empresas.espacoDe(ativa);

      // Empresas compartilhadas com este e-mail
      try { acessos.compartilhadas = (await comPrazo(leituras.current.convites, 8000)) || []; } catch { acessos.compartilhadas = []; }
      let compart = '';
      try { compart = localStorage.getItem(chaveCompart) || ''; } catch {}
      if (!acesso.acesso && !acessos.compartilhadas.some((c) => c.wsId === compart)) compart = (acessos.compartilhadas[0] || {}).wsId || '';
      const alvo = acessos.compartilhadas.find((c) => c.wsId === compart);
      if (alvo && user.emailVerified && (alvo.papel === 'analista' || alvo.papel === 'gestor')) {
        // Equipe: trabalha na empresa de outra pessoa com permissão de lançar (veja equipe.js e firestore.rules)
        acessos.equipe = alvo; window.maxcfoEquipe = alvo; window.workspaceId = alvo.wsId;
        window.maxcfoPlano = { ...window.maxcfoPlano, nivel: Math.max(window.maxcfoPlano.nivel || 1, 3) };
      } else if (alvo && user.emailVerified) {
        acessos.leitura = alvo; window.maxcfoLeitura = alvo; window.workspaceId = alvo.wsId;
        window.maxcfoPlano = { ...window.maxcfoPlano, nivel: Math.max(window.maxcfoPlano.nivel || 1, 3) };
      } else if (!acesso.acesso) {
        // Só tem empresas compartilhadas, mas o e-mail ainda não foi confirmado: o painel pede a confirmação
        acessos.leitura = { wsId: '', empresa: (alvo || {}).empresa || 'Empresa compartilhada', donoNome: (alvo || {}).donoNome || '', pendente: true };
        window.maxcfoLeitura = acessos.leitura; window.workspaceId = '';
      }

      setEtapa('Carregando o sistema…');
      await carregarScripts();
      try { if (typeof window.initMaxCfoApp === 'function') await window.initMaxCfoApp(); }
      catch (e) { console.error('Erro ao iniciar o painel:', e); }
      setPronto(true);
      // Indicação: liga a conta nova a quem indicou (o código veio no link ?ref=)
      if (!window.maxcfoDemo) {
        let ref = '';
        try { ref = localStorage.getItem('la_ref') || ''; } catch {}
        if (ref) authFetch('/api/indicacao', { method: 'POST', body: JSON.stringify({ codigo: ref }) }).then((r) => { if (r.ok) { try { localStorage.removeItem('la_ref'); } catch {} } }).catch(() => {});
      }
    })();

    return () => { window.removeEventListener('pagehide', salvarAgora); clearInterval(puxar); };
  }, [user, acesso, convites]);

  useEffect(() => {
    if (!acesso?.acesso || !window.maxcfoEmpresas) return;
    const LIM = { basic: 1, intermediate: 3, complete: 10, unlimited: 30 };
    window.maxcfoEmpresas.limite = acesso.motivo === 'assinatura' ? (acesso.status === 'trialing' ? Math.max(LIM[acesso.plano] || 1, 3) : (LIM[acesso.plano] || 1)) : acesso.motivo === 'teste' ? 3 : 9999;
    window.maxcfoEmpresas.plano = acesso.plano || null; window.maxcfoEmpresas.motivo = acesso.motivo;
    const antes = window.maxcfoPlano && window.maxcfoPlano.nivel;
    window.maxcfoPlano = nivelPlano(acesso);
    if (window.maxcfoLeitura) window.maxcfoPlano.nivel = Math.max(window.maxcfoPlano.nivel, 3);
    if (antes !== window.maxcfoPlano.nivel && window.layout && window.layout.montarMenu) window.layout.montarMenu();
  }, [acesso]);

  const bloqueado = acesso && !acesso.acesso && !(convites && convites.length) && convites !== null;
  const carregando = !bloqueado && (loading || !user || !acesso || !pronto);

  return (
    <>
      {carregando && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg, #070B14)', zIndex: 99998, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', justifyContent: 'center', color: '#8899B0', fontFamily: 'var(--font-inter), sans-serif', fontSize: 14 }}>
          <style>{'@keyframes maxcfoGira{to{transform:rotate(360deg)}}'}</style>
          <img src="/logo.svg" alt="" width="54" height="54" style={{ borderRadius: 14 }} />
          <div style={{ width: 26, height: 26, border: '3px solid rgba(197,160,89,.25)', borderTopColor: '#C5A059', borderRadius: '50%', animation: 'maxcfoGira .8s linear infinite' }} />
          <span>{!user ? 'Entrando…' : !acesso ? 'Conferindo sua conta…' : (etapa || 'Abrindo seu painel…')}{segundos >= 4 ? ` ${segundos}s` : ''}</span>
          {segundos >= 20 && (
            <div style={{ textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>
              <div>Está demorando mais que o normal. Verifique a internet; antivírus ou rede da empresa podem bloquear a conexão.</div>
              <button onClick={() => window.location.reload()} style={{ marginTop: 12, padding: '10px 22px', background: '#C5A059', color: '#0B1220', fontWeight: 700, border: 0, borderRadius: 8, cursor: 'pointer' }}>Tentar de novo</button>
            </div>
          )}
        </div>
      )}
      {erroNuvem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,.97)', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', justifyContent: 'center', color: '#E8EFF8', fontFamily: 'var(--font-inter), sans-serif', padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>☁️</div>
          <h1 style={{ fontSize: 22 }}>Não consegui buscar seus dados na nuvem</h1>
          <p style={{ color: '#8899B0', maxWidth: 420, lineHeight: 1.6 }}>Para não mostrar o painel vazio, nada foi aberto. Verifique a internet (antivírus ou rede da empresa podem bloquear o Google Firebase) e tente de novo.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 26px', background: '#C5A059', color: '#0B1220', fontWeight: 700, border: 0, borderRadius: 8, cursor: 'pointer' }}>Tentar de novo</button>
        </div>
      )}
      {bloqueado && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(10, 15, 30, 0.97)', zIndex: 99999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: 'sans-serif', padding: '24px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '44px', marginBottom: '16px' }}>🔒</div>
          <h1 style={{ fontSize: '26px', marginBottom: '12px' }}>
            {acesso.motivo === 'pagamento_pendente' ? 'Pagamento pendente' : acesso.motivo === 'periodo_vencido' ? 'Seu período pago terminou' : acesso.motivo === 'erro' ? 'Não foi possível abrir o painel' : 'Seu teste grátis terminou'}
          </h1>
          <p style={{ color: '#8899B0', maxWidth: '420px', marginBottom: '28px', lineHeight: 1.6 }}>
            {acesso.motivo === 'pagamento_pendente'
              ? (acesso.forma === 'cartao' ? 'A cobrança no cartão não foi aprovada. Pague a cobrança pelo link abaixo (cartão, Pix ou boleto) para continuar. Seus dados estão guardados.' : 'A cobrança da assinatura venceu. Pague com Pix ou boleto pelo link abaixo para continuar; o boleto libera em até 1 dia útil. Seus dados estão guardados.')
              : acesso.motivo === 'periodo_vencido'
                ? 'Renove com Pix, boleto ou cartão para continuar. Seus lançamentos e cadastros estão guardados e voltam assim que o pagamento for confirmado.'
              : acesso.motivo === 'erro'
                ? (acesso.erro || 'Tente recarregar a página em instantes.')
                : 'Escolha um plano para continuar. Seus lançamentos e cadastros estão guardados e voltam assim que a assinatura for ativada.'}
          </p>
          {acesso.motivo === 'pagamento_pendente' ? (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {acesso.faturaPendente?.url && <a href={acesso.faturaPendente.url} target="_blank" rel="noopener" style={{ padding: '14px 30px', backgroundColor: '#C5A059', color: '#0B1220', fontWeight: 700, fontSize: '16px', borderRadius: '8px', textDecoration: 'none' }}>Pagar a cobrança</a>}
              <button onClick={() => window.location.reload()} style={{ padding: '14px 24px', background: 'transparent', color: '#E8EFF8', fontWeight: 700, fontSize: '15px', border: '1px solid rgba(232,239,248,.35)', borderRadius: '8px', cursor: 'pointer' }}>Já paguei, verificar</button>
              <button onClick={() => router.push('/assinatura')} style={{ padding: '14px 24px', background: 'transparent', color: '#E8EFF8', fontWeight: 700, fontSize: '15px', border: '1px solid rgba(232,239,248,.35)', borderRadius: '8px', cursor: 'pointer' }}>Minha assinatura</button>
            </div>
          ) : acesso.motivo !== 'erro' ? (
            <button onClick={() => router.push('/pricing')} style={{ padding: '14px 30px', backgroundColor: '#C5A059', color: '#0B1220', fontWeight: 700, fontSize: '16px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              {acesso.motivo === 'periodo_vencido' ? 'Renovar' : 'Ver planos'}
            </button>
          ) : (
            <button onClick={() => window.location.reload()} style={{ padding: '14px 30px', backgroundColor: '#C5A059', color: '#0B1220', fontWeight: 700, fontSize: '16px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              Recarregar
            </button>
          )}
        </div>
      )}
      {acesso?.motivo === 'demo' && pronto && (
        <div className="maxcfo-banner" style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9000, background: '#131d30', border: '1px solid rgba(197,160,89,.6)', color: '#E8EFF8', borderRadius: 999, padding: '8px 8px 8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 30px rgba(0,0,0,.4)', maxWidth: 'calc(100% - 32px)' }}>
          <span>Demonstração com uma empresa fictícia. Nada é salvo.</span>
          <a href="/register?origem=demo" style={{ background: '#C5A059', color: '#0B1220', borderRadius: 999, padding: '6px 12px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>Criar conta grátis</a>
        </div>
      )}
      {acesso?.acesso && acesso.faturaPendente && acesso.faturaPendente.url && (acesso.status === 'past_due' || (acesso.forma === 'pix_boleto' && acesso.faturaPendente.diasParaVencer <= 5)) && (
        <div className="maxcfo-banner" style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9000, background: '#131d30', border: '1px solid rgba(197,160,89,.45)', color: '#E8EFF8', borderRadius: 999, padding: '8px 8px 8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 30px rgba(0,0,0,.4)', maxWidth: 'calc(100% - 32px)' }}>
          <span>
            {acesso.faturaPendente.diasParaVencer < 0 ? 'Sua cobrança venceu: pague para não perder o acesso.'
              : acesso.faturaPendente.diasParaVencer === 0 ? 'Sua cobrança vence hoje.' : `Sua cobrança vence em ${acesso.faturaPendente.diasParaVencer} ${acesso.faturaPendente.diasParaVencer === 1 ? 'dia' : 'dias'}.`}
          </span>
          <a href={acesso.faturaPendente.url} target="_blank" rel="noopener" style={{ background: '#C5A059', color: '#0B1220', borderRadius: 999, padding: '6px 12px', fontWeight: 700, textDecoration: 'none' }}>Pagar</a>
        </div>
      )}
      {acesso?.acesso && !(acesso.faturaPendente && acesso.forma === 'pix_boleto' && acesso.faturaPendente.diasParaVencer <= 5) && (acesso.motivo === 'teste' || acesso.motivo === 'configuracao_pendente') && (
        <div className="maxcfo-banner" style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9000, background: '#131d30', border: '1px solid rgba(197,160,89,.45)', color: '#E8EFF8', borderRadius: 999, padding: '8px 8px 8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 30px rgba(0,0,0,.4)', maxWidth: 'calc(100% - 32px)' }}>
          <span>
            {acesso.motivo === 'teste'
              ? `Teste grátis: ${acesso.diasRestantes} ${acesso.diasRestantes === 1 ? 'dia restante' : 'dias restantes'}`
              : 'Modo de configuração: a verificação de assinaturas ainda não foi ativada.'}
          </span>
          {acesso.motivo === 'teste' && (
            <button onClick={() => router.push('/pricing')} style={{ background: '#C5A059', color: '#0B1220', border: 0, borderRadius: 999, padding: '6px 12px', fontWeight: 700, cursor: 'pointer' }}>Assinar</button>
          )}
        </div>
      )}
      <div id="maxcfoPainel" ref={raiz} />
    </>
  );
}

// HTML do painel. É colocado pelo próprio código (não pelo React) para o React nunca redesenhar
// essa parte: os scripts do painel mudam esse HTML o tempo todo e perderiam os cliques.
const PAINEL_HTML = `\n\n<!-- SIDEBAR -->
<aside class=\"sidebar\" id=\"sidebar\">
  <div class=\"sidebar-brand\">
    <img src=\"/logo.svg\" alt=\"\" class=\"brand-logo\" style=\"background:none;padding:0;box-shadow:none\">
    <div class=\"brand-text\">
      <span class=\"brand-name\">Landim Advisory</span>
      <span class=\"brand-tagline\">Gestão financeira</span>
    </div>
  </div>

  <nav class=\"sidebar-nav\">
    <div class="nav-section-label">1. ONBOARDING & EQUIPE</div>
    <a class="nav-item" data-view="team" id="nav-team">
      <span class="nav-icon">👥</span><span class="nav-label">Equipe & Workspaces</span>
    </a>
    <a class="nav-item" data-view="settings" id="nav-settings">
      <span class="nav-icon">⚙️</span><span class="nav-label">Configurações</span>
    </a>
    <a class="nav-item" data-view="audit" id="nav-audit">
      <span class="nav-icon">🛡️</span><span class="nav-label">Auditoria de Logs</span>
    </a>
    <a class="nav-item" data-view="plans" id="nav-plans">
      <span class="nav-icon">⭐</span><span class="nav-label">Assinaturas SaaS</span>
    </a>

    <div class="nav-section-label">2. OPERAÇÃO & VENDAS</div>
    <a class="nav-item" data-view="finance" id="nav-finance">
      <span class="nav-icon">💰</span><span class="nav-label">Financeiro & OCR</span>
    </a>
    <a class="nav-item" data-view="os" id="nav-os">
      <span class="nav-icon">📋</span><span class="nav-label">Ordem de Serviço (OS)</span>
    </a>
    <a class="nav-item" data-view="reconciliation" id="nav-reconciliation">
      <span class="nav-icon">🔄</span><span class="nav-label">Open Finance</span>
    </a>
    <a class="nav-item" data-view="crm" id=\"nav-crm\">
      <span class=\"nav-icon\">\ud83e\udd1d</span><span class=\"nav-label\">CRM & Vendas</span>
    </a>
    <a class="nav-item" data-view="budget" id="nav-budget">
      <span class="nav-icon">🎯</span><span class="nav-label">Orçamentos</span>
    </a>
    <a class="nav-item" data-view="commissions" id="nav-commissions">
      <span class="nav-icon">💸</span><span class="nav-label">Comissões</span>
    </a>
    <a class=\"nav-item\" data-view=\"inventory\" id=\"nav-inventory\">
      <span class=\"nav-icon\">\ud83d\udce6</span><span class=\"nav-label\">Estoque & Compras</span>
    </a>
    <a class=\"nav-item\" data-view=\"hr\" id=\"nav-hr\">
      <span class=\"nav-icon\">\ud83d\udccb</span><span class=\"nav-label\">RH Provis\u00f5es</span>
    </a>

    <div class=\"nav-section-label\">3. FINTECH & FATURAMENTO</div>
    <a class=\"nav-item\" data-view=\"fintech\" id=\"nav-fintech\">
      <span class=\"nav-icon\">\ud83c\udfe6</span><span class=\"nav-label\">Antecipa\u00e7\u00e3o de Notas</span>
    </a>
    <a class=\"nav-item\" data-view=\"nfe\" id=\"nav-nfe\">
      <span class=\"nav-icon\">\ud83e\uddfe</span><span class=\"nav-label\">Emiss\u00e3o Fiscal (NF-e)</span>
    </a>
    <a class="nav-item" data-view="billing" id="nav-billing">
      <span class="nav-icon">💳</span><span class="nav-label">Cobrança Automática</span>
    </a>
    <a class="nav-item" data-view="checkout" id="nav-checkout">
      <span class="nav-icon">🛒</span><span class="nav-label">Links de Pagamento</span>
    </a>

    <div class=\"nav-section-label\">4. ENTERPRISE & PATRIM\u00d4NIO</div>
    <a class=\"nav-item\" data-view=\"assets\" id=\"nav-assets\">
      <span class=\"nav-icon\">\ud83c\udfd8\ufe0f</span><span class=\"nav-label\">Gest\u00e3o de Ativos</span>
    </a>
    <a class=\"nav-item\" data-view=\"tax-audit\" id=\"nav-tax-audit\">
      <span class=\"nav-icon\">\ud83d\udd0d</span><span class=\"nav-label\">Auditoria Tribut\u00e1ria</span>
    </a>
    <a class="nav-item" data-view="accountant" id="nav-accountant">
      <span class="nav-icon">🧮</span><span class="nav-label">Portal do Contador</span>
    </a>
    <a class=\"nav-item\" data-view=\"companies\" id=\"nav-companies\">
      <span class=\"nav-icon\">\ud83c\udfe2</span><span class=\"nav-label\">CNPJs & Compliance</span>
    </a>
    <a class=\"nav-item\" data-view=\"thermofinance\" id=\"nav-thermofinance\">
      <span class=\"nav-icon\">\u26a2\ufe0f</span><span class=\"nav-label\">Termofinan\u00e7a IA</span>
    </a>

    <div class=\"nav-section-label\">5. INTELIG\u00caNCIA & DASHBOARD</div>
    <a class=\"nav-item active\" data-view=\"dashboard\" id=\"nav-dashboard\">
      <span class=\"nav-icon\">\ud83d\udcca</span><span class=\"nav-label\">Vis\u00e3o Geral</span>
    </a>
    <a class=\"nav-item\" data-view=\"chat\" id=\"nav-chat\">
      <span class=\"nav-icon\">\ud83e\udd16</span><span class=\"nav-label\">CFO IA Chat</span>
      <span class=\"nav-badge\" id=\"chatBadge\" style=\"display:none\">1</span>
    </a>
    <a class="nav-item" data-view="tributario" id="nav-tributario">
      <span class="nav-icon">⚖️</span><span class="nav-label">Simulador Tributário</span>
    </a>
    <a class=\"nav-item\" data-view=\"simulator\" id=\"nav-simulator\">
      <span class=\"nav-icon\">\ud83d\udd2e</span><span class=\"nav-label\">Forecast & Simulador</span>
    </a>
    <a class=\"nav-item\" data-view=\"reports\" id=\"nav-reports\">
      <span class=\"nav-icon\">\ud83d\udcc8</span><span class=\"nav-label\">Relat\u00f3rios Export\u00e1veis</span>
    </a>
  </nav>

  <div class=\"sidebar-bottom\">
    <div class=\"sidebar-version\">Landim Advisory</div>
    <div class=\"user-profile\" id=\"userProfile\">
      <div class=\"user-avatar\" id=\"userAvatarSidebar\">M</div>
      <div class=\"user-info\">
        <span class=\"user-name\" id=\"sidebarUserName\">CFO Master</span>
        <span class=\"user-plan\">Unlimited Plan \ud83d\udc8e</span>
      </div>
    </div>
  </div>
</aside>\n\n<!-- OVERLAY mobile -->\n<div class=\"sidebar-overlay\" id=\"sidebarOverlay\" onclick=\"closeSidebar()\"></div>\n\n<!-- MAIN -->\n<div class=\"main-wrap\">\n\n  <!-- TOPBAR -->\n  <header class=\"topbar\">\n    <div class=\"topbar-left\">\n      <button class=\"sidebar-toggle\" id=\"sidebarToggle\" aria-label=\"Menu\">\u2630</button>\n      <nav class=\"breadcrumb-nav\" aria-label=\"Localiza\u00e7\u00e3o\">\n        <span class=\"breadcrumb-root\">Landim Advisory</span>\n        <span class=\"breadcrumb-sep\">\u203a</span>\n        <span class=\"breadcrumb-current\" id=\"breadcrumb-label\">Dashboard</span>\n      </nav>\n    </div>\n    <div class=\"topbar-center\">\n      <div class=\"search-container\">\n        <span class=\"search-icon-left\">\ud83d\udd0d</span>\n        <input type=\"text\" class=\"search-input\" id=\"globalSearch\" placeholder=\"Buscar funcionalidade... (Ctrl+K)\" autocomplete=\"off\" aria-label=\"Busca global\">\n        <kbd class=\"search-kbd\">Ctrl K</kbd>\n        <div class=\"search-dropdown\" id=\"searchDropdown\" role=\"listbox\"></div>\n      </div>\n    </div>\n    <div class=\"topbar-right\">\n      <button class=\"topbar-action-btn\" id=\"addBtn\" title=\"Novo lan\u00e7amento (N)\" onclick=\"quickAdd()\">\n        <span>+</span> Novo\n      </button>\n      <button class=\"topbar-icon-btn\" id=\"notifBtn\" title=\"Notifica\u00e7\u00f5es\" aria-label=\"Notifica\u00e7\u00f5es\">\n        \ud83d\udd14\n        <span class=\"notif-dot\" id=\"notifDot\"></span>\n      </button>\n      <div class=\"topbar-divider\"></div>\n      <div class=\"topbar-date-time\" id=\"topbarDateTime\"></div>\n    </div>\n  </header>\n\n  <!-- VIEWS CONTAINER -->\n  <main class=\"views-container\" id=\"viewsContainer\">\n\n    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 DASHBOARD \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->\n    <section class=\"view active\" id=\"view-dashboard\" aria-label=\"Dashboard\">\n\n      <div class=\"page-header\">\n        <div class=\"page-header-text\">\n          <h1 id=\"dashGreeting\">Vis\u00e3o Geral Executiva</h1>\n          <p class=\"page-subtitle\" id=\"dashSubtitle\">Resumo financeiro em tempo real</p>\n        </div>\n        <div class=\"page-header-actions\">\n          <button class=\"btn-secondary\" onclick=\"switchView('reports')\">\ud83d\udccb Relat\u00f3rio</button>\n          <button class=\"btn-primary\" onclick=\"openModal('receita')\">+ Receita</button>\n          <button class=\"btn-danger-outline\" onclick=\"openModal('despesa')\">+ Despesa</button>\n        </div>\n      </div>\n\n      <!-- KPI CARDS -->\n      <div class=\"kpi-strip\" id=\"kpiStrip\">\n        <div class=\"kpi-card kpi-green\">\n          <div class=\"kpi-top\"><span class=\"kpi-ico\">\ud83d\udcc8</span><span class=\"kpi-trend positive\" id=\"kpi-rec-trend\">\u2014</span></div>\n          <div class=\"kpi-value\" id=\"kpi-receita\">R$ 0,00</div>\n          <div class=\"kpi-label\">Receitas Totais</div>\n        </div>\n        <div class=\"kpi-card kpi-red\">\n          <div class=\"kpi-top\"><span class=\"kpi-ico\">\ud83d\udcc9</span><span class=\"kpi-trend\" id=\"kpi-desp-trend\">\u2014</span></div>\n          <div class=\"kpi-value\" id=\"kpi-despesa\">R$ 0,00</div>\n          <div class=\"kpi-label\">Despesas Totais</div>\n        </div>\n        <div class=\"kpi-card kpi-gold\">\n          <div class=\"kpi-top\"><span class=\"kpi-ico\">\ud83d\udcb0</span><span class=\"kpi-trend\" id=\"kpi-saldo-trend\">\u2014</span></div>\n          <div class=\"kpi-value\" id=\"kpi-saldo\">R$ 0,00</div>\n          <div class=\"kpi-label\">Resultado / Saldo</div>\n        </div>\n        <div class=\"kpi-card kpi-blue\">\n          <div class=\"kpi-top\"><span class=\"kpi-ico\">\ud83d\udcd0</span><span class=\"kpi-trend\" id=\"kpi-margem-trend\">\u2014</span></div>\n          <div class=\"kpi-value\" id=\"kpi-margem\">0,0%</div>\n          <div class=\"kpi-label\">Margem L\u00edquida</div>\n        </div>\n        <div class=\"kpi-card kpi-purple\">\n          <div class=\"kpi-top\"><span class=\"kpi-ico\">\u23f3</span><span class=\"kpi-trend\" id=\"kpi-runway-trend\">\u2014</span></div>\n          <div class=\"kpi-value\" id=\"kpi-runway\">0 meses</div>\n          <div class=\"kpi-label\">Runway Estimado</div>\n        </div>\n      </div>\n\n      <!-- CHARTS ROW -->\n      <div class=\"grid-3col\">\n        <!-- Score Gauge -->\n        <div class=\"card\">\n          <div class=\"card-title\">Sa\u00fade Financeira</div>\n          <div class=\"gauge-container\">\n            <svg class=\"gauge-svg\" viewBox=\"0 0 200 120\">\n              <defs>\n                <linearGradient id=\"gaugeGrad\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"0%\">\n                  <stop offset=\"0%\" style=\"stop-color:#EF4444\"/>\n                  <stop offset=\"40%\" style=\"stop-color:#F59E0B\"/>\n                  <stop offset=\"70%\" style=\"stop-color:#C5A059\"/>\n                  <stop offset=\"100%\" style=\"stop-color:#10B981\"/>\n                </linearGradient>\n              </defs>\n              <path d=\"M 20 105 A 80 80 0 0 1 180 105\" fill=\"none\" stroke=\"rgba(255,255,255,0.07)\" stroke-width=\"18\" stroke-linecap=\"round\"/>\n              <path id=\"gaugeFill\" d=\"M 20 105 A 80 80 0 0 1 180 105\" fill=\"none\" stroke=\"url(#gaugeGrad)\" stroke-width=\"18\" stroke-linecap=\"round\" stroke-dasharray=\"251.2\" stroke-dashoffset=\"251.2\"/>\n            </svg>\n            <div class=\"gauge-center-info\">\n              <div class=\"gauge-score\" id=\"gaugeScore\">50</div>\n              <div class=\"gauge-status\" id=\"gaugeStatus\">Regular</div>\n            </div>\n          </div>\n          <div class=\"gauge-scale\">\n            <span style=\"color:#EF4444\">Cr\u00edtico</span>\n            <span style=\"color:#F59E0B\">Regular</span>\n            <span style=\"color:#10B981\">\u00d3timo</span>\n          </div>\n          <button class=\"btn-ghost-full\" onclick=\"sendToChat('diagn\u00f3stico financeiro')\">Ver diagn\u00f3stico \u2192</button>\n        </div>\n\n        <!-- Trend Chart -->\n        <div class=\"card\">\n          <div class=\"card-title\">Evolu\u00e7\u00e3o (6 Meses)</div>\n          <canvas id=\"trendChart\" width=\"300\" height=\"160\" style=\"width:100%;max-height:160px\"></canvas>\n          <div class=\"chart-legend\">\n            <span class=\"legend-dot green\" style=\"box-shadow: 0 0 8px var(--success)\"></span> Receitas\n            <span class=\"legend-dot red\" style=\"margin-left:12px;box-shadow: 0 0 8px var(--danger)\"></span> Despesas\n          </div>\n        </div>\n\n        <!-- DRE mini -->\n        <div class=\"card\">\n          <div class=\"card-title\">DRE Executivo</div>\n          <div class=\"dre-mini\" id=\"dreMini\"></div>\n          <button class=\"btn-ghost-full\" onclick=\"generateReport('dre')\">DRE completo \u2192</button>\n        </div>\n      </div>\n\n      <!-- BOTTOM ROW -->\n      <div class=\"grid-2col\" style=\"margin-top:20px\">\n        <!-- Alerts -->\n        <div class=\"card\">\n          <div class=\"card-header-row\">\n            <span class=\"card-title\">\u26a1 Alertas Inteligentes</span>\n            <span class=\"badge-count\" id=\"alertCount\">0</span>\n          </div>\n          <div class=\"alerts-list\" id=\"alertsList\"></div>\n          <button class=\"btn-ghost-full\" onclick=\"sendToChat('diagn\u00f3stico financeiro')\">An\u00e1lise completa \u2192</button>\n        </div>\n\n        <!-- Recent Transactions -->\n        <div class=\"card\">\n          <div class=\"card-header-row\">\n            <span class=\"card-title\">\u00daltimos Lan\u00e7amentos</span>\n            <button class=\"btn-link\" onclick=\"switchView('finance')\">Ver todos \u2192</button>\n          </div>\n          <div id=\"recentTxList\"></div>\n        </div>\n      </div>\n    </section>\n\n    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 CHAT IA \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->\n    <section class=\"view chat-view\" id=\"view-chat\" aria-label=\"CFO IA\">\n      <div class=\"chat-layout\">\n        <aside class=\"chat-panel\">\n          <div class=\"ai-header\">\n            <div class=\"ai-avatar-lg\">\ud83e\udd16</div>\n            <div>\n              <h3 class=\"ai-name\">Landim Advisory</h3>\n              <span class=\"ai-status\"><span class=\"status-pulse\"></span> Online \u2014 IA Ativa</span>\n            </div>\n          </div>\n\n          <div class=\"chat-commands-section\">\n            <div class=\"section-label\">AN\u00c1LISES R\u00c1PIDAS</div>\n            <button class=\"cmd-chip\" onclick=\"sendToChat('resumo financeiro')\">\ud83d\udcca Resumo</button>\n            <button class=\"cmd-chip\" onclick=\"sendToChat('gerar DRE completo')\">\ud83d\udcc8 DRE</button>\n            <button class=\"cmd-chip\" onclick=\"sendToChat('diagn\u00f3stico financeiro')\">\ud83e\ude7a Diagn\u00f3stico</button>\n            <button class=\"cmd-chip\" onclick=\"sendToChat('an\u00e1lise de margens')\">\ud83d\udcd0 Margens</button>\n            <button class=\"cmd-chip\" onclick=\"sendToChat('burn rate e runway')\">\ud83d\udd25 Burn Rate</button>\n            <button class=\"cmd-chip\" onclick=\"sendToChat('forecast pr\u00f3ximos 3 meses')\">\ud83d\udd2e Forecast</button>\n            <button class=\"cmd-chip\" onclick=\"sendToChat('fluxo de caixa')\">\ud83d\udca7 Fluxo Caixa</button>\n            <button class=\"cmd-chip\" onclick=\"sendToChat('capital de giro')\">\u2696\ufe0f Capital Giro</button>\n            <button class=\"cmd-chip\" onclick=\"sendToChat('ponto de equil\u00edbrio')\">\ud83c\udfaf Break Even</button>\n            <button class=\"cmd-chip\" onclick=\"sendToChat('planejamento tribut\u00e1rio')\">\ud83d\udccb Tribut\u00e1rio</button>\n            <button class=\"cmd-chip\" onclick=\"sendToChat('onde investir meu excedente')\">\ud83d\udcbc Investimentos</button>\n            <button class=\"cmd-chip\" onclick=\"sendToChat('reduzir custos')\">\u2702\ufe0f Custos</button>\n            <button class=\"cmd-chip\" onclick=\"sendToChat('KPIs e indicadores')\">\ud83d\udcc9 KPIs</button>\n          </div>\n\n          <button class=\"btn-clear-chat\" onclick=\"clearChat()\">\ud83d\uddd1\ufe0f Limpar conversa</button>\n        </aside>\n\n        <div class=\"chat-body\">\n          <div class=\"messages-area\" id=\"chatMessages\" aria-live=\"polite\" aria-label=\"Mensagens\"></div>\n          <div class=\"chat-input-area\">\n            <div class=\"chat-input-wrap\">\n              <textarea\n                class=\"chat-textarea\"\n                id=\"chatInput\"\n                placeholder=\"Pergunte à Landim Advisory... ex: 'Como est\u00e1 minha margem?' ou 'Analisar CNPJ 00.000.000/0001-00'\"\n                rows=\"1\"\n                aria-label=\"Digite sua mensagem\"\n              ></textarea>\n              <div class=\"chat-actions\">\n                <button class=\"voice-trigger\" id=\"voiceBtn\" onclick=\"toggleVoice()\" title=\"Reconhecimento de voz (Chrome)\">\ud83c\udfa4</button>\n                <button class=\"send-trigger\" id=\"sendBtn\" onclick=\"sendChat()\" aria-label=\"Enviar\">\n                  <svg width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"22\" y1=\"2\" x2=\"11\" y2=\"13\"/><polygon points=\"22 2 15 22 11 13 2 9 22 2\"/></svg>\n                </button>\n              </div>\n            </div>\n            <div class=\"chat-footer-hint\">Enter para enviar \u2022 Shift+Enter para nova linha \u2022 \ud83c\udfa4 para voz</div>\n          </div>\n        </div>\n      </div>\n    </section>\n\n    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 FINANCEIRO \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->\n    <section class=\"view\" id=\"view-finance\" aria-label=\"Gest\u00e3o Financeira\">\n      <div class=\"page-header\">\n        <div class=\"page-header-text\">\n          <h1>Gest\u00e3o Financeira</h1>\n          <p class=\"page-subtitle\">Controle completo de receitas e despesas</p>\n        </div>\n        <div class=\"page-header-actions\">\n          <button class=\"btn-secondary\" onclick=\"exportCSV()\">\u2b07\ufe0f Exportar CSV</button>\n          <button class=\"btn-primary\" onclick=\"openModal('receita')\">+ Nova Receita</button>\n          <button class=\"btn-danger-outline\" onclick=\"openModal('despesa')\">+ Nova Despesa</button>\n        </div>\n      </div>\n\n      <!-- Finance KPIs -->\n      <div class=\"finance-kpi-row\" id=\"financeKPIs\"></div>\n\n      <!-- Pie Chart + Table -->\n      <div class=\"grid-sidebar-main\" style=\"margin-top:20px\">\n        <div class=\"card\">\n          <div class=\"card-title\">Distribui\u00e7\u00e3o por Categoria</div>\n          <canvas id=\"pieChart\" width=\"220\" height=\"220\" style=\"width:220px;height:220px;margin:0 auto;display:block\"></canvas>\n          <div id=\"pieChartLegend\" style=\"margin-top:12px\"></div>\n        </div>\n        <div class=\"card\">\n          <div class=\"card-header-row\">\n            <span class=\"card-title\">Lan\u00e7amentos</span>\n            <div class=\"filter-bar\">\n              <select class=\"select-sm\" id=\"filterPeriod\" onchange=\"applyFilters()\">\n                <option value=\"all\">Todo per\u00edodo</option>\n                <option value=\"thisMonth\">Este m\u00eas</option>\n                <option value=\"lastMonth\">M\u00eas passado</option>\n                <option value=\"last3\">\u00daltimos 3 meses</option>\n                <option value=\"thisYear\">Este ano</option>\n              </select>\n              <div class=\"chip-row\">\n                <button class=\"chip active\" data-type=\"all\" onclick=\"setTypeFilter(this,'all')\">Todos</button>\n                <button class=\"chip\" data-type=\"RECEITA\" onclick=\"setTypeFilter(this,'RECEITA')\">Receitas</button>\n                <button class=\"chip\" data-type=\"DESPESA\" onclick=\"setTypeFilter(this,'DESPESA')\">Despesas</button>\n              </div>\n              <input type=\"text\" class=\"search-sm\" id=\"txSearch\" placeholder=\"Buscar...\" oninput=\"applyFilters()\">\n            </div>\n          </div>\n          <div class=\"table-scroll\">\n            <table class=\"data-table\" id=\"txTable\">\n              <thead>\n                <tr>\n                  <th class=\"sortable\" onclick=\"sortTx('date')\">Data <span id=\"sort-date\">\u2195</span></th>\n                  <th class=\"sortable\" onclick=\"sortTx('desc')\">Descri\u00e7\u00e3o <span id=\"sort-desc\">\u2195</span></th>\n                  <th>Categoria</th>\n                  <th>Tipo</th>\n                  <th class=\"sortable\" onclick=\"sortTx('amount')\">Valor <span id=\"sort-amount\">\u2195</span></th>\n                  <th>A\u00e7\u00f5es</th>\n                </tr>\n              </thead>\n              <tbody id=\"txTableBody\"></tbody>\n            </table>\n          </div>\n          <div class=\"table-footer\">\n            <span id=\"txCount-label\" class=\"table-count\"></span>\n            <span id=\"txTotal-label\" class=\"table-total\"></span>\n          </div>\n        </div>\n      </div>\n    </section>\n\n    <!-- \ud83c\udfe6 CONCILIA\u00c7\u00c3O BANC\u00c1RIA \ud83c\udfe6 -->\n    <section class=\"view\" id=\"view-reconciliation\" aria-label=\"Concilia\u00e7\u00e3o Banc\u00e1ria\">\n      <div class=\"page-header\">\n        <div class=\"page-header-text\">\n          <h1>Concilia\u00e7\u00e3o Banc\u00e1ria</h1>\n          <p class=\"page-subtitle\">Importe seu extrato (OFX ou CSV) e sincronize com o sistema</p>\n        </div>\n        <div class=\"page-header-actions\">\n          <button class=\"btn-primary\" id=\"btn-import-pending\" style=\"display:none;\" onclick=\"importPendingTransactions()\">Importar Pendentes</button>\n        </div>\n      </div>\n\n      <div class=\"card\" style=\"margin-top:20px; text-align:center;\" id=\"reconciliation-upload-zone\">\n        <div class=\"drop-zone\" id=\"drop-zone\" onclick=\"document.getElementById('bank-file-input').click()\">\n          <span style=\"font-size: 32px; display: block; margin-bottom: 10px;\">\ud83d\udcc4</span>\n          <h3>Arraste o extrato do seu banco aqui</h3>\n          <p class=\"text-muted\">Ou clique para selecionar um arquivo (.OFX ou .CSV)</p>\n          <input type=\"file\" id=\"bank-file-input\" accept=\".ofx,.csv\" style=\"display:none;\" onchange=\"handleBankFileUpload(event)\">\n        </div>\n      </div>\n\n      <div class=\"card\" style=\"margin-top:20px; display:none;\" id=\"reconciliation-results\">\n        <div class=\"card-header-row\">\n          <span class=\"card-title\">An\u00e1lise do Extrato</span>\n          <div class=\"chip-row\">\n            <span class=\"chip\" style=\"background:#10b98122; color:#10b981;\" id=\"count-matched\">0 Conciliados</span>\n            <span class=\"chip\" style=\"background:#f59e0b22; color:#f59e0b;\" id=\"count-pending\">0 Pendentes</span>\n          </div>\n        </div>\n        <div class=\"table-scroll\" style=\"max-height: 500px;\">\n          <table class=\"data-table\">\n            <thead>\n              <tr>\n                <th>Status</th>\n                <th>Data</th>\n                <th>Descri\u00e7\u00e3o (Banco)</th>\n                <th>Valor</th>\n                <th>A\u00e7\u00e3o</th>\n              </tr>\n            </thead>\n            <tbody id=\"reconTableBody\">\n            </tbody>\n          </table>\n        </div>\n      </div>\n    </section>\n\n    <!-- SIMULADOR TRIBUTÁRIO (regimes, 12 meses, reforma, preço e split payment) -->
    <section class="view" id="view-tributario" aria-label="Simulador Tributário" style="padding:0;overflow:hidden">
      <iframe id="tributarioFrame" data-src="/simulador-tributario.html" title="Simulador Tributário e Reforma" style="width:100%;height:100%;border:0;display:block;background:#070B14"></iframe>
    </section>

    <!-- \ud83d\udd2e SIMULADOR \ud83d\udd2e -->\n    <section class=\"view\" id=\"view-simulator\" aria-label=\"Simulador de Cen\u00e1rios\">\n      <div class=\"page-header\">\n        <div class=\"page-header-text\">\n          <h1>Simulador de Cen\u00e1rios</h1>\n          <p class=\"page-subtitle\">Projete impactos financeiros em tempo real com IA</p>\n        </div>\n        <button class=\"btn-secondary\" onclick=\"generateReport('forecast')\">\ud83d\udccb Exportar Proje\u00e7\u00e3o</button>\n      </div>\n\n      <div class=\"simulator-layout\">\n        <!-- Controls -->\n        <div class=\"card sim-panel\">\n          <div class=\"sim-section-title\">\u2699\ufe0f Par\u00e2metros do Cen\u00e1rio</div>\n\n          <div class=\"slider-block\">\n            <div class=\"slider-label-row\">\n              <span>\ud83d\udcc8 Varia\u00e7\u00e3o de Receita</span>\n              <span class=\"slider-display\" id=\"recDisplay\" style=\"color:var(--success)\">+0%</span>\n            </div>\n            <input type=\"range\" min=\"-50\" max=\"150\" value=\"0\" class=\"range-input\" id=\"recSlider\" oninput=\"onSliderChange()\">\n            <div class=\"slider-ticks\"><span>-50%</span><span>0%</span><span>+150%</span></div>\n          </div>\n\n          <div class=\"slider-block\">\n            <div class=\"slider-label-row\">\n              <span>\ud83d\udcc9 Varia\u00e7\u00e3o de Despesa</span>\n              <span class=\"slider-display\" id=\"despDisplay\" style=\"color:var(--text-muted)\">+0%</span>\n            </div>\n            <input type=\"range\" min=\"-50\" max=\"100\" value=\"0\" class=\"range-input\" id=\"despSlider\" oninput=\"onSliderChange()\">\n            <div class=\"slider-ticks\"><span>-50%</span><span>0%</span><span>+100%</span></div>\n          </div>\n\n          <div class=\"scenarios-title\">\u26a1 Cen\u00e1rios Pr\u00e9-configurados</div>\n          <div class=\"scenarios-grid\">\n            <button class=\"scenario-pill\" onclick=\"applyScenario(30,10,'Expans\u00e3o Moderada')\">\ud83d\ude80 Expans\u00e3o</button>\n            <button class=\"scenario-pill\" onclick=\"applyScenario(80,-20,'Crescimento Acelerado')\">\ud83d\udcc8 Acelerado</button>\n            <button class=\"scenario-pill\" onclick=\"applyScenario(-20,10,'Recess\u00e3o')\">\u26a0\ufe0f Recess\u00e3o</button>\n            <button class=\"scenario-pill\" onclick=\"applyScenario(-40,20,'Crise Severa')\">\ud83d\udd34 Crise</button>\n            <button class=\"scenario-pill\" onclick=\"applyScenario(0,-25,'Corte de Custos')\">\u2702\ufe0f Corte</button>\n            <button class=\"scenario-pill\" onclick=\"applyScenario(50,-15,'Crescimento + Efici\u00eancia')\">\ud83c\udfaf Ideal</button>\n            <button class=\"scenario-pill\" onclick=\"applyScenario(0,0,'Reset')\">\ud83d\udd04 Reset</button>\n          </div>\n        </div>\n\n        <!-- Results -->\n        <div class=\"sim-results-col\">\n          <div class=\"card\">\n            <div class=\"sim-section-title\" id=\"scenarioTitle\">\ud83d\udcca Resultado Projetado</div>\n            <div id=\"simResultCards\"></div>\n          </div>\n          <div class=\"card\" style=\"margin-top:16px\">\n            <div class=\"sim-section-title\">\ud83e\udd16 Parecer Estrat\u00e9gico do CFO</div>\n            <div class=\"cfo-speech\" id=\"cfoParecer\">\n              <div class=\"cfo-speech-icon\">\ud83e\udd16</div>\n              <p>Ajuste os sliders ou selecione um cen\u00e1rio para receber an\u00e1lise estrat\u00e9gica da Landim Advisory.</p>\n            </div>\n          </div>\n          <canvas id=\"simChart\" style=\"display:none\"></canvas>\n        </div>\n      </div>\n    </section>\n\n    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 EMPRESAS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->\n    <section class=\"view\" id=\"view-companies\" aria-label=\"An\u00e1lise Empresarial\">\n      <div class=\"page-header\">\n        <div class=\"page-header-text\">\n          <h1>An\u00e1lise Empresarial</h1>\n          <p class=\"page-subtitle\">Consulte qualquer empresa por CNPJ e receba an\u00e1lise completa do CFO</p>\n        </div>\n      </div>\n\n      <div class=\"company-search-card card\">\n        <div class=\"company-search-inner\">\n          <div class=\"company-search-left\">\n            <h3 class=\"gold-text\">\ud83d\udd0d Consulta de Empresa</h3>\n            <p style=\"color:var(--text-muted);margin:8px 0 16px\">Informe o CNPJ formatado ou nome da empresa</p>\n            <div class=\"cnpj-row\">\n              <input type=\"text\" class=\"form-input\" id=\"cnpjInput\" placeholder=\"00.000.000/0001-00 ou nome da empresa\"\n                maxlength=\"60\" oninput=\"formatCnpj(this)\" onkeydown=\"if(event.key==='Enter') consultarEmpresa()\">\n              <button class=\"btn-primary btn-lg\" onclick=\"consultarEmpresa()\" id=\"analyzeBtn\">\n                Analisar \u2192\n              </button>\n            </div>\n            <div class=\"quick-companies\">\n              <span class=\"quick-label\">Exemplos r\u00e1pidos:</span>\n              <button class=\"pill-tag\" onclick=\"setAndAnalyze('33.000.167/0001-01','Petr\u00f3leo Brasileiro S.A. - PETROBRAS')\">Petrobr\u00e1s</button>\n              <button class=\"pill-tag\" onclick=\"setAndAnalyze('60.701.190/0001-04','Ita\u00fa Unibanco S.A.')\">Ita\u00fa</button>\n              <button class=\"pill-tag\" onclick=\"setAndAnalyze('00.000.000/0001-91','Banco do Brasil S.A.')\">Banco do Brasil</button>\n              <button class=\"pill-tag\" onclick=\"setAndAnalyze('45.543.915/0001-81','Magazine Luiza S.A.')\">Magalu</button>\n              <button class=\"pill-tag\" onclick=\"setAndAnalyze('47.960.950/0001-21','Lojas Americanas S.A.')\">Americanas</button>\n            </div>\n          </div>\n          <div class=\"company-search-right\">\n            <div class=\"search-illustration\">\ud83c\udfe2</div>\n          </div>\n        </div>\n      </div>\n\n      <div id=\"companyResultArea\" style=\"display:none;margin-top:20px\">\n        <div class=\"company-result-grid\">\n          <!-- Main result card -->\n          <div class=\"card company-main-card\" id=\"companyMainCard\"></div>\n          <!-- Score card -->\n          <div class=\"card company-score-card\" id=\"companyScoreCard\"></div>\n        </div>\n        <!-- CFO Parecer -->\n        <div class=\"card\" style=\"margin-top:16px\" id=\"companyCFOCard\"></div>\n      </div>\n\n      <div class=\"card\" id=\"companyHistoryCard\" style=\"display:none;margin-top:20px\">\n        <div class=\"card-header-row\">\n          <span class=\"card-title\">\ud83d\udccb Hist\u00f3rico de An\u00e1lises</span>\n          <button class=\"btn-link\" onclick=\"clearCompanyHistory()\">Limpar</button>\n        </div>\n        <div id=\"companyHistoryList\"></div>\n      </div>\n    </section>\n\n    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 RELAT\u00d3RIOS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->\n    <section class=\"view\" id=\"view-reports\" aria-label=\"Relat\u00f3rios\">\n      <div class=\"page-header\">\n        <div class=\"page-header-text\">\n          <h1>Relat\u00f3rios & Exporta\u00e7\u00e3o</h1>\n          <p class=\"page-subtitle\">Gere relat\u00f3rios executivos completos e profissionais</p>\n        </div>\n        <div class=\"page-header-actions\">\n          <button class=\"btn-secondary\" id=\"printReportBtn\" style=\"display:none\" onclick=\"window.print()\">\ud83d\udda8\ufe0f Imprimir</button>\n          <button class=\"btn-secondary\" id=\"copyReportBtn\" style=\"display:none\" onclick=\"copyReport()\">\ud83d\udccb Copiar</button>\n        </div>\n      </div>\n\n      <div class=\"reports-tiles\">\n        <div class=\"report-tile\" onclick=\"generateReport('dre')\" id=\"tile-dre\">\n          <div class=\"tile-icon\">\ud83d\udcc8</div>\n          <div class=\"tile-body\">\n            <h3>DRE Completo</h3>\n            <p>Demonstrativo de Resultado com an\u00e1lise de todas as margens</p>\n          </div>\n          <div class=\"tile-arrow\">\u2192</div>\n        </div>\n        <div class=\"report-tile\" onclick=\"generateReport('diagnostico')\" id=\"tile-diagnostico\">\n          <div class=\"tile-icon\">\ud83e\ude7a</div>\n          <div class=\"tile-body\">\n            <h3>Diagn\u00f3stico Financeiro</h3>\n            <p>Score de sa\u00fade, pontos fortes, alertas e recomenda\u00e7\u00f5es</p>\n          </div>\n          <div class=\"tile-arrow\">\u2192</div>\n        </div>\n        <div class=\"report-tile\" onclick=\"generateReport('cashflow')\" id=\"tile-cashflow\">\n          <div class=\"tile-icon\">\ud83d\udcb8</div>\n          <div class=\"tile-body\">\n            <h3>Fluxo de Caixa</h3>\n            <p>DFC \u2014 Atividades operacionais, investimento e financiamento</p>\n          </div>\n          <div class=\"tile-arrow\">\u2192</div>\n        </div>\n        <div class=\"report-tile\" onclick=\"generateReport('forecast')\" id=\"tile-forecast\">\n          <div class=\"tile-icon\">\ud83d\udd2e</div>\n          <div class=\"tile-body\">\n            <h3>Forecast 3 Meses</h3>\n            <p>Proje\u00e7\u00e3o otimista, conservadora e pessimista do resultado</p>\n          </div>\n          <div class=\"tile-arrow\">\u2192</div>\n        </div>\n        <div class=\"report-tile\" onclick=\"generateReport('tributario')\" id=\"tile-tributario\">\n          <div class=\"tile-icon\">\ud83d\udccb</div>\n          <div class=\"tile-body\">\n            <h3>Planejamento Tribut\u00e1rio</h3>\n            <p>Regime ideal, carga estimada e oportunidades de economia</p>\n          </div>\n          <div class=\"tile-arrow\">\u2192</div>\n        </div>\n        <div class=\"report-tile\" onclick=\"generateReport('kpis')\" id=\"tile-kpis\">\n          <div class=\"tile-icon\">\ud83d\udcc9</div>\n          <div class=\"tile-body\">\n            <h3>KPIs Executivos</h3>\n            <p>Todos os indicadores chave com avalia\u00e7\u00e3o comparativa</p>\n          </div>\n          <div class=\"tile-arrow\">\u2192</div>\n        </div>\n        <div class=\"report-tile\" onclick=\"generateReport('breakeven')\" id=\"tile-breakeven\">\n          <div class=\"tile-icon\">\ud83c\udfaf</div>\n          <div class=\"tile-body\">\n            <h3>Ponto de Equil\u00edbrio</h3>\n            <p>Break-even analysis com metas de crescimento</p>\n          </div>\n          <div class=\"tile-arrow\">\u2192</div>\n        </div>\n        <div class=\"report-tile\" onclick=\"generateReport('workingcapital')\" id=\"tile-workingcapital\">\n          <div class=\"tile-icon\">\u2696\ufe0f</div>\n          <div class=\"tile-body\">\n            <h3>Capital de Giro</h3>\n            <p>Liquidez, NCG e indicadores de sa\u00fade do balan\u00e7o</p>\n          </div>\n          <div class=\"tile-arrow\">\u2192</div>\n        </div>\n      </div>\n\n      <div class=\"card report-output-card\" id=\"reportOutputCard\" style=\"display:none\">\n        <div class=\"card-header-row\">\n          <h3 id=\"reportOutputTitle\" class=\"gold-text\"></h3>\n          <div style=\"display:flex;gap:8px\">\n            <button class=\"btn-secondary\" onclick=\"copyReport()\">\ud83d\udccb Copiar</button>\n            <button class=\"btn-secondary\" onclick=\"window.print()\">\ud83d\udda8\ufe0f Imprimir</button>\n          </div>\n        </div>\n        <pre id=\"reportOutputContent\" class=\"report-pre\"></pre>\n      </div>\n    </section>\n\n    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 CONFIGURA\u00c7\u00d5ES \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->\n    <section class=\"view\" id=\"view-settings\" aria-label=\"Configura\u00e7\u00f5es\">\n      <div class=\"page-header\">\n        <div class=\"page-header-text\">\n          <h1>Configura\u00e7\u00f5es</h1>\n          <p class=\"page-subtitle\">Personalize a Landim Advisory</p>\n        </div>\n      </div>\n\n      <div class=\"settings-grid\">\n        <div class=\"card settings-card\">\n          <h3 class=\"settings-section-title\">\ud83d\udc64 Perfil</h3>\n          <div class=\"form-group\"><label>Nome</label><input type=\"text\" class=\"form-input\" id=\"settingName\" placeholder=\"Seu nome ou empresa\"></div>\n          <div class=\"form-group\"><label>Empresa</label><input type=\"text\" class=\"form-input\" id=\"settingCompany\" placeholder=\"Nome da empresa\"></div>\n          <div class=\"form-group\"><label>Setor</label>\n            <select class=\"form-input\" id=\"settingSector\">\n              <option>Consultoria</option><option>Tecnologia</option><option>Varejo</option>\n              <option>Ind\u00fastria</option><option>Servi\u00e7os</option><option>Sa\u00fade</option>\n              <option>Educa\u00e7\u00e3o</option><option>Financeiro</option><option>Outros</option>\n            </select>\n          </div>\n          <button class=\"btn-primary\" onclick=\"saveSettings()\">\ud83d\udcbe Salvar Perfil</button>\n        </div>\n\n        <div class=\"card settings-card\">\n          <h3 class=\"settings-section-title\">\ud83c\udfa8 Apar\u00eancia</h3>\n          <div class=\"form-group\"><label>Tema</label>\n            <select class=\"form-input\" id=\"settingTheme\" onchange=\"applyTheme(this.value)\">\n              <option value=\"dark\">\ud83c\udf11 Dark (Padr\u00e3o)</option>\n              <option value=\"darker\">\u26ab Ultra Dark</option>\n              <option value=\"midnight\">\ud83d\udd35 Midnight Blue</option>\n            </select>\n          </div>\n          <div class=\"form-group\"><label>Moeda</label>\n            <select class=\"form-input\" id=\"settingCurrency\">\n              <option value=\"BRL\">\ud83c\udde7\ud83c\uddf7 Real (BRL)</option>\n              <option value=\"USD\">\ud83c\uddfa\ud83c\uddf8 D\u00f3lar (USD)</option>\n              <option value=\"EUR\">\ud83c\uddea\ud83c\uddfa Euro (EUR)</option>\n            </select>\n          </div>\n        </div>\n\n        <div class=\"card settings-card\">\n          <h3 class=\"settings-section-title\">\ud83d\uddc4\ufe0f Dados</h3>\n          <div class=\"data-info\">\n            <div class=\"data-info-row\"><span>Transa\u00e7\u00f5es salvas</span><strong id=\"settingTxCount\">0</strong></div>\n            <div class=\"data-info-row\"><span>Empresas analisadas</span><strong id=\"settingCompCount\">0</strong></div>\n            <div class=\"data-info-row\"><span>Armazenamento usado</span><strong id=\"settingStorage\">\u2014</strong></div>\n          </div>\n          <div style=\"display:flex;gap:10px;flex-wrap:wrap;margin-top:16px\">\n            <button class=\"btn-secondary\" onclick=\"exportAllData()\">\u2b07\ufe0f Exportar Dados</button>\n            <button class=\"btn-secondary\" onclick=\"importData()\">\u2b06\ufe0f Importar</button>\n            <button class=\"btn-danger-outline\" onclick=\"clearAllData()\">\ud83d\uddd1\ufe0f Limpar Tudo</button>\n          </div>\n          <input type=\"file\" id=\"importFileInput\" style=\"display:none\" accept=\".json\" onchange=\"handleImport(event)\">\n        </div>\n\n        <div class=\"card settings-card\">\n          <h3 class=\"settings-section-title\">\u2139\ufe0f Sobre a Landim Advisory</h3>\n          <div class=\"about-info\">\n            <p><strong>Dados:</strong> guardados na nuvem (Google Firebase), separados por empresa, com c\u00f3pia neste aparelho para abrir r\u00e1pido.</p>\n            <p><strong>Intelig\u00eancia do sistema:</strong> a leitura de boletos e notas e o CFO funcionam no pr\u00f3prio navegador, sem enviar seus documentos para IAs de terceiros.</p>\n            <p><strong>Backup:</strong> exporte todos os dados quando quiser, no cart\u00e3o Dados.</p>\n            <p style=\"margin-top:12px;color:var(--text-muted);font-size:13px\">D\u00favidas ou sugest\u00f5es: WhatsApp (61) 99210-5889.</p>\n          </div>\n        </div>\n      </div>\n    </section>\n\n  \n    <!-- ═══════════ CRM & VENDAS ═══════════ -->\n    <section class=\"view\" id=\"view-crm\" aria-label=\"CRM & Vendas\">\n      <div class=\"page-header\">\n        <div class=\"page-header-text\">\n          <h1>CRM & Vendas</h1>\n          <p class=\"page-subtitle\">Pipeline de Oportunidades e Leads</p>\n        </div>\n        <div class=\"page-header-actions\">\n          <button class=\"btn-primary\" onclick=\"openModalEl('crmModal')\">+ Novo Lead</button>\n        </div>\n      </div>\n      <div class=\"kanban-board\" id=\"crm-board\" style=\"display:flex;gap:20px;overflow-x:auto;padding-top:20px;min-height:400px;\"></div>\n    </section>\n\n    \n
    <!-- ═══════════ FINTECH E CRÉDITO ═══════════ -->
    <section class="view" id="view-fintech" aria-label="Fintech e Crédito">
      <div class="page-header">
        <div class="page-header-text">
          <h1>Hub Fintech</h1>
          <p class="page-subtitle">Transforme suas contas a receber em dinheiro na hora.</p>
        </div>
      </div>
      <div class="grid-2col" style="margin-top:20px;">
        <!-- Painel de Antecipação -->
        <div class="card" style="border: 1px solid rgba(99, 102, 241, 0.4);">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:24px;">
            <div style="padding:12px; background:rgba(99, 102, 241, 0.1); border-radius:12px; color:#818cf8;">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 style="font-size:18px; font-weight:bold; color:white;">Antecipação de Recebíveis</h2>
          </div>
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div>
              <label class="form-label">Valor da Fatura Futura (R$)</label>
              <input type="number" id="fintechAmount" value="15000" class="form-input" style="font-size:18px; padding:12px;">
            </div>
            <button class="btn-primary" id="btnAnticipate" style="width:100%; padding:14px; font-size:16px;" onclick="simulateAnticipation()">
              Simular Adiantamento
            </button>
          </div>
        </div>
        <!-- Resultado -->
        <div id="anticipationResult" style="display:none;" class="card">
          <div style="position:relative; overflow:hidden;">
            <div style="position:absolute; top:-40px; right:-40px; width:120px; height:120px; background:rgba(16, 185, 129, 0.1); border-radius:50%; filter:blur(30px);"></div>
            <h3 style="font-size:18px; font-weight:bold; color:#d1d5db; margin-bottom:16px;">Resumo da Operação</h3>
            
            <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
              <span style="color:#9ca3af;">Valor Original</span>
              <span style="color:white; font-weight:500;" id="antOriginal">R$ 0,00</span>
            </div>
            
            <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
              <span style="color:#ef4444;">Taxa de Desconto (3%)</span>
              <span style="color:#ef4444; font-weight:500;" id="antFee">- R$ 0,00</span>
            </div>
            
            <div style="display:flex; justify-content:space-between; padding:16px 0 0 0; margin-top:8px;">
              <span style="color:#d1d5db; font-weight:bold;">Valor Líquido creditado HOJE</span>
              <span style="font-size:28px; font-weight:900; color:#10b981;" id="antNet">R$ 0,00</span>
            </div>
            
            <div style="margin-top:32px; text-align:center; padding-top:16px; border-top:1px solid rgba(255,255,255,0.05);">
              <span style="display:inline-block; background:rgba(16,185,129,0.1); color:#34d399; font-size:12px; padding:4px 12px; border-radius:16px; border:1px solid rgba(16,185,129,0.2);">
                Pré-aprovado
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>


    <!-- ═══════════ ESTOQUE ═══════════ -->
    <section class="view" id="view-inventory" aria-label="Estoque Inteligente">
      <div class="page-header">
        <div class="page-header-text">
          <h1>Estoque Inteligente</h1>
          <p class="page-subtitle">Monitoramento proativo com CFO IA</p>
        </div>
        <div class="page-header-actions">
          <button class="btn-primary" onclick="openModalEl('invModal')">+ Novo Produto</button>
        </div>
      </div>
      
      <div id="inventoryAlertsContainer" style="display:none; margin-top:20px;">
        <div style="background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); padding:16px; border-radius:12px; display:flex; gap:12px; align-items:flex-start;">
          <svg style="width:24px; height:24px; color:#ef4444; flex-shrink:0;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 style="color:#f87171; font-weight:bold; margin-bottom:4px;">Atenção: Ação Necessária</h3>
            <p style="color:#fecaca; font-size:14px;" id="inventoryAlertText">Existem produtos abaixo do ponto de recompra!</p>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:20px">
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Produto / Serviço</th>
                <th style="text-align:center;">Qtd Atual</th>
                <th style="text-align:center;">Ponto de Recompra</th>
                <th style="text-align:right;">Status (IA)</th>
              </tr>
            </thead>
            <tbody id="inventory-table-body">
               <tr><td colspan="5" style="text-align:center; padding:32px; color:var(--text-muted);">Carregando Estoque...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>


    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 EQUIPE & WORKSPACES \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
    <section class=\"view\" id=\"view-team\" aria-label=\"Gest\u00e3o de Equipe\">
      <div class=\"page-header\">
        <div class=\"page-header-text\">
          <h1>Equipe & Workspaces</h1>
          <p class=\"page-subtitle\">Gerencie multi-usu\u00e1rios, acessos e auditoria</p>
        </div>
        <div class=\"page-header-actions\">
          <button class=\"btn-primary\" onclick=\"window.openTeamModal()\">+ Novo Usu\u00e1rio</button>
        </div>
      </div>
      <div class=\"grid-2col\" style=\"margin-top:20px;\">
        <div class=\"card\">
          <h3 class=\"card-title\">Membros do Workspace</h3>
          <table class=\"data-table\">
            <thead><tr><th>Nome</th><th>Papel</th><th>\u00daltimo Login</th><th>A\u00e7\u00f5es</th></tr></thead>
            <tbody>
              <tr><td>Jo\u00e3o Silva</td><td><span class=\"chip\" style=\"background:rgba(99,102,241,0.1);color:#818cf8\">Admin</span></td><td>Agora</td><td>Editar</td></tr>
              <tr><td>Maria Souza</td><td><span class=\"chip\" style=\"background:rgba(16,185,129,0.1);color:#34d399\">Operador</span></td><td>Ontem</td><td>Editar</td></tr>
              <tr><td>Contabilidade Externo</td><td><span class=\"chip\" style=\"background:rgba(245,158,11,0.1);color:#fbbf24\">Contador (Read-Only)</span></td><td>H\u00e1 2 dias</td><td>Editar</td></tr>
            </tbody>
          </table>
        </div>
        <div class=\"card\">
          <h3 class=\"card-title\">Trilha de Auditoria (Audit Trail)</h3>
          <div style=\"max-height: 250px; overflow-y: auto;\">
             <div style=\"padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);\"><span style=\"color:var(--text-muted); font-size:12px;\">Hoje 10:45</span> - <b>Jo\u00e3o Silva</b> aprovou pagamento de R$ 5.000,00</div>
             <div style=\"padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);\"><span style=\"color:var(--text-muted); font-size:12px;\">Ontem 16:20</span> - <b>Maria Souza</b> cadastrou nota de despesa</div>
             <div style=\"padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);\"><span style=\"color:var(--text-muted); font-size:12px;\">Ontem 15:10</span> - <b>Jo\u00e3o Silva</b> alterou permiss\u00f5es do contador</div>
          </div>
        </div>
      </div>
    </section>

    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 RH PROVIS\u00d5ES \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
    <section class=\"view\" id=\"view-hr\" aria-label=\"RH e Provis\u00f5es\">
      <div class=\"page-header\">
        <div class=\"page-header-text\">
          <h1>RH Financeiro & Provis\u00f5es</h1>
          <p class=\"page-subtitle\">Proje\u00e7\u00e3o autom\u00e1tica de F\u00e9rias, 13\u00ba e Encargos no fluxo de caixa</p>
        </div>
      </div>
      <div class=\"card\" style=\"margin-top:20px\">
         <div style=\"padding:40px; text-align:center; color:var(--text-muted)\"><div style=\"font-size:40px; margin-bottom:16px;\">\ud83d\udccb</div><h3>M\u00f3dulo Ativado</h3><p>Importe sua folha de pagamento para gerar as provis\u00f5es autom\u00e1ticas.</p></div>
      </div>
    </section>

    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 EMISS\u00c3O FISCAL NF-e \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
    <section class=\"view\" id=\"view-nfe\" aria-label=\"Emiss\u00e3o Fiscal\">
      <div class=\"page-header\">
        <div class=\"page-header-text\">
          <h1>Emiss\u00e3o Fiscal Integrada</h1>
          <p class=\"page-subtitle\">Conex\u00e3o direta com Prefeituras e SEFAZ</p>
        </div>
      </div>
      <div class=\"card\" style=\"margin-top:20px\">
         <div style=\"padding:40px; text-align:center; color:var(--text-muted)\"><div style=\"font-size:40px; margin-bottom:16px;\">\ud83e\uddfe</div><h3>Hub de Faturamento</h3><p>Configura\u00e7\u00e3o de Certificado A1/A3 necess\u00e1ria para in\u00edcio.</p><button class=\"btn-primary\" style=\"margin-top:16px\">Configurar Certificado</button></div>
      </div>
    </section>

    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 GEST\u00c3O DE ATIVOS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
    <section class=\"view\" id=\"view-assets\" aria-label=\"Gest\u00e3o de Ativos\">
      <div class=\"page-header\">
        <div class=\"page-header-text\">
          <h1>Gest\u00e3o de Ativos & Imobilizado</h1>
          <p class=\"page-subtitle\">Controle de ROI imobili\u00e1rio, deprecia\u00e7\u00e3o e transfer\u00eancias (Real Estate)</p>
        </div>
      </div>
      <div class=\"card\" style=\"margin-top:20px\">
         <div style=\"padding:40px; text-align:center; color:var(--text-muted)\"><div style=\"font-size:40px; margin-bottom:16px;\">\ud83c\udfd8\ufe0f</div><h3>Portf\u00f3lio Vazio</h3><p>Cadastre im\u00f3veis, maquin\u00e1rio ou frotas para calcular a deprecia\u00e7\u00e3o cont\u00e1bil e ITBI autom\u00e1tico.</p></div>
      </div>
    </section>

    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 AUDITORIA TRIBUT\u00c1RIA \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
    <section class=\"view\" id=\"view-tax-audit\" aria-label=\"Auditoria Tribut\u00e1ria\">
      <div class=\"page-header\">
        <div class=\"page-header-text\">
          <h1>Auditoria Tribut\u00e1ria Preditiva</h1>
          <p class=\"page-subtitle\">Cruzamento de notas com legisla\u00e7\u00e3o ICMS, ISS e PIS/COFINS</p>
        </div>
      </div>
      <div class=\"card\" style=\"margin-top:20px; border: 1px solid rgba(245, 158, 11, 0.3);\">
         <div style=\"display:flex; gap:16px; align-items:center;\">
           <div style=\"font-size:32px\">\u26a0\ufe0f</div>
           <div><h3 style=\"color:#fbbf24\">Nenhuma Inconsist\u00eancia Detectada</h3><p style=\"color:var(--text-muted)\">O motor de auditoria n\u00e3o encontrou risco de autua\u00e7\u00e3o nas \u00faltimas 300 notas analisadas.</p></div>
         </div>
      </div>
    </section>

    <!-- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 TERMOFINAN\u00c7A \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 -->
    <section class=\"view\" id=\"view-thermofinance\" aria-label=\"Termofinan\u00e7a IA\">
      <div class=\"page-header\">
        <div class=\"page-header-text\">
          <h1>Motor de Termofinan\u00e7a (IA N\u00edvel Global)</h1>
          <p class=\"page-subtitle\">C\u00e1lculo de Entropia Financeira e Equil\u00edbrio Din\u00e2mico Macro</p>
        </div>
      </div>
      <div class=\"grid-2col\" style=\"margin-top:20px;\">
         <div class=\"card\">
            <h3 class=\"card-title\">Matriz de Entropia</h3>
            <div style=\"height: 200px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.2); border-radius:12px; margin-top:16px; position:relative; overflow:hidden;\">
               <!-- Fake heatmap / radar visual for thermofinance -->
               <div style=\"width:100px; height:100px; background:radial-gradient(circle, rgba(99,102,241,0.8) 0%, rgba(16,185,129,0) 70%); filter:blur(10px); position:absolute; animation: pulse 3s infinite;\"></div>
               <span style=\"z-index:2; font-weight:bold; font-size:24px; color:white;\">0.82 \u0394S</span>
            </div>
         </div>
         <div class=\"card\">
            <h3 class=\"card-title\">Diagn\u00f3stico Macroecon\u00f4mico</h3>
            <ul style=\"list-style:none; padding:0; margin-top:16px; display:flex; flex-direction:column; gap:12px;\">
              <li style=\"padding:12px; background:rgba(16,185,129,0.1); border-left:3px solid #10b981; border-radius:4px;\"><b>Risco de Infla\u00e7\u00e3o:</b> Baixo. Prote\u00e7\u00e3o de capital otimizada.</li>
              <li style=\"padding:12px; background:rgba(245,158,11,0.1); border-left:3px solid #fbbf24; border-radius:4px;\"><b>Alavancagem:</b> Momento oportuno com Selic estabilizada.</li>
            </ul>
         </div>
      </div>
    </section>

    <!-- ═══════════ ORÇAMENTOS ═══════════ -->
    <section class="view" id="view-budget" aria-label="Orçamentos"></section>

    <!-- ═══════════ COBRANÇA ═══════════ -->
    <section class="view" id="view-billing" aria-label="Cobrança"></section>

    <!-- ═══════════ CHECKOUT ═══════════ -->
    <section class="view" id="view-checkout" aria-label="Checkout"></section>

    <!-- ═══════════ CONTADOR ═══════════ -->
    <section class="view" id="view-accountant" aria-label="Portal do Contador"></section>

    <!-- ═══════════ ASSINATURAS ═══════════ -->
    <section class="view" id="view-plans" aria-label="Assinaturas SaaS"></section>

    <!-- ═══════════ COMISSÕES ═══════════ -->
    <section class="view" id="view-commissions" aria-label="Comissões"></section>

    <!-- ═══════════ OS ═══════════ -->
    <section class="view" id="view-os" aria-label="Ordem de Serviço"></section>

    <!-- ═══════════ AUDITORIA ═══════════ -->
    <section class="view" id="view-audit" aria-label="Auditoria"></section>

</main>
</div>

<!-- ═══════════ MODAIS ═══════════ -->

<!-- Modal Transação -->
<div class="modal-overlay" id="txModal" role="dialog" aria-modal="true" aria-labelledby="txModalTitle">
  <div class="modal-box">
    <div class="modal-head">
      <div>
        <h2 class="modal-title" id="txModalTitle">Nova Receita</h2>
        <p class="modal-subtitle" id="txModalSubtitle">Preencha os dados do lançamento</p>
      </div>
      <button class="modal-x" onclick="closeModal('txModal')" aria-label="Fechar">✕</button>
    </div>
    <form id="txForm" onsubmit="window.submitTransaction(event)" novalidate>
      <div class="form-grid">
        <div class="form-field span-2">
          <label class="form-label" for="txDesc">Descrição *</label>
          <input type="text" class="form-input" id="txDesc" placeholder="Ex: Consultoria Financeira Mensal" required maxlength="120" autocomplete="off">
        </div>
        <div class="form-field">
          <label class="form-label" for="txAmount">Valor (R$) *</label>
          <input type="number" class="form-input" id="txAmount" placeholder="0,00" step="0.01" min="0.01" required>
        </div>
        <div class="form-field">
          <label class="form-label" for="txDate">Data *</label>
          <input type="date" class="form-input" id="txDate" required>
        </div>
        <div class="form-field">
          <label class="form-label" for="txCategory">Categoria</label>
          <select class="form-input" id="txCategory"></select>
        </div>
        <div class="form-field">
          <label class="form-label" for="txNotes">Observação</label>
          <input type="text" class="form-input" id="txNotes" placeholder="Opcional" maxlength="200">
        </div>
        <div class="form-field span-2">
          <label class="form-label" for="txAttachment">Anexo / Recibo (Opcional)</label>
          <input type="file" class="form-input" id="txAttachment" accept=".pdf,.png,.jpg,.jpeg">
        </div>
      </div>
      <input type="hidden" id="txType" value="RECEITA">
      <input type="hidden" id="txAttachmentUrl" value="">
      <input type="hidden" id="txEditId" value="">
      <div class="modal-foot">
        <button type="button" class="btn-ghost" onclick="closeModal('txModal')">Cancelar</button>
        <button type="submit" class="btn-primary" id="txSubmitBtn">Salvar Lançamento</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal Notificações -->
<div class="modal-overlay" id="notifModal" role="dialog" aria-modal="true">
  <div class="modal-box modal-sm">
    <div class="modal-head">
      <h2 class="modal-title">🔔 Notificações</h2>
      <button class="modal-x" onclick="closeModal('notifModal')">✕</button>
    </div>
    <div id="notifList" style="padding:8px 0"></div>
    <div class="modal-foot">
      <button class="btn-ghost" onclick="closeModal('notifModal')">Fechar</button>
    </div>
  </div>
</div>


<!-- Modal CRM -->
<div class="modal-overlay" id="crmModal" role="dialog" aria-modal="true">
  <div class="modal-box">
    <div class="modal-head">
      <h2 class="modal-title">👤 Novo Lead</h2>
      <button class="modal-x" onclick="closeModal('crmModal')">✕</button>
    </div>
    <form id="crmForm" onsubmit="window.submitLead(event)">
      <div class="form-grid">
        <div class="form-field span-2">
          <label class="form-label">Empresa / Cliente</label>
          <input type="text" class="form-input" id="crmName" required>
        </div>
        <div class="form-field">
          <label class="form-label">Valor Estimado (R$)</label>
          <input type="number" class="form-input" id="crmValue" required>
        </div>
        <div class="form-field">
          <label class="form-label">Risco</label>
          <select class="form-input" id="crmRisk">
            <option value="Baixo">Baixo</option>
            <option value="Moderado">Moderado</option>
            <option value="Alto">Alto</option>
          </select>
        </div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn-ghost" onclick="closeModal('crmModal')">Cancelar</button>
        <button type="submit" class="btn-primary">Salvar Lead</button>
      </div>
    </form>
  </div>
</div>


<!-- Modal Estoque -->
<div class="modal-overlay" id="invModal" role="dialog" aria-modal="true">
  <div class="modal-box">
    <div class="modal-head">
      <h2 class="modal-title">📦 Novo Produto</h2>
      <button class="modal-x" onclick="closeModal('invModal')">✕</button>
    </div>
    <form id="invForm" onsubmit="window.submitProduct(event)">
      <div class="form-grid">
        <div class="form-field span-2">
          <label class="form-label">Nome do Produto</label>
          <input type="text" class="form-input" id="invName" required>
        </div>
        <div class="form-field">
          <label class="form-label">Qtd Atual</label>
          <input type="number" class="form-input" id="invQty" required>
        </div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn-ghost" onclick="closeModal('invModal')">Cancelar</button>
        <button type="submit" class="btn-primary">Salvar Produto</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal OCR Magico -->
<div class="modal-overlay" id="ocrModal" role="dialog" aria-modal="true">
  <div class="modal-box">
    <div class="modal-head">
      <h2 class="modal-title">⚡ OCR Mágico (Leitura IA)</h2>
      <button class="modal-x" onclick="closeModal('ocrModal')">✕</button>
    </div>
    
    <div id="ocrUploadState">
      <p style="color:var(--text-muted); margin-bottom:16px">Faça o upload de uma Nota Fiscal (PDF, JPG, PNG) para extração inteligente de dados.</p>
      
      <div class="ocr-drop-zone" id="ocrDropZone" onclick="document.getElementById('ocrFileInput').click()">
        <div class="ocr-scanning-overlay" id="ocrScanningOverlay">
          <div class="laser-line"></div>
          <span style="font-size:32px; margin-bottom:16px">🧾</span>
          <h3 style="color:var(--primary); font-family:monospace">EXTRAINDO DADOS...</h3>
          <p style="font-family:monospace; color:#818cf8; font-size:12px; margin-top:8px">Rede Neural Ativa: Reconhecendo padrões fiscais</p>
        </div>
        
        <span class="ocr-icon-lg">📥</span>
        <h3 style="color:white">Arraste e solte sua Nota Fiscal aqui</h3>
        <p style="color:var(--text-muted); margin-top:8px">Ou clique para procurar (PDF, JPG, PNG)</p>
        <input type="file" id="ocrFileInput" style="display:none" accept=".pdf,image/*" onchange="handleOCRFile(event)">
      </div>
    </div>

    <div id="ocrReviewState" style="display:none">
      <div style="background:rgba(16,185,129,0.1); border:1px solid #10b981; border-radius:8px; padding:12px; margin-bottom:16px; display:flex; align-items:center; gap:12px">
        <span style="font-size:24px">✅</span>
        <div>
          <h4 style="color:#10b981; margin:0">Leitura Concluída com Sucesso</h4>
          <p style="font-size:12px; color:var(--text-muted); margin:0">Confirme os dados extraídos antes de salvar no financeiro.</p>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-field span-2">
          <label class="form-label">Fornecedor / Descrição</label>
          <input type="text" class="form-input" id="ocrExtractedDesc" value="Serviços de Computação em Nuvem - AWS">
        </div>
        <div class="form-field">
          <label class="form-label">CNPJ</label>
          <input type="text" class="form-input" id="ocrExtractedCnpj" value="23.413.399/0001-44">
        </div>
        <div class="form-field">
          <label class="form-label">Valor (R$)</label>
          <input type="number" class="form-input" id="ocrExtractedAmount" value="4530.00" step="0.01">
        </div>
        <div class="form-field">
          <label class="form-label">Data de Emissão</label>
          <input type="date" class="form-input" id="ocrExtractedDate">
        </div>
        <div class="form-field">
          <label class="form-label">Categoria</label>
          <select class="form-input" id="ocrExtractedCategory">
            <option value="Tecnologia">Tecnologia</option>
            <option value="Impostos">Impostos</option>
            <option value="Folha de Pagamento">Folha de Pagamento</option>
            <option value="Marketing">Marketing</option>
            <option value="Infraestrutura">Infraestrutura</option>
          </select>
        </div>
      </div>
      
      <div class="modal-foot" style="margin-top:20px">
        <button class="btn-ghost" onclick="resetOCR()">Descartar</button>
        <button class="btn-primary" onclick="saveOCRTransaction()">💾 Salvar Despesa</button>
      </div>
    </div>

</div>
</div>

<!-- Modal Billing -->
<div class="modal-overlay" id="billingModal" role="dialog" aria-modal="true">
  <div class="modal-box">
    <div class="modal-head">
      <h2 class="modal-title">💳 Nova Cobrança</h2>
      <button class="modal-x" onclick="closeModal('billingModal')">✕</button>
    </div>
    <form onsubmit="window.submitBillingForm(event)">
      <div class="form-grid">
        <div class="form-field span-2">
          <label class="form-label">Cliente</label>
          <input type="text" class="form-input" id="bilCliente" required>
        </div>
        <div class="form-field">
          <label class="form-label">Valor (R$)</label>
          <input type="number" class="form-input" id="bilValor" step="0.01" required>
        </div>
        <div class="form-field">
          <label class="form-label">Vencimento</label>
          <input type="date" class="form-input" id="bilVenc" required>
        </div>
        <div class="form-field">
          <label class="form-label">Tipo</label>
          <select class="form-input" id="bilTipo">
            <option>Pix</option>
            <option>Boleto</option>
          </select>
        </div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn-ghost" onclick="closeModal('billingModal')">Cancelar</button>
        <button type="submit" class="btn-primary">Emitir Cobrança</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal Checkout -->
<div class="modal-overlay" id="checkoutModal" role="dialog" aria-modal="true">
  <div class="modal-box">
    <div class="modal-head">
      <h2 class="modal-title">🔗 Novo Link de Checkout</h2>
      <button class="modal-x" onclick="closeModal('checkoutModal')">✕</button>
    </div>
    <form onsubmit="window.submitCheckoutForm(event)">
      <div class="form-grid">
        <div class="form-field span-2">
          <label class="form-label">Título / Produto</label>
          <input type="text" class="form-input" id="chkTitulo" required>
        </div>
        <div class="form-field span-2">
          <label class="form-label">Valor (R$)</label>
          <input type="number" class="form-input" id="chkValor" step="0.01" required>
        </div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn-ghost" onclick="closeModal('checkoutModal')">Cancelar</button>
        <button type="submit" class="btn-primary">Gerar Link</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal Plan -->
<div class="modal-overlay" id="planModal" role="dialog" aria-modal="true">
  <div class="modal-box">
    <div class="modal-head">
      <h2 class="modal-title">🔄 Nova Assinatura</h2>
      <button class="modal-x" onclick="closeModal('planModal')">✕</button>
    </div>
    <form onsubmit="window.submitPlanForm(event)">
      <div class="form-grid">
        <div class="form-field span-2">
          <label class="form-label">Cliente</label>
          <input type="text" class="form-input" id="planCliente" required>
        </div>
        <div class="form-field">
          <label class="form-label">Plano</label>
          <select class="form-input" id="planNome" onchange="document.getElementById('planValor').value = this.options[this.selectedIndex].dataset.price" required>
            <option value="">Selecione...</option>
            <option value="Básico" data-price="99.00">Básico</option>
            <option value="Médio" data-price="199.00">Médio</option>
            <option value="Ultimate" data-price="499.00">Ultimate</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">MRR (Mensalidade)</label>
          <input type="number" class="form-input" id="planValor" step="0.01" required>
        </div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn-ghost" onclick="closeModal('planModal')">Cancelar</button>
        <button type="submit" class="btn-primary">Criar Assinatura</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal Commission -->
<div class="modal-overlay" id="commModal" role="dialog" aria-modal="true">
  <div class="modal-box">
    <div class="modal-head">
      <h2 class="modal-title">💰 Registrar Comissão</h2>
      <button class="modal-x" onclick="closeModal('commModal')">✕</button>
    </div>
    <form onsubmit="window.submitCommForm(event)">
      <div class="form-grid">
        <div class="form-field span-2">
          <label class="form-label">Vendedor / Representante</label>
          <input type="text" class="form-input" id="commVendedor" required>
        </div>
        <div class="form-field">
          <label class="form-label">Base (R$ Faturados)</label>
          <input type="number" class="form-input" id="commBase" step="0.01" required>
        </div>
        <div class="form-field">
          <label class="form-label">Taxa (%)</label>
          <input type="number" class="form-input" id="commTaxa" step="0.1" required>
        </div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn-ghost" onclick="closeModal('commModal')">Cancelar</button>
        <button type="submit" class="btn-primary">Registrar</button>
      </div>
    </form>
  </div>
</div>

<!-- MISSING MODALS -->
<div class="modal-overlay" id="assetModal" role="dialog" aria-modal="true">
  <div class="modal-box">
    <div class="modal-head">
      <h2 class="modal-title">🏙️ Cadastrar Ativo</h2>
      <button class="modal-x" onclick="closeModal('assetModal')">×</button>
    </div>
    <form onsubmit="window.submitAsset(event)">
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-field span-2">
            <label class="form-label">Nome/Descrição</label>
            <input type="text" class="form-input" id="assetName" required>
          </div>
          <div class="form-field">
            <label class="form-label">Tipo de Ativo</label>
            <select class="form-input" id="assetType">
              <option value="Imóvel">Imóvel</option>
              <option value="Veículo">Veículo</option>
              <option value="Máquina">Máquina</option>
              <option value="Investimento">Investimento</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label">Valor (R$)</label>
            <input type="number" step="0.01" class="form-input" id="assetValue" required>
          </div>
          <div class="form-field">
            <label class="form-label">Vida Útil (Anos)</label>
            <input type="number" class="form-input" id="assetLife" required value="10">
          </div>
          <div class="form-field">
            <label class="form-label">Aluguel Mensal (R$)</label>
            <input type="number" step="0.01" class="form-input" id="assetRent" placeholder="Se aplicável">
          </div>
          <div class="form-field">
            <label class="form-label">Data de Aquisição</label>
            <input type="date" class="form-input" id="assetDate" required>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn-ghost" onclick="closeModal('assetModal')">Cancelar</button>
        <button type="submit" class="btn-primary">Salvar Ativo</button>
      </div>
    </form>
  </div>
</div>

<div class="modal-overlay" id="budgetModal" role="dialog" aria-modal="true">
  <div class="modal-box">
    <div class="modal-head">
      <h2 class="modal-title">🎯 Novo Orçamento</h2>
      <button class="modal-x" onclick="closeModal('budgetModal')">×</button>
    </div>
    <form onsubmit="window.submitBudgetForm(event)">
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-field">
            <label class="form-label">Nome do Cliente</label>
            <input type="text" class="form-input" id="budCliente" required>
          </div>
          <div class="form-field">
            <label class="form-label">Valor Total (R$)</label>
            <input type="number" step="0.01" class="form-input" id="budTotal" required>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn-ghost" onclick="closeModal('budgetModal')">Cancelar</button>
        <button type="submit" class="btn-primary">Criar Orçamento</button>
      </div>
    </form>
  </div>
</div>

<div class="modal-overlay" id="hrModal" role="dialog" aria-modal="true">
  <div class="modal-box">
    <div class="modal-head">
      <h2 class="modal-title">📋 Novo Colaborador</h2>
      <button class="modal-x" onclick="closeModal('hrModal')">×</button>
    </div>
    <form onsubmit="window.submitEmployee(event)">
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-field span-2">
            <label class="form-label">Nome Completo</label>
            <input type="text" class="form-input" id="hrName" required>
          </div>
          <div class="form-field">
            <label class="form-label">Cargo</label>
            <input type="text" class="form-input" id="hrRole" required>
          </div>
          <div class="form-field">
            <label class="form-label">Salário Bruto (CLT)</label>
            <input type="number" step="0.01" class="form-input" id="hrSalary" required>
          </div>
          <div class="form-field">
            <label class="form-label">Data de Admissão</label>
            <input type="date" class="form-input" id="hrDate" required>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn-ghost" onclick="closeModal('hrModal')">Cancelar</button>
        <button type="submit" class="btn-primary">Registrar Colaborador</button>
      </div>
    </form>
  </div>
</div>

<div class="modal-overlay" id="teamModal" role="dialog" aria-modal="true">
  <div class="modal-box">
    <div class="modal-head">
      <h2 class="modal-title" id="teamModalTitle">👤 Convidar Membro</h2>
      <button class="modal-x" onclick="closeModal('teamModal')">x</button>
    </div>
    <form id="teamForm" onsubmit="window.submitTeamMember(event)">
      <input type="hidden" id="tmId" value="">
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-field">
            <label class="form-label">Nome</label>
            <input type="text" class="form-input" id="tmNome" required>
          </div>
          <div class="form-field">
            <label class="form-label">Email</label>
            <input type="email" class="form-input" id="tmEmail" required>
          </div>
          <div class="form-field" style="grid-column: span 2">
            <label class="form-label">Nível de Acesso (Cargo principal)</label>
            <select class="form-input" id="tmRole">
              <option value="Admin">Administrador</option>
              <option value="Operador">Operador (Financeiro)</option>
              <option value="Visualizador">Visualizador (Somente Leitura)</option>
              <option value="Contador (Read-Only)">Contador (Read-Only)</option>
            </select>
          </div>
          
          <!-- Permissions Matrix -->
          <div class="form-field" style="grid-column: span 2; margin-top: 10px;">
            <label class="form-label">Permissões de Módulos</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); cursor: pointer;">
                <input type="checkbox" class="perm-checkbox" value="dashboard" checked> Dashboard & BI
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); cursor: pointer;">
                <input type="checkbox" class="perm-checkbox" value="finance" checked> Financeiro (Contas)
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); cursor: pointer;">
                <input type="checkbox" class="perm-checkbox" value="crm" checked> CRM & Vendas
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); cursor: pointer;">
                <input type="checkbox" class="perm-checkbox" value="inventory"> Estoque
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); cursor: pointer;">
                <input type="checkbox" class="perm-checkbox" value="nfe"> NF-e (Emissão)
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-muted); cursor: pointer;">
                <input type="checkbox" class="perm-checkbox" value="os"> Ordens de Serviço
              </label>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn-ghost" onclick="closeModal('teamModal')">Cancelar</button>
        <button type="submit" class="btn-primary">Enviar Convite</button>
      </div>
    </form>
  </div>
</div>

<!-- TOAST -->
<div id="toastContainer" aria-live="polite" aria-atomic="true"></div>



`;
