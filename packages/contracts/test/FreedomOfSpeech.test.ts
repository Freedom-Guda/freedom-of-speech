import { expect } from 'chai';
import hre from 'hardhat';
import type { BaseContract, Signer } from 'ethers';

const { ethers } = hre;

const SAMPLE_DID = 'did:key:z6MkpzExampleDid1';
const SAMPLE_URL_HASH = ethers.keccak256(ethers.toUtf8Bytes('https://example.com/post/1'));
const SAMPLE_CID = 'bafy-comment-cid-1';
const ZERO = ethers.ZeroHash;

describe('FreedomOfSpeech', function () {
  async function deployFixture() {
    const [owner, signer, relayer]: Signer[] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory('MockHumanVerifier');
    const mock = await Mock.deploy();
    await mock.waitForDeployment();

    const Fos = await ethers.getContractFactory('FreedomOfSpeech');
    const fos = await Fos.deploy(await owner.getAddress());
    await fos.waitForDeployment();
    await (await fos.setVerifier(await mock.getAddress())).wait();

    return { fos, mock, owner, signer, relayer };
  }

  async function signComment(
    fos: BaseContract,
    signer: Signer,
    urlHash: string,
    cid: string,
    parentId: string,
    nonce: bigint,
  ) {
    const domain = {
      name: 'FreedomOfSpeech',
      version: '1',
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await fos.getAddress(),
    } as const;
    const types = {
      Comment: [
        { name: 'urlHash', type: 'bytes32' },
        { name: 'cid', type: 'string' },
        { name: 'parentId', type: 'bytes32' },
        { name: 'nonce', type: 'uint256' },
      ],
    } as const;
    const value = { urlHash, cid, parentId, nonce } as const;
    return await (signer as unknown as { signTypedData: (d: unknown, t: unknown, v: unknown) => Promise<string> }).signTypedData(
      domain,
      types,
      value,
    );
  }

  it('verifies a human via the mock ZK verifier', async () => {
    const { fos, signer } = await deployFixture();
    await expect(fos.verifyHuman(SAMPLE_DID, await signer.getAddress(), '0x'))
      .to.emit(fos, 'HumanVerified')
      .withArgs(SAMPLE_DID, await signer.getAddress(), anyValue());
    expect(await fos.verifiedHumans(SAMPLE_DID)).to.equal(true);
    expect(await fos.didSigner(SAMPLE_DID)).to.equal(await signer.getAddress());
  });

  it('rejects verification when the verifier returns false', async () => {
    const { fos, mock, signer } = await deployFixture();
    await mock.setAccepts(false);
    await expect(
      fos.verifyHuman(SAMPLE_DID, await signer.getAddress(), '0x'),
    ).to.be.revertedWithCustomError(fos, 'InvalidProof');
  });

  it('posts a top-level comment and indexes it in the thread', async () => {
    const { fos, signer, relayer } = await deployFixture();
    await fos.verifyHuman(SAMPLE_DID, await signer.getAddress(), '0x');

    const sig = await signComment(fos, signer, SAMPLE_URL_HASH, SAMPLE_CID, ZERO, 0n);
    await expect(fos.connect(relayer).postComment(SAMPLE_DID, SAMPLE_URL_HASH, SAMPLE_CID, ZERO, sig))
      .to.emit(fos, 'CommentPosted');

    const thread = await fos.getThread(SAMPLE_URL_HASH);
    expect(thread.length).to.equal(1);
    expect(await fos.threadLength(SAMPLE_URL_HASH)).to.equal(1n);
  });

  it('rejects comments from unverified DIDs', async () => {
    const { fos, signer } = await deployFixture();
    const sig = await signComment(fos, signer, SAMPLE_URL_HASH, SAMPLE_CID, ZERO, 0n);
    await expect(
      fos.postComment(SAMPLE_DID, SAMPLE_URL_HASH, SAMPLE_CID, ZERO, sig),
    ).to.be.revertedWithCustomError(fos, 'NotVerifiedHuman');
  });

  it('rejects comments with an empty CID', async () => {
    const { fos, signer } = await deployFixture();
    await fos.verifyHuman(SAMPLE_DID, await signer.getAddress(), '0x');
    const sig = await signComment(fos, signer, SAMPLE_URL_HASH, '', ZERO, 0n);
    await expect(
      fos.postComment(SAMPLE_DID, SAMPLE_URL_HASH, '', ZERO, sig),
    ).to.be.revertedWithCustomError(fos, 'EmptyCID');
  });

  it('rejects replies with a missing parent', async () => {
    const { fos, signer } = await deployFixture();
    await fos.verifyHuman(SAMPLE_DID, await signer.getAddress(), '0x');
    const fakeParent = ethers.keccak256(ethers.toUtf8Bytes('nonexistent'));
    const sig = await signComment(fos, signer, SAMPLE_URL_HASH, SAMPLE_CID, fakeParent, 0n);
    await expect(
      fos.postComment(SAMPLE_DID, SAMPLE_URL_HASH, SAMPLE_CID, fakeParent, sig),
    ).to.be.revertedWithCustomError(fos, 'ParentNotInThread');
  });

  it('rejects replayed signatures (nonce-bound)', async () => {
    const { fos, signer } = await deployFixture();
    await fos.verifyHuman(SAMPLE_DID, await signer.getAddress(), '0x');
    const sig = await signComment(fos, signer, SAMPLE_URL_HASH, SAMPLE_CID, ZERO, 0n);
    await fos.postComment(SAMPLE_DID, SAMPLE_URL_HASH, SAMPLE_CID, ZERO, sig);
    await expect(
      fos.postComment(SAMPLE_DID, SAMPLE_URL_HASH, SAMPLE_CID, ZERO, sig),
    ).to.be.revertedWithCustomError(fos, 'InvalidSignature');
  });

  it('rejects signatures from the wrong key', async () => {
    const { fos, signer, relayer } = await deployFixture();
    await fos.verifyHuman(SAMPLE_DID, await signer.getAddress(), '0x');
    const sig = await signComment(fos, relayer, SAMPLE_URL_HASH, SAMPLE_CID, ZERO, 0n);
    await expect(
      fos.postComment(SAMPLE_DID, SAMPLE_URL_HASH, SAMPLE_CID, ZERO, sig),
    ).to.be.revertedWithCustomError(fos, 'InvalidSignature');
  });

  it('threads a reply under its parent', async () => {
    const { fos, signer } = await deployFixture();
    await fos.verifyHuman(SAMPLE_DID, await signer.getAddress(), '0x');

    const parentSig = await signComment(fos, signer, SAMPLE_URL_HASH, 'cid-parent', ZERO, 0n);
    const tx = await fos.postComment(SAMPLE_DID, SAMPLE_URL_HASH, 'cid-parent', ZERO, parentSig);
    const receipt = await tx.wait();
    const event = receipt!.logs.find(
      (l) => 'fragment' in l && (l as { fragment: { name: string } }).fragment.name === 'CommentPosted',
    ) as unknown as { args: unknown[] };
    const parentId = event.args[1] as string;

    const replySig = await signComment(fos, signer, SAMPLE_URL_HASH, 'cid-reply', parentId, 1n);
    await fos.postComment(SAMPLE_DID, SAMPLE_URL_HASH, 'cid-reply', parentId, replySig);

    const thread = await fos.getThread(SAMPLE_URL_HASH);
    expect(thread.length).to.equal(2);
  });
});

// matcher helper — chai-on-bigint workarounds around timestamp arg
function anyValue() {
  return (val: unknown) => typeof val === 'bigint' || typeof val === 'number';
}
