// Ethereum-compatible secp256k1 signing key for the protocol's `didSigner`
// mapping. WebAuthn credentials prove humanity (Semaphore); this signer
// produces ECDSA signatures the FreedomOfSpeech contract can recover.
//
// In V1 the private key is held in chrome.storage on the user's device. A
// future iteration should bind it to a WebAuthn PRF-derived key so it
// cannot be exfiltrated by any other extension or page-level XSS.

import { secp256k1 } from '@noble/curves/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

export interface EthSigner {
  privateKey: Uint8Array; // 32 bytes
  publicKey: Uint8Array; // 65 bytes (uncompressed, 0x04 prefix)
  address: `0x${string}`; // checksummed
}

export function generateSigner(): EthSigner {
  const priv = secp256k1.utils.randomPrivateKey();
  return signerFromPrivateKey(priv);
}

export function signerFromPrivateKey(privateKey: Uint8Array): EthSigner {
  if (privateKey.length !== 32) {
    throw new Error(`Ethereum private key must be 32 bytes, got ${privateKey.length}`);
  }
  const pub = secp256k1.getPublicKey(privateKey, false); // uncompressed
  const address = addressFromPublicKey(pub);
  return { privateKey, publicKey: pub, address };
}

export function addressFromPublicKey(publicKey: Uint8Array): `0x${string}` {
  // Strip the 0x04 prefix, take keccak256 of the remaining 64 bytes,
  // and take the trailing 20 bytes — standard Ethereum address derivation.
  const xy = publicKey.length === 65 ? publicKey.slice(1) : publicKey;
  const hash = keccak_256(xy);
  return toChecksumAddress(`0x${bytesToHex(hash.slice(-20))}`);
}

export function toChecksumAddress(address: string): `0x${string}` {
  const lower = address.toLowerCase().replace(/^0x/, '');
  const hash = bytesToHex(keccak_256(new TextEncoder().encode(lower)));
  let out = '0x';
  for (let i = 0; i < lower.length; i++) {
    out += parseInt(hash[i]!, 16) >= 8 ? lower[i]!.toUpperCase() : lower[i]!;
  }
  return out as `0x${string}`;
}

export function privateKeyToHex(signer: EthSigner): `0x${string}` {
  return `0x${bytesToHex(signer.privateKey)}`;
}

export function privateKeyFromHex(hex: string): Uint8Array {
  return hexToBytes(hex.replace(/^0x/, ''));
}

// EIP-712 typed data signing of the FreedomOfSpeech Comment payload.
// We compute the digest manually (per EIP-712 spec) so this stays a pure
// function with no ethers/viem dependency.

export interface CommentTypedData {
  domain: {
    name: string;
    version: string;
    chainId: number | bigint;
    verifyingContract: `0x${string}`;
  };
  message: {
    urlHash: `0x${string}`;
    cid: string;
    parentId: `0x${string}`;
    nonce: number | bigint;
  };
}

const DOMAIN_TYPEHASH = keccak_256(
  new TextEncoder().encode(
    'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)',
  ),
);
const COMMENT_TYPEHASH = keccak_256(
  new TextEncoder().encode('Comment(bytes32 urlHash,string cid,bytes32 parentId,uint256 nonce)'),
);

export function eip712CommentDigest(data: CommentTypedData): Uint8Array {
  const enc = new TextEncoder();
  const domainSeparator = keccak_256(
    concat([
      DOMAIN_TYPEHASH,
      keccak_256(enc.encode(data.domain.name)),
      keccak_256(enc.encode(data.domain.version)),
      uint256ToBytes(BigInt(data.domain.chainId)),
      addressToBytes32(data.domain.verifyingContract),
    ]),
  );
  const structHash = keccak_256(
    concat([
      COMMENT_TYPEHASH,
      hexToBytes32(data.message.urlHash),
      keccak_256(enc.encode(data.message.cid)),
      hexToBytes32(data.message.parentId),
      uint256ToBytes(BigInt(data.message.nonce)),
    ]),
  );
  return keccak_256(concat([new Uint8Array([0x19, 0x01]), domainSeparator, structHash]));
}

export function signCommentDigest(signer: EthSigner, digest: Uint8Array): `0x${string}` {
  const sig = secp256k1.sign(digest, signer.privateKey);
  // Ethereum expects 65 bytes: r (32) || s (32) || v (1, 27 or 28).
  const r = bigIntToBytes(sig.r, 32);
  const s = bigIntToBytes(sig.s, 32);
  const recovery = sig.recovery;
  if (recovery !== 0 && recovery !== 1) {
    throw new Error(`unexpected recovery id ${recovery}`);
  }
  const v = 27 + recovery;
  return `0x${bytesToHex(r)}${bytesToHex(s)}${v.toString(16).padStart(2, '0')}`;
}

// ---- bytes helpers ----

function concat(arrs: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const a of arrs) total += a.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

function uint256ToBytes(value: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = value;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

function bigIntToBytes(value: bigint, len: number): Uint8Array {
  const out = new Uint8Array(len);
  let v = value;
  for (let i = len - 1; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

function hexToBytes32(hex: `0x${string}` | string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  if (clean.length !== 64) throw new Error(`expected bytes32 hex, got length ${clean.length}`);
  return hexToBytes(clean);
}

function addressToBytes32(address: `0x${string}` | string): Uint8Array {
  const clean = address.replace(/^0x/, '').toLowerCase();
  if (clean.length !== 40) throw new Error(`expected address hex, got length ${clean.length}`);
  const out = new Uint8Array(32);
  out.set(hexToBytes(clean), 12);
  return out;
}
