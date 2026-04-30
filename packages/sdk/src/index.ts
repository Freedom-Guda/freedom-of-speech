// @fos/sdk — drop-in embed for sites that want native comments.
// Zero runtime dependencies. Single bundle. Renders directly into a host element.

export type Theme = 'light' | 'dark' | 'auto';

export interface InitOptions {
  container: string | HTMLElement;
  url?: string;
  theme?: Theme;
  locale?: string;
  /** Override for the indexer GraphQL endpoint. */
  indexerUrl?: string;
}

export type FoSEvent = 'comment' | 'auth' | 'error';
export type FoSEventHandler = (payload: unknown) => void;

export interface FoSInstance {
  destroy(): void;
  setUrl(url: string): void;
  setTheme(theme: Theme): void;
  on(event: FoSEvent, handler: FoSEventHandler): () => void;
  refresh(): Promise<void>;
}

const DEFAULT_INDEXER = 'https://api.thegraph.com/subgraphs/name/freedom-of-speech/fos';

export function init(options: InitOptions): FoSInstance {
  const root = resolveContainer(options.container);
  if (!root) {
    throw new Error(`@fos/sdk: container ${String(options.container)} not found`);
  }

  let url = options.url ?? canonicalUrl(window.location.href);
  let theme: Theme = options.theme ?? 'auto';
  const indexerUrl = options.indexerUrl ?? DEFAULT_INDEXER;
  const handlers: Record<FoSEvent, Set<FoSEventHandler>> = {
    comment: new Set(),
    auth: new Set(),
    error: new Set(),
  };

  const shadow = root.attachShadow({ mode: 'open' });
  const wrapper = document.createElement('div');
  wrapper.className = 'fos-embed';
  shadow.appendChild(injectStyles());
  shadow.appendChild(wrapper);

  const emit = (event: FoSEvent, payload: unknown) => {
    for (const h of handlers[event]) {
      try {
        h(payload);
      } catch (e) {
        if (event !== 'error') emit('error', e);
      }
    }
  };

  const render = (state: ViewState) => renderInto(wrapper, state, theme);
  const refresh = async (): Promise<void> => {
    render({ kind: 'loading', url });
    try {
      const comments = await fetchComments(indexerUrl, url);
      render({ kind: 'ready', url, comments });
      emit('comment', { count: comments.length });
    } catch (err) {
      render({ kind: 'error', url, message: getErrorMessage(err) });
      emit('error', err);
    }
  };

  void refresh();

  return {
    destroy() {
      wrapper.remove();
      // shadow root is implicit; clearing wrapper is enough for re-init.
      for (const set of Object.values(handlers)) set.clear();
    },
    setUrl(next: string) {
      url = canonicalUrl(next);
      void refresh();
    },
    setTheme(next: Theme) {
      theme = next;
      // Re-paint with current state; simplest is to re-fetch.
      void refresh();
    },
    on(event, handler) {
      handlers[event].add(handler);
      return () => handlers[event].delete(handler);
    },
    refresh,
  };
}

function resolveContainer(c: string | HTMLElement): HTMLElement | null {
  if (typeof c === 'string') return document.querySelector<HTMLElement>(c);
  return c;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'unknown error';
}

// ---- URL canonicalization (mirrors @fos/protocol) ----

const TRACKING = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'ref_src',
]);

export function canonicalUrl(input: string): string {
  const u = new URL(input);
  u.hash = '';
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING.has(key.toLowerCase())) u.searchParams.delete(key);
  }
  if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
    u.pathname = u.pathname.replace(/\/+$/, '');
  }
  u.hostname = u.hostname.toLowerCase();
  return u.toString();
}

// ---- Indexer query ----

interface SdkComment {
  id: string;
  did: string;
  cid: string;
  timestamp: number;
}

const QUERY = `query Thread($urlHash: Bytes!) {
  thread(id: $urlHash) {
    id
    commentCount
    comments(orderBy: timestamp, orderDirection: desc, first: 100) {
      id
      author { did }
      cid
      timestamp
    }
  }
}`;

interface IndexerResponse {
  data?: {
    thread?: {
      id: string;
      commentCount: string;
      comments: Array<{
        id: string;
        author: { did: string };
        cid: string;
        timestamp: string;
      }>;
    } | null;
  };
  errors?: Array<{ message: string }>;
}

