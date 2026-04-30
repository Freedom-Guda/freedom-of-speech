import { describe, expect, it } from 'vitest';
import {
  buildPairingPayload,
  isPairingValid,
  reconstructKey,
  splitKey,
} from './crossDevice';

const sampleKey = (() => {
  const k = new Uint8Array(32);
  for (let i = 0; i < 32; i++) k[i] = i + 1;
  return k;
})();

describe('Shamir secret sharing', () => {
  it('splits and reconstructs the original key', () => {
    const shares = splitKey(sampleKey, { shares: 5, threshold: 3 });
    expect(shares).toHaveLength(5);
    const reconstructed = reconstructKey(shares.slice(0, 3));
    expect(reconstructed).toEqual(sampleKey);
  });

  it('still reconstructs with a different subset of shares above threshold', () => {
    const shares = splitKey(sampleKey, { shares: 5, threshold: 3 });
    const reconstructed = reconstructKey([shares[1]!, shares[3]!, shares[4]!]);
    expect(reconstructed).toEqual(sampleKey);
  });

  it('rejects an invalid threshold', () => {
    expect(() => splitKey(sampleKey, { shares: 3, threshold: 5 })).toThrow();
    expect(() => splitKey(sampleKey, { shares: 3, threshold: 1 })).toThrow();
  });

  it('rejects empty input', () => {
    expect(() => splitKey(new Uint8Array(0), { shares: 3, threshold: 2 })).toThrow();
  });

  it('rejects reconstruction below minimum share count', () => {
    expect(() => reconstructKey([])).toThrow();
    expect(() => reconstructKey(['a'])).toThrow();
  });
});

describe('pairing payload', () => {
  it('builds payloads with future expiry', () => {
    const p = buildPairingPayload('share-1', 60_000);
    expect(p.share).toBe('share-1');
    expect(p.challenge).toMatch(/^[0-9a-f]{32}$/);
    expect(isPairingValid(p)).toBe(true);
  });

  it('marks expired payloads as invalid', () => {
    const p = buildPairingPayload('share-1', 60_000);
    expect(isPairingValid(p, p.expiresAt + 1)).toBe(false);
  });

  it('rejects empty share strings', () => {
    const p = buildPairingPayload('', 60_000);
    expect(isPairingValid(p)).toBe(false);
  });
});
