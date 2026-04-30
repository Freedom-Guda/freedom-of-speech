import type { CommentRecord } from './types';
import { ModerationControls } from './ModerationControls';

interface Props {
  comment: CommentRecord;
  isMuted: boolean;
  onToggleMute: (did: string) => void;
  onReply: (parentId: string) => void;
}

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function relativeTime(ms: number): string {
  const diffMs = ms - Date.now();
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return RELATIVE.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) return RELATIVE.format(hours, 'hour');
  const days = Math.round(hours / 24);
  return RELATIVE.format(days, 'day');
}

function shortDid(did: string): string {
  if (!did.startsWith('did:key:z')) return did;
  const tail = did.slice('did:key:z'.length);
  if (tail.length <= 12) return tail;
  return `${tail.slice(0, 6)}…${tail.slice(-4)}`;
}

export function CommentCard({ comment, isMuted, onToggleMute, onReply }: Props) {
  if (isMuted) {
    return (
      <article className="rounded-lg border border-white/5 bg-neutral-900/40 px-3 py-2 text-xs italic text-neutral-500">
        Muted: <code className="font-mono text-neutral-400">{shortDid(comment.did)}</code>{' '}
        <button
          type="button"
          onClick={() => onToggleMute(comment.did)}
          className="ml-2 underline underline-offset-2 hover:text-neutral-300"
        >
          unmute
        </button>
      </article>
    );
  }

  return (
    <article
      className="group rounded-lg border border-white/5 bg-neutral-900/60 p-3 transition hover:bg-neutral-900"
      data-comment-id={comment.id}
    >
      <header className="mb-1 flex items-center justify-between gap-2 text-[11px]">
        <code className="truncate font-mono text-neutral-400">{shortDid(comment.did)}</code>
        <time className="shrink-0 text-neutral-500" dateTime={new Date(comment.createdAt).toISOString()}>
          {relativeTime(comment.createdAt)}
        </time>
      </header>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-100">{comment.text}</p>

      <footer className="mt-2 flex items-center justify-between gap-3 text-[11px] text-neutral-500">
        <div className="flex items-center gap-3">
          <span aria-label="Score" className="tabular-nums text-neutral-400">
            {comment.upvotes - comment.downvotes >= 0 ? '+' : ''}
            {comment.upvotes - comment.downvotes}
          </span>
          <button
            type="button"
            onClick={() => onReply(comment.id)}
            className="opacity-0 transition group-hover:opacity-100 hover:text-neutral-200"
          >
            Reply
          </button>
        </div>

        <ModerationControls
          did={comment.did}
          cid={comment.cid}
          onToggleMute={onToggleMute}
        />
      </footer>
    </article>
  );
}
