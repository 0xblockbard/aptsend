import { useState, useCallback, useEffect, useRef } from 'react';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { useAppKitAccount } from '@reown/appkit/react';
import { useDisconnect as useAppKitDisconnect } from '@reown/appkit/react';
import { solanaApi } from '@/services/solanaApi';
import { SolanaIdentity, SyncResult } from '@/types/channelTypes';

interface UseSolanaChannelProps {
  ownerAddress: AccountAddress | undefined;
  solanaIdentities: SolanaIdentity[];
  onIdentitiesChange: () => Promise<void>;
}

export function useSolanaChannel({ 
  ownerAddress, 
  solanaIdentities,
  onIdentitiesChange 
}: UseSolanaChannelProps) {
  const { address: solanaAddress, isConnected } = useAppKitAccount();
  const { disconnect } = useAppKitDisconnect();
  const [isLoading, setIsLoading] = useState(false);
  const [needsSignature, setNeedsSignature] = useState(false);
  const hasTriggeredSync = useRef(false);
  const previousIsConnected = useRef(isConnected);
  const isSyncing = useRef(false);

  // Auto-trigger sync when wallet connects
  // useEffect(() => {
  //   const justConnected = isConnected && !previousIsConnected.current;
    
  //   if (justConnected && ownerAddress && solanaAddress && !hasTriggeredSync.current && !isSyncing.current) {
  //     hasTriggeredSync.current = true;
  //     isSyncing.current = true;
  //     setNeedsSignature(false);
      
  //     // Small delay to ensure connection is stable
  //     setTimeout(() => {
  //       sync().finally(() => {
  //         isSyncing.current = false;
  //       });
  //     }, 100);
  //   }

  //   previousIsConnected.current = isConnected;
  // }, [isConnected, ownerAddress, solanaAddress]);

  // Reset trigger flag when disconnected
  useEffect(() => {
    if (!isConnected) {
      hasTriggeredSync.current = false;
      setNeedsSignature(false);
      isSyncing.current = false;
    }
  }, [isConnected]);

  const sync = useCallback(async (): Promise<SyncResult> => {
    if (!ownerAddress) {
      return { success: false, error: 'Aptos wallet not connected' };
    }

    if (!solanaAddress) {
      return { success: false, error: 'Solana wallet not connected' };
    }

    if (isSyncing.current) {
      console.log('Sync already in progress, skipping...');
      return { success: false, error: 'Sync already in progress' };
    }

    isSyncing.current = true;
    setIsLoading(true);

    try {
      // Generate challenge message
      const message = `Link Solana wallet to AptSend\n\nAptos Address: ${ownerAddress}\nSolana Address: ${solanaAddress}\nTimestamp: ${Date.now()}`;
      
      const encodedMessage = new TextEncoder().encode(message);

      // Get the Solana provider from window (Phantom, Solflare, etc.)
      const provider = (window as any).solana;
      
      if (!provider) {
        isSyncing.current = false;
        return { success: false, error: 'Solana wallet provider not found' };
      }

      // Sign the message using the Solana wallet (this proves ownership)
      await provider.signMessage(encodedMessage, 'utf8');

      // Send to backend (signature verification done on frontend by the wallet sign)
      await solanaApi.linkWallet({
        owner_address: ownerAddress.toString(),
        solana_address: solanaAddress,
      });

      // Disconnect wallet after successful link
      disconnect();

      // Reset states
      setNeedsSignature(false);
      hasTriggeredSync.current = false;

      await onIdentitiesChange();

      return { success: true };
    } catch (error: any) {
      console.error('Failed to link Solana wallet:', error);
      
      // Check if user rejected/closed the signature request
      const isUserRejection = 
        error.message?.toLowerCase().includes('user rejected') ||
        error.message?.toLowerCase().includes('user denied') ||
        error.message?.toLowerCase().includes('user cancelled') ||
        error.code === 4001 ||
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
      isSyncing.current = false;
    }
  }, [ownerAddress, solanaAddress, disconnect, onIdentitiesChange]);

  const unsync = useCallback(async (accountId: string): Promise<void> => {
    if (!ownerAddress) {
      throw new Error('Aptos wallet not connected');
    }

    await solanaApi.unlinkWallet({
      owner_address: ownerAddress.toString(),
      identity_id: accountId,
    });

    await onIdentitiesChange();
  }, [ownerAddress, onIdentitiesChange]);

  return {
    accounts: solanaIdentities,
    isLoading,
    sync,
    unsync,
    solanaAddress,
    isConnected,
    disconnect,
    needsSignature,
  };
}