async function fetchComments(indexerUrl: string, url: string): Promise<SdkComment[]> {
  const urlHash = await keccak256Hex(url);
  const res = await fetch(indexerUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { urlHash } }),
  });
  if (!res.ok) throw new Error(`indexer responded ${res.status}`);
  const json = (await res.json()) as IndexerResponse;
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  const thread = json.data?.thread;
  if (!thread) return [];
  return thread.comments.map((c) => ({
    id: c.id,
    did: c.author.did,
    cid: c.cid,
    timestamp: Number(c.timestamp) * 1000,
  }));
}

// ---- Hashing (Web Crypto SHA-256 hex; the relayer maps SHA-256→keccak256
// off the hot path). For this MVP we use SHA-256 to avoid adding a keccak
// implementation to a "zero dependencies" bundle. The contract does its
// own keccak server-side via the relayer. ----

async function keccak256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const bytes = new Uint8Array(buf);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return `0x${hex}`;
}

// ---- Rendering ----

type ViewState =
  | { kind: 'loading'; url: string }
  | { kind: 'ready'; url: string; comments: SdkComment[] }
  | { kind: 'error'; url: string; message: string };

function renderInto(target: HTMLElement, state: ViewState, theme: Theme): void {
  target.dataset['theme'] = theme;
  target.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'fos-header';
  header.innerHTML =
    '<h2>Comments</h2><p class="fos-url" data-fos-url></p>';
  const urlEl = header.querySelector<HTMLElement>('[data-fos-url]');
  if (urlEl) urlEl.textContent = state.url;
  target.appendChild(header);

  if (state.kind === 'loading') {
    const p = document.createElement('p');
    p.className = 'fos-status';
    p.textContent = 'Loading comments…';
    target.appendChild(p);
    return;
  }

  if (state.kind === 'error') {
    const p = document.createElement('p');
    p.className = 'fos-error';
    p.textContent = `Could not load comments: ${state.message}`;
    target.appendChild(p);
    return;
  }

  if (state.comments.length === 0) {
    const p = document.createElement('p');
    p.className = 'fos-status';
    p.textContent = 'No comments yet.';
    target.appendChild(p);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'fos-list';
  for (const c of state.comments) {
    const li = document.createElement('li');
    li.className = 'fos-item';
    const date = new Date(c.timestamp).toISOString();
    li.innerHTML = '<div class="fos-meta"><code class="fos-did"></code><time></time></div><a class="fos-cid" target="_blank" rel="noopener"></a>';
    const did = li.querySelector<HTMLElement>('.fos-did');
    if (did) did.textContent = shortDid(c.did);
    const time = li.querySelector<HTMLTimeElement>('time');
    if (time) {
      time.dateTime = date;
      time.textContent = date;
    }
    const link = li.querySelector<HTMLAnchorElement>('.fos-cid');
    if (link) {
      link.href = `https://ipfs.io/ipfs/${c.cid}`;
      link.textContent = `Read on IPFS (${c.cid.slice(0, 10)}…)`;
    }
    list.appendChild(li);
  }
  target.appendChild(list);
}

function shortDid(did: string): string {
  if (!did.startsWith('did:key:z')) return did;
  const tail = did.slice('did:key:z'.length);
  if (tail.length <= 12) return tail;
  return `${tail.slice(0, 6)}…${tail.slice(-4)}`;
}

function injectStyles(): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .fos-embed {
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      color: #111;
      background: #fff;
      padding: 16px;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      max-width: 720px;
    }
    .fos-embed[data-theme="dark"] {
      color: #f5f5f5;
      background: #0a0a0a;
      border-color: #1f1f1f;
    }
    @media (prefers-color-scheme: dark) {
      .fos-embed[data-theme="auto"] {
        color: #f5f5f5;
        background: #0a0a0a;
        border-color: #1f1f1f;
      }
    }
    .fos-header h2 { font-size: 16px; margin: 0 0 4px; font-weight: 600; }
    .fos-url { font-size: 11px; color: #888; margin: 0; word-break: break-all; }
    .fos-status, .fos-error { font-size: 14px; margin: 16px 0 0; }
    .fos-error { color: #c53030; }
    .fos-list { list-style: none; padding: 0; margin: 16px 0 0; display: grid; gap: 10px; }
    .fos-item { padding: 10px 12px; border: 1px solid currentColor; border-color: rgba(127,127,127,0.18); border-radius: 8px; }
    .fos-meta { display: flex; justify-content: space-between; font-size: 11px; color: #888; margin-bottom: 4px; }
    .fos-did { font-family: ui-monospace, "JetBrains Mono", monospace; }
    .fos-cid { font-size: 13px; color: inherit; text-decoration: none; }
    .fos-cid:hover { text-decoration: underline; }
  `;
  return style;
}
