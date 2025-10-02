import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { MODULE_ADDRESS, MODULE_NAME, APT_DECIMALS } from "../constants";

// Convert APT amount to octas (smallest unit)
function aptToOctas(amount: string): number {
  const result = Math.floor(parseFloat(amount) * Math.pow(10, APT_DECIMALS));
  console.log(`Converting ${amount} APT to ${result} octas`);
  return result;
}

export async function depositToVault(
  amount: string
): Promise<InputTransactionData> {
  const amountInOctas = aptToOctas(amount);
  
  const transaction: InputTransactionData = {
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::deposit_to_primary_vault`,
      functionArguments: [amountInOctas],
    },
  };
  
  console.log("=== DEPOSIT TRANSACTION ===");
  console.log("Amount:", amount);
  console.log("Amount in octas:", amountInOctas);
  console.log("Full transaction object:", JSON.stringify(transaction, null, 2));
  
  return transaction;
}

export async function withdrawFromVault(
  toAddress: string,
  amount: string
): Promise<InputTransactionData> {
  const amountInOctas = aptToOctas(amount);
  
  const transaction: InputTransactionData = {
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::withdraw_from_primary_vault`,
      functionArguments: [toAddress, amountInOctas],
    },
  };
  
  console.log("=== WITHDRAW TRANSACTION ===");
  console.log("To Address:", toAddress);
  console.log("Amount:", amount);
  console.log("Amount in octas:", amountInOctas);
  console.log("Module function:", `${MODULE_ADDRESS}::${MODULE_NAME}::withdraw_from_primary_vault`);
  console.log("Full transaction object:", JSON.stringify(transaction, null, 2));
  
  return transaction;
}

export async function depositFAToVault(
  faMetadataAddress: string,
  amount: string,
  decimals: number = 6
): Promise<InputTransactionData> {
  const amountInSmallestUnit = Math.floor(parseFloat(amount) * Math.pow(10, decimals));
  
  const transaction: InputTransactionData = {
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::deposit_fa_to_primary_vault`,
      functionArguments: [faMetadataAddress, amountInSmallestUnit],
    },
  };
  
  console.log("=== DEPOSIT FA TRANSACTION ===");
  console.log("FA Metadata:", faMetadataAddress);
  console.log("Amount:", amount);
  console.log("Amount in smallest unit:", amountInSmallestUnit);
  console.log("Full transaction object:", JSON.stringify(transaction, null, 2));
  
  return transaction;
}

export async function withdrawFAFromVault(
  faMetadataAddress: string,
  toAddress: string,
  amount: string,
  decimals: number = 6
): Promise<InputTransactionData> {
  const amountInSmallestUnit = Math.floor(parseFloat(amount) * Math.pow(10, decimals));
  
  const transaction: InputTransactionData = {
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::withdraw_fa_from_primary_vault`,
      functionArguments: [faMetadataAddress, toAddress, amountInSmallestUnit],
    },
  };
  
  console.log("=== WITHDRAW FA TRANSACTION ===");
  console.log("FA Metadata:", faMetadataAddress);
  console.log("To Address:", toAddress);
  console.log("Amount:", amount);
  console.log("Full transaction object:", JSON.stringify(transaction, null, 2));
  
  return transaction;
}

export const TOKEN_METADATA = {
  usdc: "0x...", // Replace with actual USDC metadata address on Aptos testnet
  usdt: "0x...", // Replace with actual USDT metadata address on Aptos testnet
};

// Helper function to wait for transaction confirmation
export async function waitForTransaction(txHash: string): Promise<boolean> {
  const maxAttempts = 10;
  const delayMs = 1000;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(
        `https://api.testnet.aptoslabs.com/v1/transactions/by_hash/${txHash}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`✅ Transaction confirmed: ${txHash}`);
          return true;
        }
      }
    } catch (error) {
      console.log(`Waiting for transaction confirmation... (${i + 1}/${maxAttempts})`);
    }
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  console.log(`⚠️ Transaction confirmation timeout: ${txHash}`);
  return false;
}