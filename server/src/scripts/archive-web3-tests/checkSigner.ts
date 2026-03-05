
import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

// ABI for RewardsVault
const ABI = [
    "function backendSigner() view returns (address)",
    "function getDomainSeparator() view returns (bytes32)"
];

async function checkSigner() {
    const rpcUrl = process.env.RPC_URL || 'https://rpc-amoy.polygon.technology';
    const contractAddress = process.env.REWARDS_VAULT_ADDRESS;
    const privateKey = process.env.BACKEND_SIGNER_PRIVATE_KEY;

    if (!contractAddress || !privateKey) {
        console.error("Missing env vars. Address:", contractAddress, "Key found:", !!privateKey);
        return;
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, ABI, provider);
    const wallet = new ethers.Wallet(privateKey);

    console.log("--- CONFIG ---");
    console.log("Contract Address:", contractAddress);
    console.log("Local Signer Address:", wallet.address);

    try {
        const onChainSigner = await contract.backendSigner();
        console.log("On-Chain Signer:     ", onChainSigner);

        if (onChainSigner.toLowerCase() !== wallet.address.toLowerCase()) {
            console.error("❌ MISMATCH! The contract expects a different signer.");
        } else {
            console.log("✅ Signer matches.");
        }

        const domainSeparator = await contract.getDomainSeparator();
        console.log("OnChain DomainSeparator:", domainSeparator);

        // Calculate expected Domain Separator
        const chainId = (await provider.getNetwork()).chainId;
        console.log("Chain ID:", chainId.toString());

        const domain = {
            name: 'ARIS RewardsVault',
            version: '1',
            chainId: chainId,
            verifyingContract: contractAddress
        };

        const calculatedDomainSeparator = ethers.TypedDataEncoder.hashDomain(domain);
        console.log("Local DomainSeparator: ", calculatedDomainSeparator);

        if (domainSeparator !== calculatedDomainSeparator) {
            console.error("❌ DOMAIN SEPARATOR MISMATCH!");
            console.log("Check chainId and name/version in RewardsService vs Contract");
        } else {
            console.log("✅ Domain Separator matches.");
        }

    } catch (e: any) {
        console.error("Error reading contract:", e.message);
    }
}

checkSigner();
