// W3C DID:key derivation. We use Ed25519 multikey encoding.
// Spec: https://w3c-ccg.github.io/did-method-key/

import { base58 } from '@scure/base';
import type { DID, DIDDocument } from './types';

// Multicodec prefix for Ed25519 public key: 0xed01
const ED25519_MULTICODEC_PREFIX = new Uint8Array([0xed, 0x01]);

export function createDID(publicKey: Uint8Array): DID {
  if (publicKey.length !== 32) {
    throw new Error(`Ed25519 public key must be 32 bytes, got ${publicKey.length}`);
  }
  const prefixed = new Uint8Array(ED25519_MULTICODEC_PREFIX.length + publicKey.length);
  prefixed.set(ED25519_MULTICODEC_PREFIX, 0);
  prefixed.set(publicKey, ED25519_MULTICODEC_PREFIX.length);
  // Multibase prefix 'z' indicates base58btc.
  return `did:key:z${base58.encode(prefixed)}`;
}

export function parseDID(did: DID): { publicKey: Uint8Array } {
  if (!did.startsWith('did:key:z')) {
    throw new Error(`Not a did:key: ${did}`);
  }
  const decoded = base58.decode(did.slice('did:key:z'.length));
  if (decoded.length < 3) throw new Error('did:key payload too short');
  if (decoded[0] !== ED25519_MULTICODEC_PREFIX[0] || decoded[1] !== ED25519_MULTICODEC_PREFIX[1]) {
    throw new Error('did:key is not Ed25519 (only Ed25519 supported)');
  }
  return { publicKey: decoded.slice(2) };
}

export async function resolveDID(did: DID): Promise<DIDDocument> {
  // For did:key the document is fully derived from the DID itself —
  // no network resolution needed. Other methods (did:web, did:pkh) would
  // hit a resolver.
  const { publicKey } = parseDID(did);
  return {
    id: did,
    publicKey,
    created: new Date(0).toISOString(),
  };
}

export async function publishDID(_did: DID, _document: DIDDocument): Promise<void> {
  // Anchor on Ceramic so the DID is discoverable cross-chain. Stubbed for
  // now — the Ceramic SDK pulls a heavy dependency and we wire it up only
  // when the relayer needs it.
  throw new Error('publishDID(Ceramic) wiring deferred to relayer build');
}
