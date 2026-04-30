import { keccak256 as ethersKeccak, toUtf8Bytes as ethersBytes } from 'ethers';

export function keccak256(bytes: Uint8Array | string): string {
  return ethersKeccak(typeof bytes === 'string' ? bytes : bytes);
}

export function toUtf8Bytes(s: string): Uint8Array {
  return ethersBytes(s);
}

export function urlToKeccak(canonicalUrl: string): string {
  return ethersKeccak(ethersBytes(canonicalUrl));
}
