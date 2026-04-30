// End-to-end local demo. Boots inline (run via `hardhat run` against an
// already-running `hardhat node`) — deploys all contracts, registers a
// human, posts two comments (one top-level, one reply), and prints the
// resulting state. Run with:
//
//   pnpm node           # in one terminal — boots `hardhat node`
//   pnpm demo:local     # in another terminal — runs this script

import hre from 'hardhat';

const { ethers } = hre;

async function main() {
  const [deployer, signer, relayer] = await ethers.getSigners();
  const log = (msg: string) => console.log(`▸ ${msg}`);

  log(`deployer: ${await deployer.getAddress()}`);
  log(`signer:   ${await signer.getAddress()}`);
  log(`relayer:  ${await relayer.getAddress()}`);

  log('deploying MockHumanVerifier');
  const Mock = await ethers.getContractFactory('MockHumanVerifier');
  const mock = await Mock.deploy();
  await mock.waitForDeployment();

  log('deploying FreedomOfSpeech');
  const Fos = await ethers.getContractFactory('FreedomOfSpeech');
  const fos = await Fos.deploy(await deployer.getAddress());
  await fos.waitForDeployment();
  await (await fos.setVerifier(await mock.getAddress())).wait();

  log('deploying SocialGraph');
  const SG = await ethers.getContractFactory('SocialGraph');
  const sg = await SG.deploy();
  await sg.waitForDeployment();

  const did = 'did:key:z6MkDemoUserOne';
  log(`registering human: ${did}`);
  await (await fos.verifyHuman(did, await signer.getAddress(), '0x')).wait();

  const url = 'https://example.com/freedom-of-speech-demo';
  const urlHash = ethers.keccak256(ethers.toUtf8Bytes(url));

  const sigDomain = {
    name: 'FreedomOfSpeech',
    version: '1',
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract: await fos.getAddress(),
  } as const;
  const sigTypes = {
    Comment: [
      { name: 'urlHash', type: 'bytes32' },
      { name: 'cid', type: 'string' },
      { name: 'parentId', type: 'bytes32' },
      { name: 'nonce', type: 'uint256' },
    ],
  } as const;

  log('posting top-level comment');
  const cid1 = 'bafy-demo-cid-1';
  const sig1 = await signer.signTypedData(sigDomain, sigTypes, {
    urlHash,
    cid: cid1,
    parentId: ethers.ZeroHash,
    nonce: 0,
  });
  const tx1 = await fos.connect(relayer).postComment(did, urlHash, cid1, ethers.ZeroHash, sig1);
  const rc1 = await tx1.wait();
  const log1 = rc1!.logs.find(
    (l) => 'fragment' in l && (l as { fragment: { name: string } }).fragment.name === 'CommentPosted',
  ) as unknown as { args: unknown[] } | undefined;
  const parentId = log1?.args[1] as string | undefined;
  if (!parentId) throw new Error('CommentPosted not found');

  log(`  → parentId: ${parentId}`);

  log('posting reply');
  const cid2 = 'bafy-demo-cid-2';
  const sig2 = await signer.signTypedData(sigDomain, sigTypes, {
    urlHash,
    cid: cid2,
    parentId,
    nonce: 1,
  });
  await (await fos.connect(relayer).postComment(did, urlHash, cid2, parentId, sig2)).wait();

  const thread = await fos.getThread(urlHash);
  log(`thread length: ${thread.length}`);
  for (let i = 0; i < thread.length; i++) {
    const c = await fos.comments(thread[i]!);
    console.log(`    [${i}] cid=${c.cid} parent=${c.parentId.slice(0, 10)}…`);
  }

  log('blocking demo');
  const otherDid = 'did:key:z6MkDemoUserTwo';
  await (await sg.blockDid(did, otherDid)).wait();
  const blocked = await sg.getBlocked(did);
  log(`  blocked from ${did}: ${blocked.join(', ')}`);

  log('done. addresses:');
  console.log(`    FreedomOfSpeech: ${await fos.getAddress()}`);
  console.log(`    SocialGraph:     ${await sg.getAddress()}`);
  console.log(`    MockVerifier:    ${await mock.getAddress()}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
