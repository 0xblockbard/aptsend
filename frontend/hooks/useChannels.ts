// hooks/useChannels.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { AccountAddress, Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { getAllIdentities } from '../services/channelApi';
import { useTwitterChannel } from './useTwitterChannel';
import { useEVMChannel } from './useEVMChannel';
import { useSolanaChannel } from './useSolanaChannel';
import { useGoogleChannel } from './useGoogleChannel';
import { useTelegramChannel } from './useTelegramChannel';
import { useDiscordChannel } from './useDiscordChannel';
import { 
  ChannelIdentity, 
  ChannelType,
  TwitterIdentity,
  TelegramIdentity,
  DiscordIdentity,
  GoogleIdentity,
  SyncResult,
  EVMIdentity,
  SolanaIdentity
} from '../types/channelTypes';

import { MODULE_ADDRESS, NETWORK } from "@/constants";
import { logger } from '../utils/logger';

const aptosConfig = new AptosConfig({ network: NETWORK as Network });
const aptos = new Aptos(aptosConfig);

export interface UseChannelsReturn {
  identities: Record<string, ChannelIdentity[]>;
  primaryVaultAddress: string | null;
  isLoading: boolean;
  syncChannel: (channelType: ChannelType) => Promise<SyncResult>;
  unsyncChannel: (channelType: ChannelType, accountId: string) => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Check smart contract for primary vault
 */
async function checkPrimaryVaultOnChain(ownerAddress: string): Promise<string | null> {
  try {
    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::aptsend::get_primary_vault_for_owner`,
        functionArguments: [ownerAddress],
      },
    });
    
    return result[0] as string;
  } catch (error) {
    logger.log('No primary vault found on-chain yet');
    return null;
  }
}

/**
 * Wait for vault to appear on-chain after registration
 */
async function waitForVaultOnChain(
  ownerAddress: string, 
  maxAttempts = 20,
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const vaultAddress = await checkPrimaryVaultOnChain(ownerAddress);
    
    if (vaultAddress) {
      logger.log('Vault found on-chain:', vaultAddress);
      return vaultAddress;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return null;
}

/**
 * Main hook for managing all channel identities
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


  // Twitter Identity and Channel
  const twitterIdentities = useMemo(() => {
    return (identities.twitter || []) as TwitterIdentity[];
  }, [identities]);

  const twitter = useTwitterChannel({
    ownerAddress,
    twitterIdentities,
    onIdentitiesChange: loadAllIdentities
  });

  // Google Identity and Channel
  const googleIdentities = useMemo(() => {
    return (identities.google || []) as GoogleIdentity[];
  }, [identities]);

  const google = useGoogleChannel({
    ownerAddress,
    googleIdentities,
    onIdentitiesChange: loadAllIdentities
  });

  // Telegram Identity and Channel
  const telegramIdentities = useMemo(() => {
    return (identities.telegram || []) as TelegramIdentity[];
  }, [identities]);

  const telegram = useTelegramChannel({
    ownerAddress,
    telegramIdentities,
    onIdentitiesChange: loadAllIdentities
  });

  // EVM Identity and Channel
  const evmIdentities = useMemo(() => {
    return (identities.evm || []) as EVMIdentity[];
  }, [identities]);

  const evm = useEVMChannel({
    ownerAddress,
    evmIdentities,
    onIdentitiesChange: loadAllIdentities
  });

  // Sol Identity and Channel
  const solanaIdentities = useMemo(() => {
    return (identities.sol || []) as SolanaIdentity[];
  }, [identities]);

  const solana = useSolanaChannel({
    ownerAddress,
    solanaIdentities,
    onIdentitiesChange: loadAllIdentities
  });

  // Discord Identity and Channel
  const discordIdentities = useMemo(() => {
    return (identities.discord || []) as DiscordIdentity[];
  }, [identities]);

  const discord = useDiscordChannel({
    ownerAddress,
    discordIdentities,
    onIdentitiesChange: loadAllIdentities
  });


  /**
   * Handle post-sync logic: check for vault if needed, then reload identities
   */
  const handlePostSync = async (result: SyncResult): Promise<SyncResult> => {
    if (!result.success || !ownerAddress) {
      return result;
    }

    // Only check blockchain if user doesn't have a vault yet
    if (!primaryVaultAddress) {
      logger.log('New user detected. Checking blockchain for vault creation...');
      const vaultAddress = await waitForVaultOnChain(ownerAddress.toString());
      
      if (vaultAddress) {
        logger.log('✅ Vault found on-chain:', vaultAddress);
        // Set it immediately from blockchain - this is the source of truth
        setPrimaryVaultAddress(vaultAddress);
      } else {
        console.warn('⚠️ Vault not found on-chain after waiting');
      }
    }
    
    // Reload identities to get updated channel status
    // This will also eventually sync the vault address from backend once the job completes
    await loadAllIdentities();
    
    return result;
  };

  const syncChannel = async (channelType: ChannelType): Promise<SyncResult> => {
    switch (channelType) {
      case 'twitter': {
        const result = await twitter.sync();
        return handlePostSync(result);
      }
      
      case 'telegram': {
        const result = await telegram.sync();
        return handlePostSync(result);
      }

      case 'google': {
        const result = await google.sync();
        return handlePostSync(result);
      }

      case 'discord': {
        const result = await discord.sync();
        return handlePostSync(result);
      }

      case 'evm': {
        const result = await evm.sync();
        return handlePostSync(result);
      }

      case 'sol': {
        const result = await solana.sync();
        return handlePostSync(result);
      }

      default:
        return { success: false, error: 'Unknown channel type' };
    }
  };

  const unsyncChannel = async (channelType: ChannelType, accountId: string): Promise<void> => {
    switch (channelType) {
      case 'twitter':
        await twitter.unsync(accountId);
        break;
      
      case 'telegram':

      case 'google':
        await google.unsync(accountId);
        break;
      
        case 'discord':

      case 'evm':
        throw new Error(`${channelType} unsync not implemented yet`);

      case 'sol':
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