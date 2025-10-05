import { useState, useCallback } from 'react';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { 
  getDiscordAuthUrl, 
  handleDiscordCallback,
  unsyncDiscordAccount,
} from '../services/discordApi';
import { 
  DiscordIdentity,
  UseDiscordChannelReturn,
  SyncResult
} from '../types/channelTypes';
import { logger } from '../utils/logger';

interface UseDiscordChannelProps {
  ownerAddress: AccountAddress | undefined;
  discordIdentities: DiscordIdentity[];
  onIdentitiesChange: () => Promise<void>;
}

export function useDiscordChannel({
  ownerAddress,
  discordIdentities,
  onIdentitiesChange
}: UseDiscordChannelProps): UseDiscordChannelReturn {
  const [isLoading, setIsLoading] = useState(false);

  const completeAuth = useCallback(async (code: string, state: string) => {
    logger.log('=== DISCORD COMPLETE AUTH CALLED ===');
    logger.log('Code:', code);
    logger.log('State:', state);
    
    try {
      logger.log('Calling handleDiscordCallback...');
      await handleDiscordCallback(code, state);
      logger.log('Callback successful, reloading identities...');
      await onIdentitiesChange();
    } catch (error) {
      console.error('Discord callback error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [onIdentitiesChange]);

  const sync = async (): Promise<SyncResult> => {
    logger.log('=== DISCORD SYNC STARTED ===');
    
    if (!ownerAddress) {
      console.error('No wallet connected');
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsLoading(true);

      logger.log('1. Calling backend for Discord auth URL...');
      logger.log('Request payload:', {
        owner_address: ownerAddress.toString()
      });

      const response = await getDiscordAuthUrl(ownerAddress);
      logger.log('2. Auth URL received:', response);

      logger.log('3. Opening popup...');
      const popup = window.open(
        response.auth_url,
        'discord-oauth',
        'width=500,height=700,left=200,top=100'
      );

      if (!popup) {
        console.error('Popup blocked by browser');
        setIsLoading(false);
        return { success: false, error: 'Popup blocked' };
      }

      // Wait for OAuth to complete
      return new Promise<SyncResult>((resolve) => {
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;

          if (event.data.type === 'DISCORD_OAUTH_CALLBACK') {
            window.removeEventListener('message', handleMessage);
            clearTimeout(abandonmentTimeout);
            
            completeAuth(event.data.code, event.data.state)
              .then(() => resolve({ success: true }))
              .catch((error) => resolve({ success: false, error: error.message }));
          } else if (event.data.type === 'DISCORD_OAUTH_ERROR') {
            window.removeEventListener('message', handleMessage);
            clearTimeout(abandonmentTimeout);
            resolve({ success: false, error: event.data.error });
          }
        };

        const abandonmentTimeout = setTimeout(() => {
          window.removeEventListener('message', handleMessage);
          if (popup && !popup.closed) popup.close();
          setIsLoading(false);
          resolve({ success: false, error: 'Authentication timeout' });
        }, 5 * 60 * 1000);

        window.addEventListener('message', handleMessage);
      });
      
    } catch (error) {
      console.error('=== DISCORD SYNC FAILED ===');
      console.error('Error details:', error);
      setIsLoading(false);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sync' 
      };
    }
  };

  const unsync = async (accountId: string): Promise<void> => {
    if (!ownerAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsLoading(true);
      await unsyncDiscordAccount(ownerAddress, accountId);
      await onIdentitiesChange();
    } catch (error) {
      console.error('Failed to unsync Discord account:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    accounts: discordIdentities,
    isLoading,
    sync,
    unsync,
  };
}