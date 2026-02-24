import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function checkSignerConfig() {
  const privateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY;
  if (!privateKey) {
    console.log('No private key found');
    return;
  }

  const wallet = new ethers.Wallet(privateKey);
  console.log('=== BACKEND SIGNER CONFIGURATION ===');
  console.log('Signer Address:', wallet.address);

  const REWARDS_VAULT_ADDRESS = process.env.REWARDS_VAULT_ADDRESS;
  const CHAIN_ID = process.env.CHAIN_ID;
  const RPC_URL = process.env.RPC_URL;

  console.log('Contract Address:', REWARDS_VAULT_ADDRESS);
  console.log('Chain ID:', CHAIN_ID);
  console.log('RPC URL:', RPC_URL);

  const EIP712_DOMAIN = {
    name: 'ARIS RewardsVault',
    version: '1',
    chainId: parseInt(CHAIN_ID || '80002'),
    verifyingContract: REWARDS_VAULT_ADDRESS,
  };
  console.log('\nEIP-712 Domain:', JSON.stringify(EIP712_DOMAIN, null, 2));

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(
    REWARDS_VAULT_ADDRESS || '',
    [
      'function backendSigner() view returns (address)',
      'function owner() view returns (address)',
      'function getDomainSeparator() view returns (bytes32)',
    ],
    provider
  );

  try {
    const s = await contract.backendSigner();
    console.log('\nContract backendSigner():', s);
    console.log('Matches our signer:', s.toLowerCase() === wallet.address.toLowerCase() ? 'YES' : 'NO - MISMATCH!');
  } catch (e) {
    console.log('backendSigner() not found or error');
  }

  try {
    const owner = await contract.owner();
    console.log('Contract owner():', owner);
  } catch (e) {
    console.log('owner() not found');
  }

  try {
    const separator = await contract.getDomainSeparator();
    console.log('\nContract Domain Separator:', separator);

    // Calculate local separator
    const localSeparator = ethers.TypedDataEncoder.hashDomain(EIP712_DOMAIN);
    console.log('Local Domain Separator:   ', localSeparator);

    if (separator === localSeparator) {
      console.log('DOMAIN SEPARATOR MATCHES! ✅');
    } else {
      console.log('DOMAIN SEPARATOR MISMATCH! ❌');
      console.log('Check name, version, chainId, verifyingContract.');
    }
  } catch (e: any) {
    console.log('getDomainSeparator() failed:', e.message);
  }
}

checkSignerConfig();
