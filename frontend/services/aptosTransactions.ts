import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { MODULE_ADDRESS, MODULE_NAME, APT_DECIMALS } from "../constants";
import { logger } from '../utils/logger';

// Convert APT amount to octas (smallest unit)
function aptToOctas(amount: string): number {
  const result = Math.floor(parseFloat(amount) * Math.pow(10, APT_DECIMALS));
  logger.log(`Converting ${amount} APT to ${result} octas`);
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
  
  logger.log("=== DEPOSIT TRANSACTION ===");
  logger.log("Amount:", amount);
  logger.log("Amount in octas:", amountInOctas);
  logger.log("Full transaction object:", JSON.stringify(transaction, null, 2));
  
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
  
  logger.log("=== WITHDRAW TRANSACTION ===");
  logger.log("To Address:", toAddress);
  logger.log("Amount:", amount);
  logger.log("Amount in octas:", amountInOctas);
  logger.log("Module function:", `${MODULE_ADDRESS}::${MODULE_NAME}::withdraw_from_primary_vault`);
  logger.log("Full transaction object:", JSON.stringify(transaction, null, 2));
  
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
  
  logger.log("=== DEPOSIT FA TRANSACTION ===");
  logger.log("FA Metadata:", faMetadataAddress);
  logger.log("Amount:", amount);
  logger.log("Amount in smallest unit:", amountInSmallestUnit);
  logger.log("Full transaction object:", JSON.stringify(transaction, null, 2));
  
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
  
  logger.log("=== WITHDRAW FA TRANSACTION ===");
  logger.log("FA Metadata:", faMetadataAddress);
  logger.log("To Address:", toAddress);
  logger.log("Amount:", amount);
  logger.log("Full transaction object:", JSON.stringify(transaction, null, 2));
  
  return transaction;
}


export async function sendFromPrimaryVault(
  toChannel: string,
  toUserId: string,
  amount: string
): Promise<InputTransactionData> {
  const amountInOctas = aptToOctas(amount);

  const transaction: InputTransactionData = {
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::send_from_primary_vault`,
      functionArguments: [
        Buffer.from(toChannel), 
        Buffer.from(toUserId), 
        amountInOctas,
      ],
    },
  };

  logger.log("=== SEND APT TRANSACTION ===");
  logger.log("To Channel:", toChannel);
  logger.log("To User ID:", toUserId);
  logger.log("Amount:", amount);
  logger.log("Amount in octas:", amountInOctas);
  logger.log("Full transaction object:", JSON.stringify(transaction, null, 2));

  return transaction;
}

export async function sendFAFromPrimaryVault(
  toChannel: string,
  toUserId: string,
  faMetadataAddress: string,
  amount: string,
  decimals: number = 6
): Promise<InputTransactionData> {
  const amountInSmallestUnit = Math.floor(parseFloat(amount) * Math.pow(10, decimals));

  const transaction: InputTransactionData = {
    data: {
      function: `${MODULE_ADDRESS}::${MODULE_NAME}::send_fa_from_primary_vault`,
      functionArguments: [
        Buffer.from(toChannel), 
        Buffer.from(toUserId), 
        faMetadataAddress, 
        amountInSmallestUnit,
      ],
    },
  };

  logger.log("=== SEND FA TRANSACTION ===");
  logger.log("To Channel:", toChannel);
  logger.log("To User ID:", toUserId);
  logger.log("FA Metadata:", faMetadataAddress);
  logger.log("Amount:", amount);
  logger.log("Amount in smallest unit:", amountInSmallestUnit);
  logger.log("Full transaction object:", JSON.stringify(transaction, null, 2));

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
          logger.log(`Transaction confirmed: ${txHash}`);
          return true;
        }
      }
    } catch (error) {
      logger.log(`Waiting for transaction confirmation... (${i + 1}/${maxAttempts})`);
    }
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  logger.log(`⚠️ Transaction confirmation timeout: ${txHash}`);
  return false;
}