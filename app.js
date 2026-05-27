/**
 * app.js — Ponto de entrada da aplicação
 * Controla autenticação, abas (Professor / Aluno / Coordenador) e inicialização.
 */

import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { initTeacherPanel } from './teacher.js';
import { initStudentPanel }  from './student.js';
import { initCoordinatorPanel } from './coordinator.js';
import { registerSW, setupInstallPrompt, setupNetworkStatus, getInitialTab, isStandalone } from './pwa.js';
import { signIn, signUp, signOut, getSession, isLoggedIn, getUser, forgotPassword } from './auth.js';
import { getTeacherByUserId, getCoordinatorByUserId, createTeacherProfile } from './api.js';
import { toast } from './ui.js';

// ================================================================
// VERIFICAÇÃO DE CONFIGURAÇÃO
// ================================================================

function isConfigured() {
  const url = window.__SB_URL || SUPABASE_URL;
  const key = window.__SB_KEY || SUPABASE_KEY;
  return (
    url !== 'SUA_URL_AQUI' &&
    key !== 'SUA_ANON_KEY_AQUI' &&
    url.startsWith('https://')
  );
}

// ================================================================
// HANDLER DE CALLBACK DE AUTENTICAÇÃO (#access_token=...)
// ================================================================

function handleAuthCallback() {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return false;

  const params = new URLSearchParams(hash.substring(1));
  const accessToken  = params.get('access_token');
  if (!accessToken) return false;

  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) throw new Error('JWT inválido');
    const payload = JSON.parse(atob(parts[1]));

    const session = {
      access_token: accessToken,
      refresh_token: params.get('refresh_token') || '',
      expires_at: params.get('expires_at') ? parseInt(params.get('expires_at')) : Math.floor(Date.now() / 1000 + 3600),
      user: {
        id: payload.sub,
        email: payload.email,
        email_confirmed: true,
        user_metadata: payload.user_metadata || {},
        aud: payload.aud,
        role: payload.role
      }
    };

    localStorage.setItem('horivoo_session', JSON.stringify(session));
    history.replaceState({}, '', window.location.pathname + window.location.search);
    console.log('[Auth Callback] Sessão salva. Tipo:', params.get('type'));
    return true;
  } catch (err) {
    console.error('[Auth Callback] Erro:', err);
    return false;
  }
}

// ================================================================
// ROTEAMENTO DE ABAS
// ================================================================

let currentTab  = 'teacher';
let initialized = { teacher: false, student: false, coordinator: false };

function switchTab(tab) {
  currentTab = tab;

  document.querySelectorAll('.header-nav button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  document.getElementById('teacher-panel').style.display     = tab === 'teacher' ? '' : 'none';
  document.getElementById('student-panel').style.display     = tab === 'student' ? '' : 'none';
  document.getElementById('coordinator-panel').style.display = tab === 'coordinator' ? '' : 'none';

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

  if (tab === 'coordinator' && !initialized.coordinator) {
    initialized.coordinator = true;
    initCoordinatorPanel();
  }
}

// ================================================================
// TELAS — mostrar / ocultar
// ================================================================

function showScreen(screenId) {
  ['config-screen', 'login-screen', 'app-main'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === screenId ? '' : 'none';
  });

  const navEl = document.querySelector('.header-nav');
  if (navEl) {
    navEl.style.display = screenId === 'app-main' ? '' : 'none';
  }
}

function showConfigScreen() { showScreen('config-screen'); }
function showLoginScreen()  { showScreen('login-screen'); }
function showApp()          { showScreen('app-main'); }

// ================================================================
// AUTENTICAÇÃO
// ================================================================

