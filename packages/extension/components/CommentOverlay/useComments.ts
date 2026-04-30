import { useEffect, useState } from 'react';
import type { CommentRecord, SortMode } from './types';

interface UseCommentsArgs {
  urlHash: string;
  sort: SortMode;
}

// Comment fetching is currently a local fixture so the UI is reviewable
// before the indexer (prompt #6) and on-chain reads land. Replace with
// a fetch against the The-Graph URL once that is deployed.
const FIXTURES: CommentRecord[] = [
  {
    id: 'cmt-1',
    did: 'did:key:z6MkExample1',
    cid: 'bafyExample1',
    text: 'First. The whole point of this protocol is that nobody can delete this comment.',
    createdAt: Date.now() - 1000 * 60 * 60 * 4,
    upvotes: 12,
    downvotes: 1,
  },
  {
    id: 'cmt-2',
    did: 'did:key:z6MkExample2',
    cid: 'bafyExample2',
    text: 'Mute is client-side. Blocking is client-side. There is no platform ban.',
    parentId: 'cmt-1',
    createdAt: Date.now() - 1000 * 60 * 90,
    upvotes: 4,
    downvotes: 0,
  },
  {
    id: 'cmt-3',
    did: 'did:key:z6MkExample3',
    cid: 'bafyExample3',
    text: 'One human, one account, enforced by WebAuthn + Semaphore — not by company rules.',
    createdAt: Date.now() - 1000 * 60 * 12,
    upvotes: 3,
    downvotes: 0,
  },
];

function sortComments(list: CommentRecord[], mode: SortMode): CommentRecord[] {
  const copy = [...list];
  switch (mode) {
    case 'new':
      copy.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case 'top':
      copy.sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes));
      break;
    case 'controversial':
      copy.sort((a, b) => Math.min(b.upvotes, b.downvotes) - Math.min(a.upvotes, a.downvotes));
      break;
  }
  return copy;
}

export function useComments({ urlHash, sort }: UseCommentsArgs) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Simulate latency.
    const t = setTimeout(() => {
      if (cancelled) return;
      setComments(sortComments(FIXTURES, sort));
      setLoading(false);
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [urlHash, sort]);

  const addOptimistic = (record: CommentRecord) => {
    setComments((prev) => sortComments([record, ...prev], sort));
  };

  return { comments, loading, addOptimistic };
}
