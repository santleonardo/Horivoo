/**
 * pwa.ts — Registro do Service Worker + prompt de instalação
 */

import type { ToastType } from './types.js';

// ================================================================
// REGISTRO DO SERVICE WORKER
// ================================================================

export async function registerSW(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Worker não suportado neste browser.');
    return;
  }

  try {
    const reg: ServiceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[PWA] Service Worker registrado:', reg.scope);

    reg.addEventListener('updatefound', () => {
      const newWorker: ServiceWorker | null = reg.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner();
          }
        });
      }
    });

  } catch (err) {
    console.error('[PWA] Falha ao registrar SW:', err);
  }
}

// ================================================================
// BANNER DE ATUALIZAÇÃO DISPONÍVEL
// ================================================================

function showUpdateBanner(): void {
  const banner: HTMLDivElement = document.createElement('div');
  banner.id = 'update-banner';
  banner.innerHTML = `
    <span>🔄 Nova versão disponível!</span>
    <button onclick="location.reload()">Atualizar</button>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;opacity:.7;cursor:pointer;font-size:1rem">✕</button>
  `;
  Object.assign(banner.style, {
    position: 'fixed',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#1A1714',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    zIndex: '3000',
    fontSize: '0.875rem',
    boxShadow: '0 4px 20px rgba(0,0,0,.3)',
    whiteSpace: 'nowrap'
  } as CSSStyleDeclaration);

  const btn: HTMLButtonElement | null = banner.querySelector('button');
  if (btn) {
    btn.style.cssText = 'background:#2D6A4F;border:none;color:white;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:0.8rem;font-weight:600';
  }

  document.body.appendChild(banner);
}

// ================================================================
// PROMPT DE INSTALAÇÃO (Add to Home Screen)
// ================================================================

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installBtn: HTMLButtonElement | null = null;

// Interface para o evento beforeinstallprompt (não faz parte do TS padrão)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function setupInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    showInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    hideInstallButton();
    deferredPrompt = null;
    showInstallToast();
  });
}

function showInstallButton(): void {
  if (installBtn) return;

  installBtn = document.createElement('button');
  installBtn.id        = 'pwa-install-btn';
  installBtn.innerHTML = '📲 Instalar app';
  installBtn.className = 'btn btn-success';
  Object.assign(installBtn.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '3000',
    boxShadow: '0 4px 16px rgba(45,106,79,0.4)',
    fontSize: '0.85rem',
    padding: '10px 18px',
    animation: 'fadeUp 0.4s ease forwards'
  } as CSSStyleDeclaration);

  installBtn.addEventListener('click', triggerInstall);
  document.body.appendChild(installBtn);
}

function hideInstallButton(): void {
  if (installBtn) {
    installBtn.remove();
    installBtn = null;
  }
}

async function triggerInstall(): Promise<void> {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome }: { outcome: string } = await deferredPrompt.userChoice;
  console.log('[PWA] Resultado da instalação:', outcome);
  deferredPrompt = null;
  hideInstallButton();
}

function showInstallToast(): void {
  if (window.__toast) {
    window.__toast('App instalado com sucesso! 🎉', 'success', 4000);
  }
}

// ================================================================
// DETECÇÃO DE MODO STANDALONE (app instalado)
// ================================================================

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// ================================================================
// STATUS DE CONEXÃO — feedback visual online/offline
// ================================================================

export function setupNetworkStatus(): void {
  const show = (online: boolean): void => {
    let el: HTMLElement | null = document.getElementById('network-status');

    if (online) {
      el?.remove();
      return;
    }

    if (!el) {
      el = document.createElement('div');
      el.id = 'network-status';
      Object.assign(el.style, {
        position: 'fixed',
        top: '64px',
        left: '0',
        right: '0',
        background: '#C1440E',
        color: 'white',
        textAlign: 'center',
        padding: '8px',
        fontSize: '0.8rem',
        fontWeight: '600',
        zIndex: '500',
        letterSpacing: '0.03em'
      } as CSSStyleDeclaration);
      document.body.appendChild(el);
    }

    el.textContent = '⚠️ Sem conexão — exibindo dados em cache';
  };

  window.addEventListener('online',  () => show(true));
  window.addEventListener('offline', () => show(false));

  if (!navigator.onLine) show(false);
}

// ================================================================
// QUERY STRING: aba inicial (?tab=teacher ou ?tab=student)
// ================================================================

export function getInitialTab(): string {
  const params: URLSearchParams = new URLSearchParams(location.search);
  return params.get('tab') || 'teacher';
}
