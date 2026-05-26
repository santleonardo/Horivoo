/**
 * app.js — Ponto de entrada da aplicação
 * Controla autenticação, abas (Professor / Aluno) e inicialização.
 */

import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { initTeacherPanel } from './teacher.js';
import { initStudentPanel }  from './student.js';
import { registerSW, setupInstallPrompt, setupNetworkStatus, getInitialTab, isStandalone } from './pwa.js';
import { signIn, signUp, signOut, getSession, isLoggedIn, getUser, forgotPassword } from './auth.js';
import { getTeacherByUserId } from './api.js';
import { toast } from './ui.js';

// ================================================================
// VERIFICAÇÃO DE CONFIGURAÇÃO
// ================================================================

function isConfigured() {
  return (
    SUPABASE_URL !== 'SUA_URL_AQUI' &&
    SUPABASE_KEY !== 'SUA_ANON_KEY_AQUI' &&
    SUPABASE_URL.startsWith('https://')
  );
}

// ================================================================
// ROTEAMENTO DE ABAS
// ================================================================

let currentTab  = 'teacher';
let initialized = { teacher: false, student: false };

function switchTab(tab) {
  currentTab = tab;

  document.querySelectorAll('.header-nav button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  document.getElementById('teacher-panel').style.display = tab === 'teacher' ? '' : 'none';
  document.getElementById('student-panel').style.display = tab === 'student' ? '' : 'none';

  // Atualiza URL sem reload (deep link PWA)
  const url = new URL(location.href);
  url.searchParams.set('tab', tab);
  history.replaceState({}, '', url);

  if (tab === 'teacher' && !initialized.teacher) {
    initialized.teacher = true;
    initTeacherPanel();
  }

  if (tab === 'student' && !initialized.student) {
    initialized.student = true;
    initStudentPanel();
  }
}

// ================================================================
// TELAS — mostrar / ocultar
// ================================================================

function showScreen(screenId) {
  ['config-screen', 'login-screen', 'app-main'].forEach(id => {
    document.getElementById(id).style.display = id === screenId ? '' : 'none';
  });
}

function showConfigScreen() { showScreen('config-screen'); }
function showLoginScreen()  { showScreen('login-screen'); }
function showApp()          { showScreen('app-main'); }

// ================================================================
// AUTENTICAÇÃO — Login / Signup
// ================================================================

function setupAuthUI() {
  // ---- Tabs do login (Entrar / Criar conta) ----
  const loginTabs = document.querySelectorAll('#login-screen .auth-tab');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  loginTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      loginTabs.forEach(t => t.classList.toggle('active', t === tab));
      loginForm.style.display  = tab.dataset.auth === 'login'  ? '' : 'none';
      signupForm.style.display = tab.dataset.auth === 'signup' ? '' : 'none';
    });
  });

  // ---- Login ----
  document.getElementById('login-btn')?.addEventListener('click', async () => {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      toast('Preencha e-mail e senha.', 'error');
      return;
    }

    try {
      document.getElementById('login-btn').disabled = true;
      document.getElementById('login-btn').textContent = 'Entrando...';

      await signIn(email, password);
      toast('Login realizado com sucesso!', 'success');

      setTimeout(() => location.reload(), 300);
    } catch (err) {
      console.error(err);
      const msg = err.message.includes('Invalid login credentials')
        ? 'E-mail ou senha incorretos.'
        : err.message.includes('Email not confirmed')
        ? 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.'
        : err.message;
      toast(msg, 'error');
    } finally {
      document.getElementById('login-btn').disabled = false;
      document.getElementById('login-btn').textContent = 'Entrar';
    }
  });

  // ---- Signup ----
  document.getElementById('signup-btn')?.addEventListener('click', async () => {
    const name     = document.getElementById('signup-name').value.trim();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm  = document.getElementById('signup-confirm').value;

    if (!name || !email || !password) {
      toast('Preencha todos os campos.', 'error');
      return;
    }

    if (password.length < 6) {
      toast('A senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }

    if (password !== confirm) {
      toast('As senhas não coincidem.', 'error');
      return;
    }

    try {
      document.getElementById('signup-btn').disabled = true;
      document.getElementById('signup-btn').textContent = 'Criando conta...';

      const result = await signUp(email, password, name);

      if (result.session) {
        // Email confirmation desativado — login automático
        toast('Conta criada com sucesso!', 'success');
        setTimeout(() => location.reload(), 300);
      } else {
        // Email confirmation ativado — precisa confirmar
        toast('Conta criada! Verifique seu e-mail para confirmar e depois faça login.', 'success', 5000);
        // Volta para a tab de login
        loginTabs[0].click();
      }
    } catch (err) {
      console.error(err);
      const msg = err.message.includes('already registered')
        ? 'Este e-mail já está cadastrado. Faça login.'
        : err.message;
      toast(msg, 'error');
    } finally {
      document.getElementById('signup-btn').disabled = false;
      document.getElementById('signup-btn').textContent = 'Criar conta';
    }
  });

  // ---- Esqueceu a senha ----
  document.getElementById('forgot-btn')?.addEventListener('click', () => {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('forgot-form').style.display = '';
    // Esconde tabs
    loginTabs.forEach(t => t.style.display = 'none');
  });

  document.getElementById('back-to-login-btn')?.addEventListener('click', () => {
    document.getElementById('forgot-form').style.display = 'none';
    document.getElementById('login-form').style.display = '';
    loginTabs.forEach(t => t.style.display = '');
    loginTabs[0].click();
  });

  document.getElementById('forgot-submit-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('forgot-email').value.trim();
    if (!email) {
      toast('Informe seu e-mail.', 'error');
      return;
    }
    try {
      document.getElementById('forgot-submit-btn').disabled = true;
      document.getElementById('forgot-submit-btn').textContent = 'Enviando...';
      await forgotPassword(email);
      toast('E-mail de recuperação enviado! Verifique sua caixa de entrada.', 'success', 5000);
      // Volta para login
      document.getElementById('forgot-form').style.display = 'none';
      document.getElementById('login-form').style.display = '';
      loginTabs.forEach(t => t.style.display = '');
      loginTabs[0].click();
    } catch (err) {
      toast('Erro ao enviar e-mail. Verifique o endereço informado.', 'error');
    } finally {
      document.getElementById('forgot-submit-btn').disabled = false;
      document.getElementById('forgot-submit-btn').textContent = 'Enviar link de recuperação';
    }
  });

  // ---- Continuar como aluno ----
  document.getElementById('guest-btn')?.addEventListener('click', () => {
    localStorage.setItem('horivoo_guest', 'true');
    showApp();
    updateHeader();

    // Bind de navegação
    document.querySelectorAll('.header-nav button[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    switchTab('student');
  });

  // ---- Entrar a partir do header (convidado) ----
  document.getElementById('login-from-header-btn')?.addEventListener('click', () => {
    localStorage.removeItem('horivoo_guest');
    showLoginScreen();
  });

  // ---- Logout ----
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    if (!confirm('Deseja sair da sua conta?')) return;
    await signOut();
    localStorage.removeItem('horivoo_guest');
    toast('Você saiu da conta.', 'info');
    setTimeout(() => location.reload(), 300);
  });

  // ---- Enter key nos formulários ----
  ['login-email', 'login-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('login-btn')?.click();
    });
  });

  ['signup-name', 'signup-email', 'signup-password', 'signup-confirm'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('signup-btn')?.click();
    });
  });
}

