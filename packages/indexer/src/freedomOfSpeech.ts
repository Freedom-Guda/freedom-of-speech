import { BigInt, Bytes } from '@graphprotocol/graph-ts';
import {
  HumanVerified as HumanVerifiedEvent,
  CommentPosted as CommentPostedEvent,
} from '../generated/FreedomOfSpeech/FreedomOfSpeech';
import { VerifiedHuman, Thread, Comment } from '../generated/schema';

export function handleHumanVerified(event: HumanVerifiedEvent): void {
  const did = event.params.did;
  let entity = VerifiedHuman.load(did);
  if (entity == null) {
    entity = new VerifiedHuman(did);
  }
  entity.did = did;
  entity.signer = event.params.signer;
  entity.verifiedAt = event.params.timestamp;
  entity.save();
}

export function handleCommentPosted(event: CommentPostedEvent): void {
  const urlHash = event.params.urlHash;
  const commentId = event.params.commentId;
  const did = event.params.did;
  const cid = event.params.cid;
  const parentId = event.params.parentId;

  let thread = Thread.load(urlHash);
  if (thread == null) {
    thread = new Thread(urlHash);
    thread.commentCount = BigInt.zero();
    thread.firstSeenAt = event.params.timestamp;
  }
  thread.commentCount = thread.commentCount.plus(BigInt.fromI32(1));
  thread.save();

  let author = VerifiedHuman.load(did);
  if (author == null) {
    // We saw a comment from a DID we missed verifying — index a stub so the
    // relation resolves; the verifier event will overwrite when it lands.
    author = new VerifiedHuman(did);
    author.did = did;
    author.signer = Bytes.empty();
    author.verifiedAt = event.params.timestamp;
    author.save();
  }

  const comment = new Comment(commentId);
  comment.thread = thread.id;
  comment.author = author.id;
  comment.cid = cid;
  comment.timestamp = event.params.timestamp;
  comment.txHash = event.transaction.hash;
  comment.blockNumber = event.block.number;

  const zero = Bytes.fromHexString('0x0000000000000000000000000000000000000000000000000000000000000000');
  if (parentId.notEqual(zero)) {
    comment.parent = parentId;
  }
  comment.save();
}
