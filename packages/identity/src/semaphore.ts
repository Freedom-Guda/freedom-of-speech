// Semaphore: ZK group membership ("verified human" group). The user proves
// they own a registered identity without revealing which one.
//
// We expose a thin facade so the extension and the relayer share a single
// surface, and so tests can stub it without pulling the full SnarkJS
// pipeline into unit tests.

import { Identity } from '@semaphore-protocol/identity';
import { Group } from '@semaphore-protocol/group';
import { generateProof, verifyProof, type SemaphoreProof } from '@semaphore-protocol/proof';

export interface VerifiedHumanProof {
  proof: SemaphoreProof;
  scope: bigint; // domain separator (e.g. urlHash | "register" | "vote")
  message: bigint; // signal payload (e.g. comment commitment)
}

export function newIdentity(seed?: string): Identity {
  return seed ? new Identity(seed) : new Identity();
}

export function commitmentOf(identity: Identity): bigint {
  return identity.commitment;
}

export async function proveMembership(
  identity: Identity,
  group: Group,
  scope: bigint,
  message: bigint,
): Promise<VerifiedHumanProof> {
  const proof = await generateProof(identity, group, message, scope);
  return { proof, scope, message };
}

export async function verifyMembership(payload: VerifiedHumanProof): Promise<boolean> {
  return await verifyProof(payload.proof);
}

export function buildHumanGroup(commitments: bigint[]): Group {
  const g = new Group();
  for (const c of commitments) g.addMember(c);
  return g;
}
