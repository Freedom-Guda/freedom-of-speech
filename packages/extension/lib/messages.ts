export interface AccountBundle {
  did: string;
  credentialId: string;
  publicKey: string; // base64url WebAuthn public key (SPKI)
  signerAddress: `0x${string}`;
  signerPrivateKey: `0x${string}`; // V1: stored unencrypted on-device. TODO: WebAuthn PRF.
  createdAt: number;
}

export type AuthState =
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; did: string; credentialId: string; signerAddress: `0x${string}` };

export interface ProtocolConfig {
  chainId: number;
  contract: `0x${string}`;
  rpcUrl: string;
  indexerUrl: string;
}

export type BackgroundMessage =
  | { type: 'get-auth' }
  | { type: 'get-bundle' }
  | { type: 'register'; payload: { username: string } }
  | { type: 'sign-out' }
  | {
      type: 'sign-comment';
      payload: { urlHash: `0x${string}`; cid: string; parentId?: `0x${string}`; nonce: number };
    }
  | { type: 'get-config' }
  | { type: 'set-config'; payload: ProtocolConfig }
  | { type: 'auth-changed'; auth: AuthState };

export type BackgroundResponse =
  | { ok: true; auth?: AuthState }
  | { ok: true; bundle?: AccountBundle | null }
  | { ok: true; signature: `0x${string}` }
  | { ok: true; config: ProtocolConfig }
  | { ok: true }
  | { ok: false; error: string };

export async function send(message: BackgroundMessage): Promise<BackgroundResponse> {
  return await chrome.runtime.sendMessage(message);
}

export function bundleToAuth(bundle: AccountBundle): AuthState {
  return {
    status: 'authenticated',
    did: bundle.did,
    credentialId: bundle.credentialId,
    signerAddress: bundle.signerAddress,
  };
}

export const DEFAULT_CONFIG: ProtocolConfig = {
  chainId: 84532, // Base Sepolia
  contract: '0x0000000000000000000000000000000000000000',
  rpcUrl: 'https://sepolia.base.org',
  indexerUrl: 'https://api.thegraph.com/subgraphs/name/freedom-of-speech/fos',
};
