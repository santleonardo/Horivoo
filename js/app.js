/**
 * app.js — Ponto de entrada da aplicação
 *
 * FIXES aplicados:
 * - getSession() agora é await (suporta token refresh automático)
 * - Credenciais injetadas antes de qualquer import usar window.__SB_*
 * - Roteamento de abas sem duplicação de lógica
 */

import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { initTeacherPanel }     from './teacher.js';
import { initStudentPanel }     from './student.js';
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
// CALLBACK DE AUTENTICAÇÃO (link de e-mail → #access_token=...)
// ================================================================

function handleAuthCallback() {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return false;

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get('access_token');
  if (!accessToken) return false;

  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) throw new Error('JWT inválido');
    const payload = JSON.parse(atob(parts[1]));

    const session = {
      access_token:  accessToken,
      refresh_token: params.get('refresh_token') || '',
      expires_at: params.get('expires_at')
        ? parseInt(params.get('expires_at'))
        : Math.floor(Date.now() / 1000 + 3600),
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
    return true;
  } catch (err) {
    console.error('[Auth Callback]', err);
    return false;
  }
}

// ================================================================
// ROTEAMENTO DE ABAS
// ================================================================

let initialized = { teacher: false, student: false, coordinator: false };

function switchTab(tab) {
  document.querySelectorAll('.header-nav button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  ['teacher', 'student', 'coordinator'].forEach(t => {
    const el = document.getElementById(`${t}-panel`);
    if (el) el.style.display = t === tab ? '' : 'none';
  });

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
// TELAS
// ================================================================

function showScreen(screenId) {
  ['config-screen', 'login-screen', 'app-main'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === screenId ? '' : 'none';
  });
  const navEl = document.querySelector('.header-nav');
  if (navEl) navEl.style.display = screenId === 'app-main' ? '' : 'none';
}

// ================================================================
// UI DE AUTENTICAÇÃO
// ================================================================

function setupAuthUI() {
  const loginTabs  = document.querySelectorAll('#login-screen .auth-tab');
  const loginForm  = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const forgotForm = document.getElementById('forgot-form');

  loginTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      loginTabs.forEach(t => t.classList.toggle('active', t === tab));
      if (loginForm)  loginForm.style.display  = tab.dataset.auth === 'login'  ? '' : 'none';
      if (signupForm) signupForm.style.display = tab.dataset.auth === 'signup' ? '' : 'none';
      if (forgotForm) forgotForm.style.display = 'none';
    });
  });

  // Helpers de botão
  function setBtnState(id, loading, loadingText, defaultText) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? loadingText : defaultText;
  }

  // ── LOGIN ──
  document.getElementById('login-btn')?.addEventListener('click', async () => {
    const email    = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    if (!email || !password) { toast('Preencha e-mail e senha.', 'error'); return; }

    setBtnState('login-btn', true, 'Entrando...', 'Entrar');
    try {
      await signIn(email, password);
      toast('Login realizado!', 'success');
      setTimeout(() => location.reload(), 300);
    } catch (err) {
      const map = {
        'Invalid login credentials': 'E-mail ou senha incorretos.',
        'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
      };
      const msg = Object.entries(map).find(([k]) => err.message.includes(k))?.[1] || err.message;
      toast(msg, 'error');
    } finally {
      setBtnState('login-btn', false, '', 'Entrar');
    }
  });

  // ── SIGNUP ──
  document.getElementById('signup-btn')?.addEventListener('click', async () => {
    const name     = document.getElementById('signup-name')?.value.trim();
    const email    = document.getElementById('signup-email')?.value.trim();
    const password = document.getElementById('signup-password')?.value;
    const confirm  = document.getElementById('signup-confirm')?.value;

    if (!name || !email || !password) { toast('Preencha todos os campos.', 'error'); return; }
    if (password.length < 6)          { toast('Senha deve ter ao menos 6 caracteres.', 'error'); return; }
    if (password !== confirm)          { toast('As senhas não coincidem.', 'error'); return; }

    setBtnState('signup-btn', true, 'Criando conta...', 'Criar conta');
    try {
      const result = await signUp(email, password, name);
      if (result.session) {
        toast('Conta criada!', 'success');
        setTimeout(() => location.reload(), 300);
      } else {
        toast('Conta criada! Verifique seu e-mail para confirmar.', 'success', 6000);
        loginTabs[0]?.click();
      }
    } catch (err) {
      const msg = err.message.includes('already registered')
        ? 'Este e-mail já está cadastrado.'
        : err.message;
      toast(msg, 'error');
    } finally {
      setBtnState('signup-btn', false, '', 'Criar conta');
    }
  });

  // ── ESQUECI A SENHA ──
  document.getElementById('forgot-btn')?.addEventListener('click', () => {
    if (loginForm)  loginForm.style.display  = 'none';
    if (signupForm) signupForm.style.display = 'none';
    if (forgotForm) forgotForm.style.display = '';
    loginTabs.forEach(t => t.style.display = 'none');
  });

  document.getElementById('back-to-login-btn')?.addEventListener('click', () => {
    if (forgotForm) forgotForm.style.display = 'none';
    if (loginForm)  loginForm.style.display  = '';
    loginTabs.forEach(t => t.style.display = '');
    loginTabs[0]?.click();
  });

  document.getElementById('forgot-submit-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('forgot-email')?.value.trim();
    if (!email) { toast('Informe seu e-mail.', 'error'); return; }

    setBtnState('forgot-submit-btn', true, 'Enviando...', 'Enviar link');
    try {
      await forgotPassword(email);
      toast('Link de recuperação enviado!', 'success', 5000);
      document.getElementById('back-to-login-btn')?.click();
    } catch {
      toast('Erro ao enviar e-mail. Tente novamente.', 'error');
    } finally {
      setBtnState('forgot-submit-btn', false, '', 'Enviar link');
    }
  });

  // ── CONTINUAR COMO ALUNO (sem login) ──
  document.getElementById('guest-btn')?.addEventListener('click', () => {
    localStorage.setItem('horivoo_guest', 'true');
    showScreen('app-main');
    updateHeader();
    switchTab('student');
  });

  document.getElementById('login-from-header-btn')?.addEventListener('click', () => {
    localStorage.removeItem('horivoo_guest');
    showScreen('login-screen');
  });

  // ── LOGOUT ──
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    if (!confirm('Deseja sair da sua conta?')) return;
    await signOut();
    localStorage.removeItem('horivoo_guest');
    toast('Você saiu.', 'info');
    setTimeout(() => location.reload(), 300);
  });

  // Enter nos campos
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
  const user    = getUser();
  const isGuest = localStorage.getItem('horivoo_guest') === 'true';

  const guestEl    = document.getElementById('header-guest');
  const loginBtn   = document.getElementById('login-from-header-btn');
  const profEl     = document.getElementById('header-professor');
  const logoutBtn  = document.getElementById('logout-btn');
  const coordBadge = document.getElementById('header-coord-badge');

  if (user) {
    guestEl?.style  && (guestEl.style.display  = 'none');
    loginBtn?.style && (loginBtn.style.display  = 'none');
    if (profEl) {
      profEl.style.display = '';
      profEl.textContent   = user.user_metadata?.name || user.email;
    }
    logoutBtn?.style && (logoutBtn.style.display = '');

    if (coordBadge) {
      coordBadge.style.display = window.__IS_COORDINATOR ? '' : 'none';
    }
  } else if (isGuest) {
    guestEl?.style  && (guestEl.style.display  = '');
    loginBtn?.style && (loginBtn.style.display  = '');
    profEl?.style   && (profEl.style.display    = 'none');
    logoutBtn?.style && (logoutBtn.style.display = 'none');
    coordBadge?.style && (coordBadge.style.display = 'none');
  } else {
    ['guestEl','loginBtn','profEl','logoutBtn','coordBadge'].forEach(name => {
      const el = { guestEl, loginBtn, profEl, logoutBtn, coordBadge }[name];
      if (el?.style) el.style.display = 'none';
    });
  }
}

