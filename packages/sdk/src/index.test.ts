// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { canonicalUrl, init } from './index';

describe('canonicalUrl', () => {
  it('strips tracking params', () => {
    expect(canonicalUrl('https://example.com/page?utm_source=tw&utm_campaign=spring&q=foo')).toBe(
      'https://example.com/page?q=foo',
    );
  });

  it('strips trailing slash from non-root paths', () => {
    expect(canonicalUrl('https://example.com/blog/post/')).toBe('https://example.com/blog/post');
  });

  it('preserves the root path slash', () => {
    expect(canonicalUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('strips fragments', () => {
    expect(canonicalUrl('https://example.com/page#section')).toBe('https://example.com/page');
  });

  it('lowercases the hostname', () => {
    expect(canonicalUrl('https://EXAMPLE.COM/page')).toBe('https://example.com/page');
  });
});

describe('init()', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: {
              thread: {
                id: '0xdeadbeef',
                commentCount: '1',
                comments: [
                  {
                    id: '0xfeed',
                    author: { did: 'did:key:z6MkExample1' },
                    cid: 'bafyExample',
                    timestamp: '1704067200',
                  },
                ],
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    container.remove();
  });

  it('mounts a shadow root and renders comments', async () => {
    const inst = init({ container, url: 'https://example.com/x', theme: 'dark' });
    // Yield until the async refresh resolves.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    const shadow = container.shadowRoot!;
    expect(shadow).toBeTruthy();
    const items = shadow.querySelectorAll('.fos-item');
    expect(items.length).toBe(1);
    expect(shadow.querySelector('.fos-did')?.textContent).toBe('6MkExample1');

    inst.destroy();
  });

  it('emits an error when the indexer fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('boom', { status: 500 })),
    );

    const errors: unknown[] = [];
    const inst = init({ container, url: 'https://example.com/y' });
    inst.on('error', (e) => errors.push(e));

    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(container.shadowRoot?.querySelector('.fos-error')?.textContent).toMatch(/500/);
    inst.destroy();
  });

  it('exposes a setUrl that re-fetches', async () => {
    const inst = init({ container, url: 'https://example.com/a' });
    await new Promise((r) => setTimeout(r, 0));
    inst.setUrl('https://example.com/b?utm_source=x');
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(container.shadowRoot?.querySelector('[data-fos-url]')?.textContent).toBe(
      'https://example.com/b',
    );
    inst.destroy();
  });
});
