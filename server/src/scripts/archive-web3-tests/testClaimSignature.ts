import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

const EIP712_CLAIM_TYPES = {
  Claim: [
    { name: 'eventId', type: 'bytes32' },
    { name: 'user', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'claimType', type: 'uint8' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

async function testClaimSignature() {
  const privateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY!;
  const contractAddress = process.env.REWARDS_VAULT_ADDRESS!;
  const chainId = parseInt(process.env.CHAIN_ID || '80002');
  const rpcUrl = process.env.RPC_URL!;

  console.log('=== TEST CLAIM SIGNATURE GENERATION ===\n');

  // Get user and claim info from DB
  const userId = '39438731-be2e-4704-9072-17fc00c1f97c';
  const userAddress = '0xb456a4f3bc892f8ee22da3f2856a24c0f957448c';
  const eventId = 'bf781064-33c3-4942-a806-cce3481bd92c';

  // Get pool from DB
  const pool = await prisma.eventRewardsPool.findUnique({
    where: { eventId },
  });

  if (!pool) {
    console.log('Pool not found');
    return;
  }

  console.log('Pool Info:');
  console.log('  Event ID:', eventId);
  console.log('  On-Chain Event ID:', pool.onChainEventId);
  console.log('  Status:', pool.status);

  // Get claim from DB
  const claim = await prisma.rewardClaim.findFirst({
    where: {
      poolId: pool.id,
      userId,
      claimType: 'BASE_VOTER',
    },
  });

  if (!claim) {
    console.log('Claim not found');
    return;
  }

  console.log('\nClaim Info:');
  console.log('  Claim Type:', claim.claimType);
  console.log('  Final Amount:', claim.finalAmount, 'USDC');
  console.log('  Status:', claim.status);

  // Get nonce from contract
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(
    contractAddress,
    ['function nonces(address) view returns (uint256)'],
    provider
  );
  const nonce = await contract.nonces(userAddress);
  console.log('  User Nonce:', nonce.toString());

  // Generate signature
  const wallet = new ethers.Wallet(privateKey);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const amount = BigInt(Math.floor(claim.finalAmount * 1e6)); // USDC has 6 decimals

  const domain = {
    name: 'ARIS RewardsVault',
    version: '1',
    chainId,
    verifyingContract: contractAddress,
  };

  const value = {
    eventId: pool.onChainEventId,
    user: userAddress,
    amount,
    claimType: 0, // BASE_VOTER = 0
    nonce,
    deadline,
  };

  console.log('\nSigning with EIP-712:');
  console.log('  Domain:', JSON.stringify(domain, null, 2));
  console.log('  Value:', {
    eventId: value.eventId,
    user: value.user,
    amount: value.amount.toString(),
    claimType: value.claimType,
    nonce: value.nonce.toString(),
    deadline: value.deadline.toString(),
  });

  const signature = await wallet.signTypedData(domain, EIP712_CLAIM_TYPES, value);
  console.log('\nGenerated Signature:', signature);

  // Now let's try to verify the signature would work
  console.log('\n=== SIMULATING CONTRACT CALL ===');

  // Encode the claim function call
  const claimAbi = new ethers.Interface([
    'function claim(bytes32 eventId, uint256 amount, uint8 claimType, uint256 deadline, bytes signature)',
  ]);

  const calldata = claimAbi.encodeFunctionData('claim', [
    pool.onChainEventId,
    amount,
    0, // BASE_VOTER
    deadline,
    signature,
  ]);

  console.log('Encoded Calldata:', calldata.slice(0, 100) + '...');

  // Try static call to see if it would succeed
  try {
    const result = await provider.call({
      to: contractAddress,
      data: calldata,
      from: userAddress,
    });
    console.log('Static call result:', result);
    console.log('CLAIM WOULD SUCCEED!');
  } catch (e: any) {
    console.log('Static call FAILED:', e.message);

    // Try to decode the error
    if (e.data) {
      console.log('Error data:', e.data);
    }
  }

  await prisma.$disconnect();
}

testClaimSignature();
