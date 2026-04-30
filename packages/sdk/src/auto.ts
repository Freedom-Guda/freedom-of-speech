// Auto-bootstrap entrypoint. Sites can drop in:
//   <div id="fos-comments"></div>
//   <script src="https://cdn.example/sdk.js" data-url="auto" data-theme="auto"></script>
// and get a working embed without writing any JS.

import { init, type Theme } from './index';

function ready(fn: () => void) {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn, { once: true });
}

ready(() => {
  // Find the script that included us so we can read its data-* attrs.
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'));
  const own = scripts.reverse().find((s) => /\/sdk\.[^/]*\.js$/.test(s.src) || /\/auto\.js$/.test(s.src));

  const dataset = own?.dataset ?? {};
  const containerSelector = dataset.target ?? '#fos-comments';
  const url = dataset.url && dataset.url !== 'auto' ? dataset.url : window.location.href;
  const theme = (dataset.theme ?? 'auto') as Theme;

  const container = document.querySelector<HTMLElement>(containerSelector);
  if (!container) return;

  init({ container, url, theme });
});
