import { useMemo, useState } from 'react';
import { CommentCard } from './CommentCard';
import { ComposeBox } from './ComposeBox';
import { AuthPrompt } from './AuthPrompt';
import { useComments } from './useComments';
import { useMutes } from './useMutes';
import type { CommentRecord, SortMode } from './types';
import type { AuthState } from '@/lib/messages';

interface Props {
  url: string;
  urlHash: string;
  auth: AuthState;
  onClose: () => void;
  onCreateAccount: () => Promise<void>;
  onPost: (text: string, parentId: string | null) => Promise<CommentRecord>;
}

const SORTS: { mode: SortMode; label: string }[] = [
  { mode: 'new', label: 'New' },
  { mode: 'top', label: 'Top' },
  { mode: 'controversial', label: 'Controversial' },
];

export function ThreadPanel({ url, urlHash, auth, onClose, onCreateAccount, onPost }: Props) {
  const [sort, setSort] = useState<SortMode>('new');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const { comments, loading, addOptimistic } = useComments({ urlHash, sort });
  const { isMuted, toggleMute } = useMutes();

  const visible = useMemo(() => comments, [comments]);

  const handleSubmit = async (text: string, parentId: string | null) => {
    const record = await onPost(text, parentId);
    addOptimistic(record);
    setReplyTo(null);
  };

  return (
    <aside
      className="fixed right-0 top-0 z-[2147483645] flex h-screen w-[420px] max-w-[100vw] flex-col bg-neutral-950 text-neutral-100 shadow-[0_0_60px_rgba(0,0,0,0.5)] ring-1 ring-white/10 animate-slide-in-right"
      aria-label="Comment thread"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/5 p-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Comments</div>
          <div className="mt-0.5 truncate text-[11px] text-neutral-500">{url}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-neutral-400 hover:bg-white/5 hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>
      </header>

      <div
        className="flex shrink-0 items-center gap-1 border-b border-white/5 px-3 py-2 text-[11px]"
        role="tablist"
        aria-label="Sort comments"
      >
        {SORTS.map(({ mode, label }) => (
          <button
            key={mode}
            role="tab"
            type="button"
            aria-selected={sort === mode}
            onClick={() => setSort(mode)}
            className={
              sort === mode
                ? 'rounded bg-white/10 px-2 py-1 text-white'
                : 'rounded px-2 py-1 text-neutral-400 hover:bg-white/5 hover:text-neutral-100'
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {loading && <p className="text-xs text-neutral-500">Loading…</p>}
        {!loading && visible.length === 0 && (
          <p className="text-sm text-neutral-500">
            No comments yet. Be the first — your DID is permanent and so is the post.
          </p>
        )}
        {visible.map((c) => (
          <CommentCard
            key={c.id}
            comment={c}
            isMuted={isMuted(c.did)}
            onToggleMute={(did) => void toggleMute(did)}
            onReply={(id) => setReplyTo(id)}
          />
        ))}
      </div>

      <footer className="shrink-0 border-t border-white/5 p-3">
        {auth.status === 'authenticated' ? (
          <ComposeBox
            parentId={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onSubmit={handleSubmit}
          />
        ) : (
          <AuthPrompt
            busy={authBusy}
            onCreateAccount={() => {
              setAuthBusy(true);
              onCreateAccount().finally(() => setAuthBusy(false));
            }}
          />
        )}
      </footer>
    </aside>
  );
}
