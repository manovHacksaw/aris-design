import { ethers } from 'ethers';

/**
 * Verify EIP-191 signature from an EOA (Externally Owned Account)
 */
export async function verifyEOASignature(
  message: string,
  signature: string,
  address: string
): Promise<boolean> {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Error verifying EOA signature:', error);
    return false;
  }
}

/**
 * Verify EIP-1271 signature from a smart account (contract wallet)
 * This is what ZeroDev smart accounts use
 */
export async function verifySmartAccountSignature(
  message: string,
  signature: string,
  smartAccountAddress: string,
  provider: ethers.Provider
): Promise<boolean> {
  try {
    // First, try EIP-191 verification (in case it's an EOA)
    const eoaVerified = await verifyEOASignature(message, signature, smartAccountAddress);
    if (eoaVerified) {
      return true;
    }

    // Check if address is a contract
    const code = await provider.getCode(smartAccountAddress);
    if (code === '0x') {
      // Not a contract, so EOA verification should have worked
      return false;
    }

    // For smart accounts, we need to verify using EIP-1271
    // The message hash needs to be formatted according to EIP-191
    const messageHash = ethers.hashMessage(message);
    
    // Call isValidSignature on the smart account contract
    // EIP-1271 magic value: 0x1626ba7e
    const ERC1271_MAGIC_VALUE = '0x1626ba7e';
    
    try {
      // Create a contract interface for EIP-1271
      const abi = [
        'function isValidSignature(bytes32 _hash, bytes _signature) external view returns (bytes4)'
      ];
      const contract = new ethers.Contract(smartAccountAddress, abi, provider);
      
      const result = await contract.isValidSignature(messageHash, signature);
      return result === ERC1271_MAGIC_VALUE;
    } catch (error) {
      console.error('Error calling isValidSignature:', error);
      return false;
    }
  } catch (error) {
    console.error('Error verifying smart account signature:', error);
    return false;
  }
}

/**
 * Verify signature from either EOA or smart account
 * Automatically detects which type and verifies accordingly
 */
export async function verifySignature(
  message: string,
  signature: string,
  address: string,
  provider?: ethers.Provider
): Promise<boolean> {
  // If no provider provided, try EOA verification only
  if (!provider) {
    return verifyEOASignature(message, signature, address);
  }

  // Try EOA first (faster)
  const eoaVerified = await verifyEOASignature(message, signature, address);
  if (eoaVerified) {
    return true;
  }

  // If EOA verification failed and we have a provider, try smart account
  return verifySmartAccountSignature(message, signature, address, provider);
}

/**
 * Create a message for users to sign
 * Includes timestamp and nonce for replay protection
 */
export function createAuthMessage(address: string, nonce: string): string {
  const timestamp = Date.now();
  return `Sign this message to authenticate with ARIS Server.

Address: ${address}
Nonce: ${nonce}
Timestamp: ${timestamp}

This request will not trigger a blockchain transaction or cost any gas fees.`;
}


