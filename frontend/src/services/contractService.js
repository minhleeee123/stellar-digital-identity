import * as StellarSDK from '@stellar/stellar-sdk';
import { CONTRACT_ID, SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from '../config';

const server = new StellarSDK.SorobanRpc.Server(SOROBAN_RPC_URL);

// Helper function to convert hex string to Uint8Array for browser compatibility
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Helper function to convert Uint8Array to hex string
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper function to build transaction
async function buildTransaction(sourceAccount, operation) {
  const account = await server.getAccount(sourceAccount);
  
  const transaction = new StellarSDK.TransactionBuilder(account, {
    fee: StellarSDK.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();
  
  return transaction;
}

// Helper function to simulate and send transaction
async function simulateAndSend(transaction, signer) {
  try {
    // Simulate
    const simulated = await server.simulateTransaction(transaction);
    
    if (StellarSDK.SorobanRpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }
    
    // Prepare transaction
    const prepared = StellarSDK.SorobanRpc.assembleTransaction(
      transaction,
      simulated
    ).build();
    
    // Sign
    prepared.sign(signer);
    
    // Send
    const result = await server.sendTransaction(prepared);
    
    // Wait for result
    if (result.status === 'PENDING') {
      let getResponse = await server.getTransaction(result.hash);
      let attempts = 0;
      const maxAttempts = 30; // Wait up to 30 seconds
      
      while (getResponse.status === 'NOT_FOUND' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        getResponse = await server.getTransaction(result.hash);
        attempts++;
      }
      
      if (getResponse.status === 'SUCCESS') {
        return getResponse;
      } else if (getResponse.status === 'FAILED') {
        throw new Error(`Transaction failed: ${JSON.stringify(getResponse.resultXdr)}`);
      } else {
        throw new Error(`Transaction timeout or unknown status: ${getResponse.status}`);
      }
    }
    
    return result;
  } catch (error) {
    // Enhanced error handling
    if (error.message.includes('Account not found')) {
      throw new Error('Tài khoản chưa được tạo trên network. Vui lòng fund ví từ testnet faucet!');
    }
    throw error;
  }
}

// Contract methods
export const contractService = {
  
  // Initialize contract
  async initialize(adminKeypair) {
    const adminAddress = adminKeypair.publicKey();
    
    const operation = StellarSDK.Operation.invokeContractFunction({
      contract: CONTRACT_ID,
      function: 'initialize',
      args: [
        new StellarSDK.Address(adminAddress).toScVal()
      ]
    });
    
    const transaction = await buildTransaction(adminAddress, operation);
    return await simulateAndSend(transaction, adminKeypair);
  },
  
  // Register identity
  async registerIdentity(ownerKeypair, identityId, fullName, email, documentHash) {
    const ownerAddress = ownerKeypair.publicKey();
    
    const operation = StellarSDK.Operation.invokeContractFunction({
      contract: CONTRACT_ID,
      function: 'register_identity',
      args: [
        StellarSDK.nativeToScVal(identityId, { type: 'string' }),
        new StellarSDK.Address(ownerAddress).toScVal(),
        StellarSDK.nativeToScVal(fullName, { type: 'string' }),
        StellarSDK.nativeToScVal(email, { type: 'string' }),
        StellarSDK.nativeToScVal(hexToBytes(documentHash), { type: 'bytes' })
      ]
    });
    
    const transaction = await buildTransaction(ownerAddress, operation);
    return await simulateAndSend(transaction, ownerKeypair);
  },
  
  // Update identity
  async updateIdentity(ownerKeypair, identityId, fullName, email, documentHash) {
    const ownerAddress = ownerKeypair.publicKey();
    
    const operation = StellarSDK.Operation.invokeContractFunction({
      contract: CONTRACT_ID,
      function: 'update_identity',
      args: [
        StellarSDK.nativeToScVal(identityId, { type: 'string' }),
        StellarSDK.nativeToScVal(fullName, { type: 'string' }),
        StellarSDK.nativeToScVal(email, { type: 'string' }),
        StellarSDK.nativeToScVal(hexToBytes(documentHash), { type: 'bytes' })
      ]
    });
    
    const transaction = await buildTransaction(ownerAddress, operation);
    return await simulateAndSend(transaction, ownerKeypair);
  },
  
  // Get identity (read-only)
  async getIdentity(requesterPublicKey, identityId) {
    const operation = StellarSDK.Operation.invokeContractFunction({
      contract: CONTRACT_ID,
      function: 'get_identity',
      args: [
        StellarSDK.nativeToScVal(identityId, { type: 'string' }),
        new StellarSDK.Address(requesterPublicKey).toScVal()
      ]
    });
    
    // For read-only, we just need any valid source account
    const transaction = await buildTransaction(requesterPublicKey, operation);
    
    const simulated = await server.simulateTransaction(transaction);
    
    if (StellarSDK.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      const result = StellarSDK.scValToNative(simulated.result.retval);
      
      // Convert document_hash from Uint8Array to hex string for display
      if (result && result.document_hash) {
        result.document_hash = bytesToHex(result.document_hash);
      }
      
      return result;
    }
    
    throw new Error('Failed to get identity');
  },
  
  // Verify identity (admin only)
  async verifyIdentity(adminKeypair, identityId, verificationLevel) {
    const adminAddress = adminKeypair.publicKey();
    
    const operation = StellarSDK.Operation.invokeContractFunction({
      contract: CONTRACT_ID,
      function: 'verify_identity',
      args: [
        StellarSDK.nativeToScVal(identityId, { type: 'string' }),
        StellarSDK.nativeToScVal(verificationLevel, { type: 'u32' })
      ]
    });
    
    const transaction = await buildTransaction(adminAddress, operation);
    return await simulateAndSend(transaction, adminKeypair);
  },
  
  // Grant access
  async grantAccess(ownerKeypair, identityId, grantedTo, permissionType, durationSeconds) {
    const ownerAddress = ownerKeypair.publicKey();
    
    const operation = StellarSDK.Operation.invokeContractFunction({
      contract: CONTRACT_ID,
      function: 'grant_access',
      args: [
        StellarSDK.nativeToScVal(identityId, { type: 'string' }),
        new StellarSDK.Address(grantedTo).toScVal(),
        StellarSDK.nativeToScVal(permissionType, { type: 'u32' }),
        StellarSDK.nativeToScVal(durationSeconds, { type: 'u64' })
      ]
    });
    
    const transaction = await buildTransaction(ownerAddress, operation);
    return await simulateAndSend(transaction, ownerKeypair);
  },
  
  // Revoke access
  async revokeAccess(ownerKeypair, identityId, revokedFrom) {
    const ownerAddress = ownerKeypair.publicKey();
    
    const operation = StellarSDK.Operation.invokeContractFunction({
      contract: CONTRACT_ID,
      function: 'revoke_access',
      args: [
        StellarSDK.nativeToScVal(identityId, { type: 'string' }),
        new StellarSDK.Address(revokedFrom).toScVal()
      ]
    });
    
    const transaction = await buildTransaction(ownerAddress, operation);
    return await simulateAndSend(transaction, ownerKeypair);
  },
  
  // Deactivate identity
  async deactivateIdentity(ownerKeypair, identityId) {
    const ownerAddress = ownerKeypair.publicKey();
    
    const operation = StellarSDK.Operation.invokeContractFunction({
      contract: CONTRACT_ID,
      function: 'deactivate_identity',
      args: [
        StellarSDK.nativeToScVal(identityId, { type: 'string' })
      ]
    });
    
    const transaction = await buildTransaction(ownerAddress, operation);
    return await simulateAndSend(transaction, ownerKeypair);
  },
  
  // Get total identities (read-only)
  async getTotalIdentities() {
    const dummyKeypair = StellarSDK.Keypair.random();
    const dummyAddress = dummyKeypair.publicKey();
    
    const operation = StellarSDK.Operation.invokeContractFunction({
      contract: CONTRACT_ID,
      function: 'get_total_identities',
      args: []
    });
    
    const transaction = await buildTransaction(dummyAddress, operation);
    
    const simulated = await server.simulateTransaction(transaction);
    
    if (StellarSDK.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      return StellarSDK.scValToNative(simulated.result.retval);
    }
    
    return 0;
  },
  
  // Get admin address (read-only)
  async getAdmin() {
    const dummyKeypair = StellarSDK.Keypair.random();
    const dummyAddress = dummyKeypair.publicKey();
    
    const operation = StellarSDK.Operation.invokeContractFunction({
      contract: CONTRACT_ID,
      function: 'get_admin',
      args: []
    });
    
    const transaction = await buildTransaction(dummyAddress, operation);
    
    const simulated = await server.simulateTransaction(transaction);
    
    if (StellarSDK.SorobanRpc.Api.isSimulationSuccess(simulated)) {
      return StellarSDK.scValToNative(simulated.result.retval);
    }
    
    return null;
  }
};
