// URL canonicalization + content-addressing for the browser extension.
// Re-exports from @fos/protocol once that package lands; for now we keep a
// local copy so the extension can build before prompt #3 finishes.

const TRACKING_PARAMS = new Set([
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

export function canonicalizeURL(input: string): string {
  const u = new URL(input);
  u.hash = '';
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) u.searchParams.delete(key);
  }
  if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
    u.pathname = u.pathname.replace(/\/+$/, '');
  }
  u.hostname = u.hostname.toLowerCase();
  return u.toString();
}

export function urlToHash(canonical: string): string {
  // Web-Crypto SHA-256 hex. The on-chain contract uses keccak256 — we
  // recompute keccak in the protocol package before posting; this hash is
  // only used as a client-side cache key.
  // (Sync wrapper would require keccak; we expose async too below.)
  return simpleHashHex(canonical);
}

export async function urlToKeccak(canonical: string): Promise<string> {
  const { keccak256, toUtf8Bytes } = await import('@fos/protocol/keccak');
  return keccak256(toUtf8Bytes(canonical));
}

function simpleHashHex(s: string): string {
  // FNV-1a 32-bit, hex string. Adequate as a local cache key, NOT a
  // cryptographic identifier. The chain uses keccak256.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
