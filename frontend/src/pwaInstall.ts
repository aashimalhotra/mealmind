// pwaInstall.ts - Manage PWA install prompt
// This module handles the BeforeInstallPromptEvent for PWA installation

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installAvailableCallbacks: (() => void)[] = [];

export function setDeferredPrompt(event: BeforeInstallPromptEvent) {
  deferredPrompt = event;
  // Notify all callbacks that install is now available
  installAvailableCallbacks.forEach(cb => cb());
  installAvailableCallbacks = [];
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function clearDeferredPrompt() {
  deferredPrompt = null;
}

export function onInstallAvailable(callback: () => void) {
  if (deferredPrompt) {
    // Already available, call immediately
    callback();
  } else {
    // Will be called when it becomes available
    installAvailableCallbacks.push(callback);
  }
}

export async function promptInstall(): Promise<boolean> {
  const prompt = getDeferredPrompt();
  if (!prompt) return false;
  
  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    
    if (outcome === 'accepted') {
      clearDeferredPrompt();
      return true;
    }
    
    // User dismissed, keep the prompt for later
    return false;
  } catch (error) {
    console.error('Error prompting for install:', error);
    return false;
  }
}

export function isInstallAvailable(): boolean {
  return deferredPrompt !== null;
}
