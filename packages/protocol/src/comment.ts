export interface CommentContent {
  version: 1;
  text: string;
  url: string;
  parentCid?: string;
  createdAt: string;
  did: string;
}

export async function uploadComment(_content: CommentContent): Promise<string> {
  throw new Error('uploadComment not yet implemented (IPFS plumbing)');
}

export async function fetchComment(_cid: string): Promise<CommentContent> {
  throw new Error('fetchComment not yet implemented (IPFS plumbing)');
}
