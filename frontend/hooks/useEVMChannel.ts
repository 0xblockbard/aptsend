// hooks/useEVMChannel.ts
import { useState, useCallback } from 'react';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { verifyMessage } from 'viem';
import { evmApi } from '@/services/evmApi';
import { EVMIdentity, SyncResult } from '@/types/channelTypes';

interface UseEVMChannelProps {
  ownerAddress: AccountAddress | undefined;
  evmIdentities: EVMIdentity[];
  onIdentitiesChange: () => Promise<void>;
}

export function useEVMChannel({ 
  ownerAddress, 
  evmIdentities,
  onIdentitiesChange 
}: UseEVMChannelProps) {
  const { address: evmAddress, chainId, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const [isLoading, setIsLoading] = useState(false);

  const sync = useCallback(async (): Promise<SyncResult> => {
    if (!ownerAddress) {
      return { success: false, error: 'Aptos wallet not connected' };
    }

    if (!evmAddress || !chainId) {
      return { success: false, error: 'EVM wallet not connected' };
    }

    setIsLoading(true);

    try {
      // Generate challenge message
      const message = `Link EVM wallet to AptSend\n\nAptos Address: ${ownerAddress}\nEVM Address: ${evmAddress}\nChain ID: ${chainId}\nTimestamp: ${Date.now()}`;

      // Sign the message
      const signature = await signMessageAsync({ message });

      // Verify signature using viem
      const isValid = await verifyMessage({
        address: evmAddress,
        message: message,
        signature: signature,
      });

      if (!isValid) {
        return { success: false, error: 'Signature verification failed' };
      }

      // Send to backend
      await evmApi.linkWallet({
        owner_address: ownerAddress.toString(),
        evm_address: evmAddress,
        chain_id: chainId,
      });

      // Disconnect wallet after successful link
      disconnect();

      return { success: true };
    } catch (error: any) {
      console.error('Failed to link EVM wallet:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to link wallet',
      };
    } finally {
      setIsLoading(false);
    }
  }, [ownerAddress, evmAddress, chainId, signMessageAsync, disconnect]);

  const unsync = useCallback(async (accountId: string): Promise<void> => {
    // TODO: Implement unsync API call
    console.log('Unsync EVM account:', accountId);
    await onIdentitiesChange();
  }, [onIdentitiesChange]);

  return {
    accounts: evmIdentities,
    isLoading,
    sync,
    unsync,
    evmAddress,
    chainId,
    isConnected,
    disconnect,
  };
}