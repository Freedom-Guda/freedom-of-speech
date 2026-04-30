import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';
import { createDID } from './did';
import type { BioAuthRegistration, BioAuthSession, DID } from './types';

const RP_NAME = 'Freedom of Speech';

function defaultRpId(): string {
  return typeof location !== 'undefined' ? location.hostname : 'localhost';
}

export interface BioAuthOptions {
  /** RP ID. Defaults to `location.hostname`. Set explicitly inside browser
   * extensions where the origin is chrome-extension://… */
  rpId?: string;
}

function buildRegistrationOptions(
  username: string,
  options: BioAuthOptions,
): PublicKeyCredentialCreationOptionsJSON {
  return {
    rp: { id: options.rpId ?? defaultRpId(), name: RP_NAME },
    user: {
      id: bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32))),
      name: username,
      displayName: username,
    },
    challenge: bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32))),
    pubKeyCredParams: [
      { type: 'public-key', alg: -8 }, // Ed25519
      { type: 'public-key', alg: -7 }, // ES256 (fallback)
    ],
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
      authenticatorAttachment: 'platform',
    },
    timeout: 60_000,
    attestation: 'none',
  };
}

function buildAuthOptions(
  credentialId: string,
  options: BioAuthOptions,
): PublicKeyCredentialRequestOptionsJSON {
  return {
    rpId: options.rpId ?? defaultRpId(),
    challenge: bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32))),
    allowCredentials: [{ type: 'public-key', id: credentialId }],
    userVerification: 'required',
    timeout: 60_000,
  };
}

export interface BioAuthRegistrationResult extends BioAuthRegistration {
  /** Base64url-encoded SPKI public key as returned by the browser. Convenient
   * to store on-device for later credential lookup. */
  publicKeyBase64Url: string;
}

export async function registerBioAuth(
  username: string,
  options: BioAuthOptions = {},
): Promise<BioAuthRegistrationResult> {
  const opts = buildRegistrationOptions(username, options);
  const cred = await startRegistration({ optionsJSON: opts });

  const publicKey = extractPublicKey(cred.response.publicKey);
  const did = createDID(publicKey);

  return {
    credentialId: cred.id,
    publicKey,
    publicKeyBase64Url: cred.response.publicKey ?? '',
    did,
  };
}

export async function authenticateBioAuth(
  credentialId: string,
  resolveDid: (credentialId: string) => Promise<DID>,
  options: BioAuthOptions = {},
): Promise<BioAuthSession> {
  const opts = buildAuthOptions(credentialId, options);
  const assertion = await startAuthentication({ optionsJSON: opts });
  const did = await resolveDid(credentialId);

  return {
    did,
    async sign(_data: Uint8Array): Promise<Uint8Array> {
      // The signature is implicit in the WebAuthn assertion. Real signing
      // (turning arbitrary bytes into a signature) requires re-issuing a
      // WebAuthn assertion with the data as the challenge. The relayer
      // does this on each post; here we expose the assertion bytes so a
      // caller can ZK-prove ownership instead of using a raw signature.
      return base64UrlToBytes(assertion.response.signature);
    },
  };
}

function extractPublicKey(spkiBase64Url: string | undefined): Uint8Array {
  if (!spkiBase64Url) throw new Error('credential missing publicKey field');
  // The browser returns SPKI-encoded DER. For Ed25519 the 32-byte raw key
  // sits at the tail. Production code should use a proper ASN.1 decoder.
  const spki = base64UrlToBytes(spkiBase64Url);
  if (spki.length < 32) throw new Error('SPKI too short to contain Ed25519 key');
  return spki.slice(spki.length - 32);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
