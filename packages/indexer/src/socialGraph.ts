import {
  Blocked as BlockedEvent,
  Unblocked as UnblockedEvent,
} from '../generated/SocialGraph/SocialGraph';
import { Block } from '../generated/schema';

function blockId(blocker: string, blockedDid: string): string {
  return blocker + ':' + blockedDid;
}

export function handleBlocked(event: BlockedEvent): void {
  const id = blockId(event.params.blocker, event.params.blockedDid);
  let entity = Block.load(id);
  if (entity == null) {
    entity = new Block(id);
  }
  entity.blocker = event.params.blocker;
  entity.blockedDid = event.params.blockedDid;
  entity.active = true;
  entity.updatedAt = event.params.timestamp;
  entity.save();
}

export function handleUnblocked(event: UnblockedEvent): void {
  const id = blockId(event.params.blocker, event.params.blockedDid);
  const entity = Block.load(id);
  if (entity == null) return;
  entity.active = false;
  entity.updatedAt = event.params.timestamp;
  entity.save();
}
