import { useEffect, useState } from 'react';
import {
  generateSigner,
  privateKeyToHex,
  registerBioAuth,
} from '@fos/identity';
import { send, type AccountBundle, type AuthState } from '@/lib/messages';

export function Popup() {
  const [auth, setAuth] = useState<AuthState>({ status: 'unauthenticated' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    void send({ type: 'get-auth' }).then((r) => {
      if (r.ok && 'auth' in r && r.auth) setAuth(r.auth);
    });
    const onMsg = (msg: unknown) => {
      if (!msg || typeof msg !== 'object' || !('type' in msg)) return;
      const m = msg as { type: string; auth?: AuthState };
      if (m.type === 'auth-changed' && m.auth) setAuth(m.auth);
    };
    chrome.runtime.onMessage.addListener(onMsg);
    return () => chrome.runtime.onMessage.removeListener(onMsg);
  }, []);

  const onCreate = async () => {
    setErr(null);
    setBusy(true);
    try {
      // The popup is hosted at chrome-extension://<id>/popup.html so the
      // RP id must be the extension id (not the host page's hostname).
      const rpId = location.hostname;
      const reg = await registerBioAuth(username || 'me', { rpId });
      const signer = generateSigner();
      const bundle: AccountBundle = {
        did: reg.did,
        credentialId: reg.credentialId,
        publicKey: reg.publicKeyBase64Url,
        signerAddress: signer.address,
        signerPrivateKey: privateKeyToHex(signer),
        createdAt: Date.now(),
      };
      const r = await chrome.runtime.sendMessage({ type: 'set-bundle', payload: bundle });
      if (!r?.ok) throw new Error('background failed to store bundle');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'registration failed');
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = async () => {
    setBusy(true);
    setErr(null);
    try {
      await send({ type: 'sign-out' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-[360px] p-4 font-sans">
      <header className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight">Freedom of Speech</h1>
        <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neutral-400">
          beta
        </span>
      </header>

      {auth.status === 'unauthenticated' ? (
        <div className="space-y-3">
          <p className="text-sm text-neutral-300">
            One human, one account. The biometric registration below uses WebAuthn — your
            authenticator never leaves the device.
          </p>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="display name (optional)"
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onCreate}
            disabled={busy}
            className="w-full rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-400 disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Register with biometric'}
          </button>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <p className="text-[11px] text-neutral-500">
            Registration creates a fresh secp256k1 signer locally. The signer address is what the
            FreedomOfSpeech contract maps to your DID.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-neutral-500">DID</div>
            <code className="block break-all font-mono text-xs text-neutral-300">{auth.did}</code>
            <div className="mt-3 mb-1 text-[10px] uppercase tracking-wider text-neutral-500">
              Signer
            </div>
            <code className="block break-all font-mono text-xs text-neutral-300">
              {auth.signerAddress}
            </code>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            disabled={busy}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Sign out of this device'}
          </button>
          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>
      )}
    </div>
  );
}
