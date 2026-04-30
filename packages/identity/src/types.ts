export type DID = string;

export interface BioAuthRegistration {
  credentialId: string;
  publicKey: Uint8Array;
  did: DID;
}

export interface BioAuthSession {
  did: DID;
  sign(data: Uint8Array): Promise<Uint8Array>;
}

export interface DIDDocument {
  id: DID;
  publicKey: Uint8Array;
  created: string;
}