// ================================================================
// INICIALIZAÇÃO
// ================================================================

document.addEventListener('DOMContentLoaded', async () => {

  // FIX: injetar override ANTES de qualquer coisa que use as credenciais
  // (o script inline do HTML já faz isso, mas garantimos aqui também)
  const savedUrl = localStorage.getItem('sb_url');
  const savedKey = localStorage.getItem('sb_key');
  if (savedUrl && savedKey) {
    window.__SB_URL = savedUrl;
    window.__SB_KEY = savedKey;
  }

  // Callback de link de e-mail (confirmação / reset de senha)
  const wasCallback = handleAuthCallback();
  if (wasCallback) toast('E-mail confirmado com sucesso!', 'success', 4000);

  // PWA
  await registerSW();
  setupNetworkStatus();
  setupInstallPrompt();
  window.__toast = toast;

  // Salvar config Supabase (tela de configuração)
  document.getElementById('save-config-btn')?.addEventListener('click', () => {
    const url = document.getElementById('config-url')?.value.trim();
    const key = document.getElementById('config-key')?.value.trim();
    if (!url || !key) { alert('Preencha URL e API Key.'); return; }
    localStorage.setItem('sb_url', url);
    localStorage.setItem('sb_key', key);
    location.reload();
  });

  if (!isConfigured()) {
    showScreen('config-screen');
    return;
  }

  setupAuthUI();

  document.querySelectorAll('.header-nav button[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const appMain = document.getElementById('app-main');
      if (appMain?.style.display !== 'none') switchTab(btn.dataset.tab);
    });
  });

  // Verificar sessão com suporte a refresh automático
  const session = await getSession();  // FIX: await para suportar refresh
  const isGuest = localStorage.getItem('horivoo_guest') === 'true';

  if (session) {
    const userId = session.user?.id;
    if (userId) {
      try {
        const coordinator = await getCoordinatorByUserId(userId);
        if (coordinator) {
          window.__COORDINATOR_ID   = coordinator.id;
          window.__COORDINATOR_NAME = coordinator.name;
          window.__IS_COORDINATOR   = true;
        } else {
          let teacher = await getTeacherByUserId(userId);
          if (!teacher) {
            const name  = session.user?.user_metadata?.name || session.user?.email?.split('@')[0] || 'Professor';
            const email = session.user?.email || '';
            try {
              teacher = await createTeacherProfile(userId, name, email);
              toast('Perfil recriado automaticamente.', 'success');
            } catch {
              toast('Erro ao carregar perfil. Faça login novamente.', 'error');
              await signOut();
              showScreen('login-screen');
              return;
            }
          }
          window.__TEACHER_ID   = teacher.id;
          window.__TEACHER_NAME = teacher.name;
          window.__IS_COORDINATOR = false;
        }
      } catch (err) {
        console.error('Erro ao buscar perfil:', err);
        toast('Erro ao carregar perfil.', 'error');
      }
    }

    showScreen('app-main');
    updateHeader();
    switchTab(window.__IS_COORDINATOR ? 'coordinator' : 'teacher');

  } else if (isGuest) {
    showScreen('app-main');
    updateHeader();
    switchTab('student');
  } else {
    showScreen('login-screen');
  }

  if (isStandalone()) {
    document.body.classList.add('standalone-mode');
  }
});
