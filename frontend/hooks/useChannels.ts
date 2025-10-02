import { useState, useEffect, useCallback, useMemo } from 'react';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { getAllIdentities } from '../services/channelApi';
import { useTwitterChannel } from './useTwitterChannel';
import { 
  ChannelIdentity, 
  ChannelType,
  TwitterIdentity,
  SyncResult
} from '../types/channelTypes';

export interface UseChannelsReturn {
  identities: Record<string, ChannelIdentity[]>;
  primaryVaultAddress: string | null;
  isLoading: boolean;
  syncChannel: (channelType: ChannelType) => Promise<SyncResult>;
  unsyncChannel: (channelType: ChannelType, accountId: string) => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Main hook for managing all channel identities
 * This is the single source of truth for all channel data
 */
export function useChannels(ownerAddress: AccountAddress | undefined): UseChannelsReturn {
  const [identities, setIdentities] = useState<Record<string, ChannelIdentity[]>>({});
  const [primaryVaultAddress, setPrimaryVaultAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadAllIdentities = useCallback(async () => {
    if (!ownerAddress) {
      setIdentities({});
      setPrimaryVaultAddress(null);
      return;
    }

    try {
      setIsLoading(true);
      const response = await getAllIdentities(ownerAddress);
      setIdentities(response.identities);
      setPrimaryVaultAddress(response.primary_vault_address);
    } catch (error) {
      console.error('Failed to load identities:', error);
      setIdentities({});
      setPrimaryVaultAddress(null);
    } finally {
      setIsLoading(false);
    }
  }, [ownerAddress]);

  useEffect(() => {
    loadAllIdentities();
  }, [loadAllIdentities]);

  // Extract Twitter identities from the main identities object
  const twitterIdentities = useMemo(() => {
    return (identities.twitter || []) as TwitterIdentity[];
  }, [identities]);

  // Initialize Twitter channel hook with identities from main state
  const twitter = useTwitterChannel({
    ownerAddress,
    twitterIdentities,
    onIdentitiesChange: loadAllIdentities
  });

  const syncChannel = async (channelType: ChannelType): Promise<SyncResult> => {
    switch (channelType) {
      case 'twitter':
        const result = await twitter.sync();
        if (result.success) {
          // Twitter hook will call onIdentitiesChange after OAuth completes
          // But we can also reload here for immediate feedback
          await loadAllIdentities();
        }
        return result;
      
      case 'telegram':
      case 'email':
      case 'discord':
      case 'evm':
        // TODO: Implement other channels
        return { success: false, error: `${channelType} not implemented yet` };
      
      default:
        return { success: false, error: 'Unknown channel type' };
    }
  };

  const unsyncChannel = async (channelType: ChannelType, accountId: string): Promise<void> => {
    switch (channelType) {
      case 'twitter':
        await twitter.unsync(accountId);
        // Note: twitter.unsync() already calls onIdentitiesChange (loadAllIdentities) internally
        break;
      
      case 'telegram':
      case 'email':
      case 'discord':
      case 'evm':
        // TODO: Implement other channels
        throw new Error(`${channelType} unsync not implemented yet`);
      
      default:
        throw new Error('Unknown channel type');
    }
  };

  return {
    identities,
    primaryVaultAddress,
    isLoading: isLoading || twitter.isLoading,
    syncChannel,
    unsyncChannel,
    reload: loadAllIdentities,
  };
}