function setupAuthUI() {
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

  // Login
  document.getElementById('login-btn')?.addEventListener('click', async () => {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) { toast('Preencha e-mail e senha.', 'error'); return; }

    try {
      document.getElementById('login-btn').disabled = true;
      document.getElementById('login-btn').textContent = 'Entrando...';
      await signIn(email, password);
      toast('Login realizado com sucesso!', 'success');
      setTimeout(() => location.reload(), 300);
    } catch (err) {
      const msg = err.message.includes('Invalid login credentials') ? 'E-mail ou senha incorretos.'
        : err.message.includes('Email not confirmed') ? 'Confirme seu e-mail antes de entrar.'
        : err.message;
      toast(msg, 'error');
    } finally {
      document.getElementById('login-btn').disabled = false;
      document.getElementById('login-btn').textContent = 'Entrar';
    }
  });

  // Signup
  document.getElementById('signup-btn')?.addEventListener('click', async () => {
    const name     = document.getElementById('signup-name').value.trim();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm  = document.getElementById('signup-confirm').value;

    if (!name || !email || !password) { toast('Preencha todos os campos.', 'error'); return; }
    if (password.length < 6) { toast('A senha deve ter pelo menos 6 caracteres.', 'error'); return; }
    if (password !== confirm) { toast('As senhas não coincidem.', 'error'); return; }

    try {
      document.getElementById('signup-btn').disabled = true;
      document.getElementById('signup-btn').textContent = 'Criando conta...';
      const result = await signUp(email, password, name);
      if (result.session) {
        toast('Conta criada com sucesso!', 'success');
        setTimeout(() => location.reload(), 300);
      } else {
        toast('Conta criada! Verifique seu e-mail para confirmar.', 'success', 6000);
        loginTabs[0]?.click();
      }
    } catch (err) {
      const msg = err.message.includes('already registered') ? 'Este e-mail já está cadastrado.' : err.message;
      toast(msg, 'error');
    } finally {
      document.getElementById('signup-btn').disabled = false;
      document.getElementById('signup-btn').textContent = 'Criar conta';
    }
  });

  // Esqueceu a senha
  document.getElementById('forgot-btn')?.addEventListener('click', () => {
    loginForm.style.display = 'none';
    signupForm.style.display = 'none';
    document.getElementById('forgot-form').style.display = '';
    loginTabs.forEach(t => t.style.display = 'none');
  });

  document.getElementById('back-to-login-btn')?.addEventListener('click', () => {
    document.getElementById('forgot-form').style.display = 'none';
    loginForm.style.display = '';
    loginTabs.forEach(t => t.style.display = '');
    loginTabs[0]?.click();
  });

  document.getElementById('forgot-submit-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('forgot-email').value.trim();
    if (!email) { toast('Informe seu e-mail.', 'error'); return; }
    try {
      document.getElementById('forgot-submit-btn').disabled = true;
      document.getElementById('forgot-submit-btn').textContent = 'Enviando...';
      await forgotPassword(email);
      toast('E-mail de recuperação enviado!', 'success', 5000);
      document.getElementById('forgot-form').style.display = 'none';
      loginForm.style.display = '';
      loginTabs.forEach(t => t.style.display = '');
      loginTabs[0]?.click();
    } catch { toast('Erro ao enviar e-mail.', 'error'); }
    finally {
      document.getElementById('forgot-submit-btn').disabled = false;
      document.getElementById('forgot-submit-btn').textContent = 'Enviar link de recuperação';
    }
  });

  // Continuar como aluno
  document.getElementById('guest-btn')?.addEventListener('click', () => {
    localStorage.setItem('horivoo_guest', 'true');
    showApp();
    updateHeader();
    switchTab('student');
  });

  // Entrar a partir do header
  document.getElementById('login-from-header-btn')?.addEventListener('click', () => {
    localStorage.removeItem('horivoo_guest');
    showLoginScreen();
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    if (!confirm('Deseja sair da sua conta?')) return;
    await signOut();
    localStorage.removeItem('horivoo_guest');
    toast('Você saiu da conta.', 'info');
    setTimeout(() => location.reload(), 300);
  });

  // Enter key
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
// HEADER
// ================================================================

