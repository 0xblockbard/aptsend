import { useState, useEffect, useCallback } from 'react';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { getAllIdentities, type ChannelIdentity } from '../services/channelApi';
import { useTwitterChannel } from './useTwitterChannel';
// Import other channel hooks as you build them

export type ChannelType = "twitter" | "telegram" | "email" | "discord" | "evm";

export function useChannels(ownerAddress: AccountAddress | undefined) {
  const [identities, setIdentities] = useState<Record<string, ChannelIdentity[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Individual channel hooks
  const twitter = useTwitterChannel(ownerAddress);

  const loadAllIdentities = useCallback(async () => {
    if (!ownerAddress) return;

    try {
      setIsLoading(true);
      const allIdentities = await getAllIdentities(ownerAddress);
      setIdentities(allIdentities);
    } catch (error) {
      console.error('Failed to load identities:', error);
    } finally {
      setIsLoading(false);
    }
  }, [ownerAddress]);

  useEffect(() => {
    loadAllIdentities();
  }, [loadAllIdentities]);

  const syncChannel = async (channelType: ChannelType) => {
    switch (channelType) {
      case 'twitter':
        const result = await twitter.sync();
        if (result.success) {
          await loadAllIdentities();
        }
        return result;
      // Add other channels here
      default:
        return { success: false, error: 'Channel not implemented' };
    }
  };

  const unlinkAccount = async (channelType: ChannelType, accountId: string) => {
    switch (channelType) {
      case 'twitter':
        await twitter.unlink(accountId);
        await loadAllIdentities();
        break;
      // Add other channels here
    }
  };

  return {
    identities,
    isLoading,
    syncChannel,
    unlinkAccount,
    reload: loadAllIdentities,
  };
}