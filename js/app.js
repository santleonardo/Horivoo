/**
 * app.js — Ponto de entrada da aplicação
 * Controla as abas (Professor / Aluno) e inicializa os módulos.
 */

import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { initTeacherPanel } from './teacher.js';
import { initStudentPanel }  from './student.js';
import { registerSW, setupInstallPrompt, setupNetworkStatus, getInitialTab, isStandalone } from './pwa.js';

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
// TELA DE CONFIGURAÇÃO
// ================================================================

function showConfigScreen() {
  document.getElementById('config-screen').style.display = '';
  document.getElementById('app-main').style.display = 'none';
}

function showApp() {
  document.getElementById('config-screen').style.display = 'none';
  document.getElementById('app-main').style.display = '';
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
  const { toast } = await import('./ui.js');
  window.__toast = toast;

  // Salvar configuração Supabase
  document.getElementById('save-config-btn')?.addEventListener('click', () => {
    const url = document.getElementById('config-url').value.trim();
    const key = document.getElementById('config-key').value.trim();

    if (!url || !key) {
      alert('Preencha URL e API Key do Supabase.');
      return;
    }

    // Persiste no localStorage (sobrevive ao fechar o app)
    localStorage.setItem('sb_url', url);
    localStorage.setItem('sb_key', key);
    location.reload();
  });

  // Recupera credenciais — localStorage persiste entre sessões
  const savedUrl = localStorage.getItem('sb_url');
  const savedKey = localStorage.getItem('sb_key');

  if (savedUrl && savedKey) {
    window.__SB_URL = savedUrl;
    window.__SB_KEY = savedKey;
  }

  if (!isConfigured() && !window.__SB_URL) {
    showConfigScreen();
    return;
  }

  showApp();

  // Bind de navegação
  document.querySelectorAll('.header-nav button[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Aba inicial via query string (suporte a shortcuts do PWA)
  const initialTab = getInitialTab();
  switchTab(initialTab);

  // Ajuste de UI quando rodando como app instalado
  if (isStandalone()) {
    document.body.classList.add('standalone-mode');
  }
});
