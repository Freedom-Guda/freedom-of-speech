import { useState } from 'react';

interface Props {
  parentId: string | null;
  onCancelReply: () => void;
  onSubmit: (text: string, parentId: string | null) => Promise<void>;
}

const MAX_LEN = 2000;

export function ComposeBox({ parentId, onCancelReply, onSubmit }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const remaining = MAX_LEN - text.length;
  const overLimit = remaining < 0;
  const empty = text.trim().length === 0;

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await onSubmit(text.trim(), parentId);
      setText('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to post');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-neutral-900 p-2">
      {parentId && (
        <div className="mb-1 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Replying…</span>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-neutral-400 hover:text-neutral-200"
          >
            cancel
          </button>
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Say something. Permanently."
        className="block w-full resize-none rounded bg-transparent px-2 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
      />
      <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
        <span className={overLimit ? 'text-red-400' : 'text-neutral-500'}>
          {remaining} chars
        </span>
        <div className="flex items-center gap-2">
          {err && <span className="text-red-400">{err}</span>}
          <button
            type="button"
            onClick={submit}
            disabled={busy || empty || overLimit}
            className="rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
