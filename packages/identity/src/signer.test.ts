import { describe, expect, it } from 'vitest';
import { secp256k1 } from '@noble/curves/secp256k1';
import {
  addressFromPublicKey,
  eip712CommentDigest,
  generateSigner,
  signCommentDigest,
  signerFromPrivateKey,
  toChecksumAddress,
} from './signer';

// Deterministic test key: keccak256("fos:test-fixture-1") truncated to 32 bytes.
const FIXED_PK = new Uint8Array(32);
for (let i = 0; i < 32; i++) FIXED_PK[i] = (i * 7 + 3) % 256;

describe('signer', () => {
  it('derives a deterministic address from a fixed private key', () => {
    const a = signerFromPrivateKey(FIXED_PK);
    const b = signerFromPrivateKey(FIXED_PK);
    expect(a.address).toBe(b.address);
    expect(a.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it('rejects keys of the wrong length', () => {
    expect(() => signerFromPrivateKey(new Uint8Array(16))).toThrow(/32 bytes/);
  });

  it('matches addressFromPublicKey when given the corresponding pubkey', () => {
    const signer = signerFromPrivateKey(FIXED_PK);
    expect(addressFromPublicKey(signer.publicKey)).toBe(signer.address);
  });

  it('produces correctly checksummed addresses', () => {
    // Vitalik's well-known test vector for EIP-55.
    const lower = '0x52908400098527886e0f7030069857d2e4169ee7';
    expect(toChecksumAddress(lower)).toBe('0x52908400098527886E0F7030069857D2E4169EE7');
  });

  it('generateSigner produces a unique key each call', () => {
    const a = generateSigner();
    const b = generateSigner();
    expect(a.address).not.toBe(b.address);
  });

  it('signs a comment digest such that secp256k1.verify accepts the signature', () => {
    const signer = signerFromPrivateKey(FIXED_PK);
    const digest = eip712CommentDigest({
      domain: {
        name: 'FreedomOfSpeech',
        version: '1',
        chainId: 31337,
        verifyingContract: '0x5fbdb2315678afecb367f032d93f642f64180aa3',
      },
      message: {
        urlHash: ('0x' + '11'.repeat(32)) as `0x${string}`,
        cid: 'bafy-cid-1',
        parentId: ('0x' + '00'.repeat(32)) as `0x${string}`,
        nonce: 0,
      },
    });
    const sig = signCommentDigest(signer, digest);
    expect(sig).toMatch(/^0x[0-9a-f]{130}$/);

    const rsHex = sig.slice(2, 130);
    const v = parseInt(sig.slice(130, 132), 16);
    expect(v === 27 || v === 28).toBe(true);
    // Reconstruct compact 64-byte signature for verify (r || s)
    const compact = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      compact[i] = parseInt(rsHex.slice(i * 2, i * 2 + 2), 16);
    }
    const verified = secp256k1.verify(compact, digest, signer.publicKey);
    expect(verified).toBe(true);
  });

  it('produces deterministic digests for identical typed data', () => {
    const data = {
      domain: {
        name: 'FreedomOfSpeech',
        version: '1',
        chainId: 84532,
        verifyingContract: '0x0000000000000000000000000000000000000001',
      },
      message: {
        urlHash: ('0x' + 'ab'.repeat(32)) as `0x${string}`,
        cid: 'bafy-cid-x',
        parentId: ('0x' + '00'.repeat(32)) as `0x${string}`,
        nonce: 5,
      },
    } as const;
    expect(Array.from(eip712CommentDigest(data))).toEqual(Array.from(eip712CommentDigest(data)));
  });
});
