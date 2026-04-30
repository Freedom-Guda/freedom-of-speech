import hre from 'hardhat';
import { network, run } from 'hardhat';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddr);

  console.log(`Deploying to network: ${network.name}`);
  console.log(`Deployer: ${deployerAddr}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  // 1. Mock verifier on testnets/local; the real Semaphore verifier address
  //    is wired in on mainnet via VERIFIER_ADDRESS.
  let verifierAddress = process.env.VERIFIER_ADDRESS;
  if (!verifierAddress) {
    if (network.name === 'base') {
      throw new Error('VERIFIER_ADDRESS is required for base mainnet deploys');
    }
    console.log('Deploying MockHumanVerifier (test/dev only)…');
    const MockFactory = await ethers.getContractFactory('MockHumanVerifier');
    const mock = await MockFactory.deploy();
    await mock.waitForDeployment();
    verifierAddress = await mock.getAddress();
    console.log(`  MockHumanVerifier: ${verifierAddress}`);
  } else {
    console.log(`Using existing verifier at ${verifierAddress}`);
  }

  // 2. FreedomOfSpeech
  console.log('Deploying FreedomOfSpeech…');
  const FosFactory = await ethers.getContractFactory('FreedomOfSpeech');
  const fos = await FosFactory.deploy(deployerAddr);
  await fos.waitForDeployment();
  const fosAddress = await fos.getAddress();
  console.log(`  FreedomOfSpeech: ${fosAddress}`);

  console.log('Setting verifier on FreedomOfSpeech…');
  await (await fos.setVerifier(verifierAddress)).wait();

  // 3. SocialGraph
  console.log('Deploying SocialGraph…');
  const SgFactory = await ethers.getContractFactory('SocialGraph');
  const sg = await SgFactory.deploy();
  await sg.waitForDeployment();
  const sgAddress = await sg.getAddress();
  console.log(`  SocialGraph: ${sgAddress}`);

  // 4. Persist deployment record so the extension + indexer can read it.
  const record = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployerAddr,
    deployedAt: new Date().toISOString(),
    contracts: {
      FreedomOfSpeech: fosAddress,
      SocialGraph: sgAddress,
      Verifier: verifierAddress,
    },
  };

  const dir = path.resolve('deployments');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${network.name}.json`);
  await fs.writeFile(file, JSON.stringify(record, null, 2) + '\n');
  console.log(`Deployment record → ${file}`);

  // 5. Auto-verify on the explorer where supported.
  if (network.name === 'baseSepolia' || network.name === 'base') {
    console.log('Waiting 30s for explorer to index before verification…');
    await new Promise((r) => setTimeout(r, 30_000));

    for (const [name, address, args] of [
      ['FreedomOfSpeech', fosAddress, [deployerAddr]],
      ['SocialGraph', sgAddress, []],
    ] as const) {
      try {
        await run('verify:verify', { address, constructorArguments: args });
        console.log(`Verified: ${name}`);
      } catch (e) {
        console.warn(`Verification failed for ${name}:`, (e as Error).message);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
