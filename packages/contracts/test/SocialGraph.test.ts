import { expect } from 'chai';
import hre from 'hardhat';

const { ethers } = hre;

const ALICE = 'did:key:zAlice';
const BOB = 'did:key:zBob';
const CAROL = 'did:key:zCarol';

describe('SocialGraph', () => {
  async function deploy() {
    const SG = await ethers.getContractFactory('SocialGraph');
    const sg = await SG.deploy();
    await sg.waitForDeployment();
    return { sg };
  }

  it('blocks and lists', async () => {
    const { sg } = await deploy();
    await sg.blockDid(ALICE, BOB);
    await sg.blockDid(ALICE, CAROL);
    const list = await sg.getBlocked(ALICE);
    expect(list).to.deep.equal([BOB, CAROL]);
    expect(await sg.hasBlocked(ALICE, BOB)).to.equal(true);
    expect(await sg.hasBlocked(ALICE, 'did:key:zUnrelated')).to.equal(false);
  });

  it('rejects double-blocks', async () => {
    const { sg } = await deploy();
    await sg.blockDid(ALICE, BOB);
    await expect(sg.blockDid(ALICE, BOB)).to.be.revertedWithCustomError(sg, 'AlreadyBlocked');
  });

  it('unblocks via swap-and-pop', async () => {
    const { sg } = await deploy();
    await sg.blockDid(ALICE, BOB);
    await sg.blockDid(ALICE, CAROL);
    await sg.unblockDid(ALICE, BOB);
    const list = await sg.getBlocked(ALICE);
    expect(list).to.deep.equal([CAROL]);
    expect(await sg.hasBlocked(ALICE, BOB)).to.equal(false);
    expect(await sg.hasBlocked(ALICE, CAROL)).to.equal(true);
  });

  it('rejects unblocks for entries not in the list', async () => {
    const { sg } = await deploy();
    await expect(sg.unblockDid(ALICE, BOB)).to.be.revertedWithCustomError(sg, 'NotBlocked');
  });
});
