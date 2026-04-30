import { defineContentScript } from 'wxt/utils/define-content-script';
import { mountOverlay } from './content/mount';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  // Use Shadow DOM to fully isolate our styles from the host page.
  cssInjectionMode: 'ui',
  async main(ctx) {
    if (window.top !== window.self) return; // Only mount in top frame.
    if (location.protocol === 'chrome-extension:') return;

    await mountOverlay(ctx);
  },
});