function updateHeader() {
  const user = getUser();
  const isGuest = localStorage.getItem('horivoo_guest') === 'true';
  const guestEl = document.getElementById('header-guest');
  const loginBtn = document.getElementById('login-from-header-btn');
  const profEl  = document.getElementById('header-professor');
  const logoutBtn = document.getElementById('logout-btn');

  if (user) {
    if (guestEl) guestEl.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'none';
    if (profEl) {
      profEl.style.display = '';
      profEl.textContent = user.user_metadata?.name || user.email;
    }
    if (logoutBtn) logoutBtn.style.display = '';
  } else if (isGuest) {
    if (guestEl) guestEl.style.display = '';
    if (loginBtn) loginBtn.style.display = '';
    if (profEl)  profEl.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
  } else {
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

  // Callback de autenticação
  const wasCallback = handleAuthCallback();
  if (wasCallback) toast('E-mail confirmado com sucesso!', 'success', 4000);

  await registerSW();
  setupNetworkStatus();
  setupInstallPrompt();
  window.__toast = toast;

  // Config Supabase
  document.getElementById('save-config-btn')?.addEventListener('click', () => {
    const url = document.getElementById('config-url').value.trim();
    const key = document.getElementById('config-key').value.trim();
    if (!url || !key) { alert('Preencha URL e API Key.'); return; }
    localStorage.setItem('sb_url', url);
    localStorage.setItem('sb_key', key);
    location.reload();
  });

  const savedUrl = localStorage.getItem('sb_url');
  const savedKey = localStorage.getItem('sb_key');
  if (savedUrl && savedKey) {
    window.__SB_URL = savedUrl;
    window.__SB_KEY = savedKey;
  }

  if (!isConfigured()) { showConfigScreen(); return; }

  setupAuthUI();

  // Bind navegação do header
  document.querySelectorAll('.header-nav button[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const appMain = document.getElementById('app-main');
      if (appMain && appMain.style.display !== 'none') {
        switchTab(btn.dataset.tab);
      }
    });
  });

  // Verificar sessão
  const session = getSession();
  const isGuest = localStorage.getItem('horivoo_guest') === 'true';

  if (session) {
    const userId = session.user?.id;
    if (userId) {
      try {
        // Verificar se é coordenador primeiro
        const coordinator = await getCoordinatorByUserId(userId);
        if (coordinator) {
          window.__COORDINATOR_ID = coordinator.id;
          window.__COORDINATOR_NAME = coordinator.name;
          window.__IS_COORDINATOR = true;
        } else {
          // Buscar perfil de professor
          let teacher = await getTeacherByUserId(userId);
          if (!teacher) {
            // Perfil não encontrado — recriar automaticamente
            const userName = session.user?.user_metadata?.name || session.user?.email?.split('@')[0] || 'Professor';
            const userEmail = session.user?.email || '';
            console.log('[App] Perfil de professor não encontrado, recriando...');
            try {
              teacher = await createTeacherProfile(userId, userName, userEmail);
              toast('Perfil recriado com sucesso!', 'success');
            } catch (createErr) {
              console.error('[App] Erro ao recriar perfil:', createErr);
              toast('Erro ao recriar perfil. Tente fazer login novamente.', 'error');
              await signOut();
              showLoginScreen();
              return;
            }
          }
          window.__TEACHER_ID = teacher.id;
          window.__TEACHER_NAME = teacher.name;
          window.__IS_COORDINATOR = false;
        }
      } catch (err) {
        console.error('Erro ao buscar perfil:', err);
        toast('Erro ao carregar perfil. Tente novamente.', 'error');
      }
    }

    showApp();
    updateHeader();

    // Direcionar para a aba correta
    if (window.__IS_COORDINATOR) {
      switchTab('coordinator');
    } else {
      switchTab('teacher');
    }

  } else if (isGuest) {
    showApp();
    updateHeader();
    switchTab('student');
  } else {
    showLoginScreen();
  }

  if (isStandalone()) {
    document.body.classList.add('standalone-mode');
  }
});
