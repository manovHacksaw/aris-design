import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const REWARDS_VAULT_ABI = [
  'function createPool(bytes32 eventId, uint8 eventType, uint256 maxParticipants, uint256 topPoolAmount) external',
  'function getPoolInfo(bytes32 eventId) view returns (tuple(uint8 state, uint8 eventType, address brandAddress, uint256 maxParticipants, uint256 basePool, uint256 topPool, uint256 platformFeePool, uint256 creatorPool, uint256 totalDisbursed, uint256 participantCount))',
  'function calculateRequiredDeposit(uint8 eventType, uint256 maxParticipants, uint256 topPoolAmount) pure returns (uint256)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

async function testPoolCreation() {
  const rpcUrl = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';
  const contractAddress = process.env.REWARDS_VAULT_ADDRESS || '0x2Ece3CBE5734B92cb9E51DB47c904e33DB83157B';
  const usdcAddress = '0x770bc6548328cD0b63327e55AD21C789Fba6a41f';

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, REWARDS_VAULT_ABI, provider);
  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, provider);

  console.log('=== POOL CREATION DIAGNOSTIC ===\n');
  console.log('Contract:', contractAddress);
  console.log('USDC:', usdcAddress);
  console.log('');

  // Test parameters
  const testEventId = ethers.keccak256(ethers.toUtf8Bytes('test-event-' + Date.now()));
  const eventType = 0; // VoteOnly
  const maxParticipants = 10;
  const topPoolAmount = ethers.parseUnits('0.6', 6); // $0.60 USDC

  console.log('Test Parameters:');
  console.log('  Event ID:', testEventId);
  console.log('  Event Type: VoteOnly (0)');
  console.log('  Max Participants:', maxParticipants);
  console.log('  Top Pool:', ethers.formatUnits(topPoolAmount, 6), 'USDC');

  // Calculate required deposit
  try {
    const requiredDeposit = await contract.calculateRequiredDeposit(
      eventType,
      maxParticipants,
      topPoolAmount
    );
    console.log('\nRequired Deposit:', ethers.formatUnits(requiredDeposit, 6), 'USDC');
    console.log('  Base Pool: $0.03 x 10 = $0.30');
    console.log('  Top Pool: $0.60');
    console.log('  Platform Fee: $0.015 x 10 = $0.15');
    console.log('  Total: $1.05');
  } catch (e: any) {
    console.log('\nFailed to calculate deposit:', e.message);
  }

  // Simulate pool creation (static call)
  console.log('\n=== SIMULATING POOL CREATION ===');
  console.log('(This would be called from the brand\'s wallet)\n');

  // Get a sample brand wallet (the one from earlier txs)
  const brandWallet = '0x2D4575003f6017950C2f7a10aFb17bf2fBb648d2';

  // Check USDC balance
  const balance = await usdc.balanceOf(brandWallet);
  console.log('Brand USDC Balance:', ethers.formatUnits(balance, 6), 'USDC');

  // Check allowance
  const allowance = await usdc.allowance(brandWallet, contractAddress);
  console.log('Brand USDC Allowance:', ethers.formatUnits(allowance, 6), 'USDC');

  // Try to simulate createPool
  const iface = new ethers.Interface(REWARDS_VAULT_ABI);
  const calldata = iface.encodeFunctionData('createPool', [
    testEventId,
    eventType,
    maxParticipants,
    topPoolAmount,
  ]);

  console.log('\nSimulating createPool call...');
  try {
    const result = await provider.call({
      to: contractAddress,
      data: calldata,
      from: brandWallet,
    });
    console.log('Static call result:', result);
    console.log('✓ Pool creation would SUCCEED');
  } catch (e: any) {
    console.log('✗ Pool creation would FAIL');
    console.log('Error:', e.message);

    // Try to decode the error
    if (e.data) {
      console.log('Error data:', e.data);
      // Common error selectors
      const errors: Record<string, string> = {
        '0x': 'Generic revert',
        '0x4ca88867': 'TopPoolTooSmall()',
        '0x7c58a2a4': 'PoolAlreadyExists()',
        '0xfb8f41b2': 'PoolNotActive()',
      };
      const selector = e.data.slice(0, 10);
      if (errors[selector]) {
        console.log('Decoded Error:', errors[selector]);
      }
    }
  }

  // Check if any pools exist
  console.log('\n=== CHECKING EXISTING POOLS ===');
  const existingEventIds = [
    '0x191029a11c124bb82e5b67fc964b5c1dce4b7f3164c3e52cfa3ac3c96325d93f',
    '0x682c3566b9685a670f0321dfbef7e2688f9400ec48339e2bb869ca11260aad18',
  ];

  for (const eventId of existingEventIds) {
    const poolInfo = await contract.getPoolInfo(eventId);
    console.log(`\nPool ${eventId.slice(0, 10)}...:`);
    console.log('  State:', ['NOT_CREATED', 'ACTIVE', 'FINALIZED', 'CANCELLED'][poolInfo.state]);
    console.log('  Brand:', poolInfo.brandAddress);
    console.log('  Base Pool:', ethers.formatUnits(poolInfo.basePool, 6), 'USDC');
  }
}

testPoolCreation().catch(console.error);
