export interface CommentRecord {
  id: string;
  did: string;
  cid: string;
  text: string;
  createdAt: number;
  parentId?: string;
  upvotes: number;
  downvotes: number;
}

export type SortMode = 'new' | 'top' | 'controversial';
