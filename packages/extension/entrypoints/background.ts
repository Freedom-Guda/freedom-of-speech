import { defineBackground } from 'wxt/utils/define-background';
import {
  eip712CommentDigest,
  privateKeyFromHex,
  signCommentDigest,
  signerFromPrivateKey,
} from '@fos/identity/signer';
import {
  bundleToAuth,
  type AccountBundle,
  type AuthState,
  type BackgroundMessage,
  type BackgroundResponse,
} from '@/lib/messages';
import { clearBundle, loadBundle, loadConfig, saveBundle, saveConfig } from '@/lib/storage';

export default defineBackground(() => {
  async function broadcast(msg: BackgroundMessage) {
    const tabs = await chrome.tabs.query({});
    await Promise.all(
      tabs
        .filter((t) => typeof t.id === 'number')
        .map(async (t) => {
          try {
            await chrome.tabs.sendMessage(t.id!, msg);
          } catch {
            // chrome:// pages have no content script. Ignore.
          }
        }),
    );
  }

  async function currentAuth(): Promise<AuthState> {
    const bundle = await loadBundle();
    if (!bundle) return { status: 'unauthenticated' };
    return bundleToAuth(bundle);
  }

  async function setBundle(bundle: AccountBundle): Promise<void> {
    await saveBundle(bundle);
    await broadcast({ type: 'auth-changed', auth: bundleToAuth(bundle) });
  }

  async function clear(): Promise<void> {
    await clearBundle();
    await broadcast({ type: 'auth-changed', auth: { status: 'unauthenticated' } });
  }

  chrome.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
    void handle(message).then(sendResponse);
    return true; // tells Chrome we'll respond async
  });

  async function handle(message: BackgroundMessage): Promise<BackgroundResponse> {
    try {
      switch (message.type) {
        case 'get-auth':
          return { ok: true, auth: await currentAuth() };

        case 'get-bundle':
          return { ok: true, bundle: await loadBundle() };

        case 'register':
          // The popup page actually drives WebAuthn (it has a window) and
          // calls back into here with the resulting bundle via a follow-up
          // message. We treat 'register' here purely as a kick — the popup
          // listens for the response and proceeds in its own context.
          return {
            ok: false,
            error:
              "register must be initiated from the popup; background can't open a WebAuthn dialog",
          };

        case 'sign-out':
          await clear();
          return { ok: true };

        case 'sign-comment': {
          const bundle = await loadBundle();
          if (!bundle) return { ok: false, error: 'not signed in' };
          const config = await loadConfig();
          const digest = eip712CommentDigest({
            domain: {
              name: 'FreedomOfSpeech',
              version: '1',
              chainId: config.chainId,
              verifyingContract: config.contract,
            },
            message: {
              urlHash: message.payload.urlHash,
              cid: message.payload.cid,
              parentId: message.payload.parentId ?? (`0x${'00'.repeat(32)}` as `0x${string}`),
              nonce: message.payload.nonce,
            },
          });
          const signer = signerFromPrivateKey(privateKeyFromHex(bundle.signerPrivateKey));
          const signature = signCommentDigest(signer, digest);
          return { ok: true, signature };
        }

        case 'get-config':
          return { ok: true, config: await loadConfig() };

        case 'set-config':
          await saveConfig(message.payload);
          return { ok: true };

        default:
          return { ok: false, error: `unhandled message: ${(message as { type: string }).type}` };
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'unknown error' };
    }
  }

  // Direct mutator the popup uses after a successful WebAuthn registration.
  // Exposed via chrome.runtime.onMessage with a separate type.
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (
      message &&
      typeof message === 'object' &&
      (message as { type?: string }).type === 'set-bundle'
    ) {
      void setBundle((message as { payload: AccountBundle }).payload).then(() =>
        sendResponse({ ok: true }),
      );
      return true;
    }
    return false;
  });
});
