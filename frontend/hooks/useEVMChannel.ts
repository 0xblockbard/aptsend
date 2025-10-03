// hooks/useEVMChannel.ts
import { useState, useCallback, useEffect, useRef } from 'react';
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
  const [needsSignature, setNeedsSignature] = useState(false);
  const hasTriggeredSync = useRef(false);
  const previousIsConnected = useRef(isConnected);

  // Auto-trigger sync when wallet connects
  useEffect(() => {
    const justConnected = isConnected && !previousIsConnected.current;
    
    if (justConnected && ownerAddress && evmAddress && !hasTriggeredSync.current) {
      hasTriggeredSync.current = true;
      setNeedsSignature(false);
      
      // Small delay to ensure connection is stable
      setTimeout(() => {
        sync();
      }, 100);
    }

    previousIsConnected.current = isConnected;
  }, [isConnected, ownerAddress, evmAddress]);

  // Reset trigger flag when disconnected
  useEffect(() => {
    if (!isConnected) {
      hasTriggeredSync.current = false;
      setNeedsSignature(false);
    }
  }, [isConnected]);

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

      // Reset states
      setNeedsSignature(false);
      hasTriggeredSync.current = false;

      await onIdentitiesChange();

      return { success: true };
    } catch (error: any) {
      console.error('Failed to link EVM wallet:', error);
      
      // Check if user rejected/closed the signature request
      const isUserRejection = 
        error.message?.toLowerCase().includes('user rejected') ||
        error.message?.toLowerCase().includes('user denied') ||
        error.message?.toLowerCase().includes('user cancelled') ||
        error.code === 4001 || // MetaMask rejection code
        error.code === 'ACTION_REJECTED';

      if (isUserRejection) {
        // User closed the modal, mark that they need to sign
        setNeedsSignature(true);
        hasTriggeredSync.current = false;
      }

      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to link wallet',
        isUserRejection,
      };
    } finally {
      setIsLoading(false);
    }
  }, [ownerAddress, evmAddress, chainId, signMessageAsync, disconnect, onIdentitiesChange]);

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
    needsSignature,
  };
}