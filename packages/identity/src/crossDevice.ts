// Shamir Secret Sharing for cross-device key recovery.
// Wraps secrets.js-grempe with a typed, hex-string API.

import secrets from 'secrets.js-grempe';
import { hexToBytes, bytesToHex } from '@noble/hashes/utils';

export interface SplitOptions {
  shares: number; // total shares to produce (N)
  threshold: number; // shares required to reconstruct (M)
}

export function splitKey(privateKey: Uint8Array, options: SplitOptions): string[] {
  if (options.threshold > options.shares) {
    throw new Error('threshold cannot exceed total share count');
  }
  if (options.threshold < 2) {
    throw new Error('threshold must be at least 2 (otherwise sharing has no benefit)');
  }
  if (privateKey.length === 0) throw new Error('private key cannot be empty');

  const hex = bytesToHex(privateKey);
  return secrets.share(hex, options.shares, options.threshold);
}

export function reconstructKey(shares: string[]): Uint8Array {
  if (shares.length < 2) {
    throw new Error('at least two shares required for reconstruction');
  }
  const hex = secrets.combine(shares);
  return hexToBytes(hex);
}

// Pairing flow helpers — consumed by the extension UI.

export interface PairingPayload {
  share: string; // a single SSS share string
  challenge: string; // random nonce the new device must echo back signed
  expiresAt: number; // unix ms
}

export function buildPairingPayload(share: string, ttlMs = 5 * 60 * 1000): PairingPayload {
  const challenge = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  return {
    share,
    challenge,
    expiresAt: Date.now() + ttlMs,
  };
}

export function isPairingValid(payload: PairingPayload, now = Date.now()): boolean {
  return payload.expiresAt > now && payload.share.length > 0;
}
