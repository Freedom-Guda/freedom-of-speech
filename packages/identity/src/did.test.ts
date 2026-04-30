import { describe, expect, it } from 'vitest';
import { createDID, parseDID, resolveDID } from './did';

const fixedKey = new Uint8Array(32).fill(7);

describe('did:key derivation', () => {
  it('produces a deterministic did:key from a public key', () => {
    const a = createDID(fixedKey);
    const b = createDID(fixedKey);
    expect(a).toBe(b);
    expect(a.startsWith('did:key:z')).toBe(true);
  });

  it('round-trips through parseDID', () => {
    const did = createDID(fixedKey);
    const { publicKey } = parseDID(did);
    expect(publicKey).toEqual(fixedKey);
  });

  it('rejects keys of the wrong length', () => {
    expect(() => createDID(new Uint8Array(16))).toThrow(/32 bytes/);
    expect(() => createDID(new Uint8Array(64))).toThrow(/32 bytes/);
  });

  it('rejects malformed dids', () => {
    expect(() => parseDID('not-a-did')).toThrow();
    expect(() => parseDID('did:web:example.com')).toThrow();
  });

  it('resolves to a self-contained document', async () => {
    const did = createDID(fixedKey);
    const doc = await resolveDID(did);
    expect(doc.id).toBe(did);
    expect(doc.publicKey).toEqual(fixedKey);
  });
});