// ================================================================
// HEADER — atualizar com info do professor logado
// ================================================================

function updateHeader() {
  const user = getUser();
  const isGuest = localStorage.getItem('horivoo_guest') === 'true';
  const guestEl = document.getElementById('header-guest');
  const loginBtn = document.getElementById('login-from-header-btn');
  const profEl  = document.getElementById('header-professor');
  const logoutBtn = document.getElementById('logout-btn');

  if (user) {
    // Professor logado
    if (guestEl) guestEl.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'none';
    if (profEl) {
      profEl.style.display = '';
      profEl.textContent = user.user_metadata?.name || user.email;
    }
    if (logoutBtn) logoutBtn.style.display = '';
  } else if (isGuest) {
    // Visitante / aluno — mostrar botão de login
    if (guestEl) guestEl.style.display = '';
    if (loginBtn) loginBtn.style.display = '';
    if (profEl)  profEl.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
  } else {
    // Sem sessão
    if (guestEl) guestEl.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'none';
    if (profEl)  profEl.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

// ================================================================
// INICIALIZAÇÃO
// ================================================================

document.addEventListener('DOMContentLoaded', async () => {

  // Registra Service Worker (PWA)
  await registerSW();

  // Setup de status de rede (banner offline)
  setupNetworkStatus();

  // Setup do botão de instalação
  setupInstallPrompt();

  // Expõe toast globalmente para pwa.js usar
  window.__toast = toast;

  // Salvar configuração Supabase
  document.getElementById('save-config-btn')?.addEventListener('click', () => {
    const url = document.getElementById('config-url').value.trim();
    const key = document.getElementById('config-key').value.trim();

    if (!url || !key) {
      alert('Preencha URL e API Key do Supabase.');
      return;
    }

    localStorage.setItem('sb_url', url);
    localStorage.setItem('sb_key', key);
    location.reload();
  });

  // Recupera credenciais
  const savedUrl = localStorage.getItem('sb_url');
  const savedKey = localStorage.getItem('sb_key');

  if (savedUrl && savedKey) {
    window.__SB_URL = savedUrl;
    window.__SB_KEY = savedKey;
  }

  // Passo 1: Verificar configuração do Supabase
  if (!isConfigured() && !window.__SB_URL) {
    showConfigScreen();
    return;
  }

  // Setup dos formulários de autenticação
  setupAuthUI();

  // Passo 2: Verificar se está logado ou é visitante
  const session = getSession();
  const isGuest = localStorage.getItem('horivoo_guest') === 'true';

  if (session) {
    // Professor logado — verificar se tem perfil de teacher
    const userId = session.user?.id;
    if (userId) {
      try {
        const teacher = await getTeacherByUserId(userId);
        if (!teacher) {
          toast('Perfil de professor não encontrado. Tente fazer login novamente.', 'error');
          await signOut();
          showLoginScreen();
          return;
        }
        // Salvar ID do teacher para o módulo teacher.js usar
        window.__TEACHER_ID = teacher.id;
        window.__TEACHER_NAME = teacher.name;
      } catch (err) {
        console.error('Erro ao buscar perfil:', err);
        toast('Erro ao carregar perfil. Tente novamente.', 'error');
      }
    }

    showApp();
    updateHeader();

    // Bind de navegação
    document.querySelectorAll('.header-nav button[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Professor logado: iniciar na aba Professor
    switchTab('teacher');

  } else if (isGuest) {
    // Visitante (aluno) — ir direto para a aba aluno
    showApp();
    updateHeader();

    document.querySelectorAll('.header-nav button[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    switchTab('student');

  } else {
    // Nem logado, nem visitante — mostrar tela de login
    showLoginScreen();
  }

  // Ajuste de UI quando rodando como app instalado
  if (isStandalone()) {
    document.body.classList.add('standalone-mode');
  }
});
