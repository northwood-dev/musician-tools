import '@testing-library/jest-dom';

// jsdom does not implement matchMedia; provide a minimal stub so components that read
// prefers-color-scheme (e.g. Header's dark-mode init) can render in tests.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
import { installConsoleGuard } from './consoleGuard';

// #174: fail a test that prints forbidden console noise (see consoleGuard.ts).
installConsoleGuard();

// jsdom 20 has <dialog> but not showModal() / close() (#187's help window uses the native
// element). Minimal stand-ins: they only toggle `open`, which is what the tests observe;
// modality and the focus trap are the browser's job, checked in Chrome.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
