import { useEffect, useState } from 'react';
import { send, type AuthState } from '@/lib/messages';
import { FloatingButton } from './FloatingButton';
import { ThreadPanel } from './ThreadPanel';
import type { CommentRecord } from './types';

interface Props {
  url: string;
  urlHash: string;
}

export function CommentOverlay({ url, urlHash }: Props) {
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState>({ status: 'unauthenticated' });

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

  const handleCreateAccount = async () => {
    // Real WebAuthn flow lives in the popup so the user can see what they're
    // approving. From the overlay we just open the popup programmatically.
    await chrome.runtime.sendMessage({ type: 'open-popup' }).catch(() => {});
  };

  const handlePost = async (text: string, parentId: string | null): Promise<CommentRecord> => {
    if (auth.status !== 'authenticated') {
      throw new Error('Not signed in');
    }
    // Sign locally so the user proves intent. The signature is the output a
    // relayer would broadcast on-chain; until the relayer ships, we just
    // show the comment optimistically in the panel.
    const fakeUrlHashHex32 = (`0x${urlHash.padEnd(64, '0').slice(0, 64)}`) as `0x${string}`;
    const fakeParent = (`0x${'00'.repeat(32)}`) as `0x${string}`;
    const r = await send({
      type: 'sign-comment',
      payload: {
        urlHash: fakeUrlHashHex32,
        cid: 'pending-cid',
        parentId: parentId ? (fakeParent) : undefined,
        nonce: 0,
      },
    });
    if (!r.ok) throw new Error(r.error);

    return {
      id: `local-${Date.now()}`,
      did: auth.did,
      cid: 'pending-cid',
      text,
      createdAt: Date.now(),
      parentId: parentId ?? undefined,
      upvotes: 0,
      downvotes: 0,
    };
  };

  return (
    <div className="fos-overlay" data-fos-url={url} data-fos-hash={urlHash}>
      <FloatingButton open={open} count={0} onClick={() => setOpen((v) => !v)} />
      {open && (
        <ThreadPanel
          url={url}
          urlHash={urlHash}
          auth={auth}
          onClose={() => setOpen(false)}
          onCreateAccount={handleCreateAccount}
          onPost={handlePost}
        />
      )}
    </div>
  );
}
