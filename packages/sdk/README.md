# @fos/sdk

Drop-in embed SDK for sites that want to integrate Freedom of Speech comments natively. **Zero runtime dependencies** — single bundled file.

## Auto bootstrap (no JS required)

```html
<div id="fos-comments"></div>
<script src="https://cdn.example/sdk.auto.js"
        data-target="#fos-comments"
        data-url="auto"
        data-theme="auto"></script>
```

## Programmatic API

```ts
import { init } from '@fos/sdk';

const fos = init({
  container: '#fos-comments', // or HTMLElement
  url: window.location.href,  // optional, defaults to current URL canonicalized
  theme: 'auto',              // 'light' | 'dark' | 'auto'
  indexerUrl: 'https://api.thegraph.com/subgraphs/name/freedom-of-speech/fos',
});

const off = fos.on('comment', ({ count }) => {
  console.info(`thread now shows ${count} comments`);
});

// Single-page apps: re-target on navigation
fos.setUrl(newUrl);

// Cleanup
off();
fos.destroy();
```

## Build

```bash
pnpm --filter @fos/sdk build   # ESM + IIFE bundles in dist/
pnpm --filter @fos/sdk test    # vitest + happy-dom
```

The IIFE bundle exposes a global `FoS` for direct `<script>` use.
