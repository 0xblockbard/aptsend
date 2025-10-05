import { useState, useCallback } from 'react';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { generateCodeVerifier, generateCodeChallenge } from '../utils/pkce';
import { 
  getTwitterAuthUrl, 
  handleTwitterCallback,
  unsyncTwitterAccount
} from '../services/twitterApi';
import { 
  TwitterIdentity, 
  UseTwitterChannelReturn,
  SyncResult 
} from '../types/channelTypes';
import { logger } from '../utils/logger';

interface UseTwitterChannelProps {
  ownerAddress: AccountAddress | undefined;
  twitterIdentities: TwitterIdentity[];
  onIdentitiesChange: () => Promise<void>;
}

export function useTwitterChannel({
  ownerAddress,
  twitterIdentities,
  onIdentitiesChange
}: UseTwitterChannelProps): UseTwitterChannelReturn {
  const [isLoading, setIsLoading] = useState(false);

  const completeAuth = useCallback(async (code: string, state: string) => {
    logger.log('=== COMPLETE AUTH CALLED ===');
    logger.log('Code:', code);
    logger.log('State:', state);
    
    const timeoutId = sessionStorage.getItem('twitter_auth_timeout');
    if (timeoutId) {
      clearTimeout(Number(timeoutId));
      sessionStorage.removeItem('twitter_auth_timeout');
    }
    
    const codeVerifier = sessionStorage.getItem('twitter_code_verifier');
    logger.log('Code verifier from storage:', codeVerifier ? 'Found' : 'NOT FOUND');
    
    if (!codeVerifier) {
      console.error('No code verifier in sessionStorage!');
      setIsLoading(false);
      return;
    }

    try {
      logger.log('Calling handleTwitterCallback...');
      await handleTwitterCallback(code, state, codeVerifier);
      logger.log('Callback successful, reloading identities...');
      await onIdentitiesChange();
    } catch (error) {
      console.error('Twitter callback error:', error);
      throw error;
    } finally {
      sessionStorage.removeItem('twitter_code_verifier');
      setIsLoading(false);
    }
  }, [onIdentitiesChange]);

  const sync = async (): Promise<SyncResult> => {
    logger.log('=== SYNC STARTED ===');
    
    if (!ownerAddress) {
      console.error('No wallet connected');
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsLoading(true);
      
      logger.log('1. Generating PKCE codes...');
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      logger.log('PKCE generated:', { 
        verifier_length: codeVerifier.length,
        challenge_length: codeChallenge.length 
      });

      sessionStorage.setItem('twitter_code_verifier', codeVerifier);

      logger.log('2. Calling backend for auth URL...');
      logger.log('Request payload:', {
        owner_address: ownerAddress.toString(),
        code_challenge: codeChallenge
      });

      const response = await getTwitterAuthUrl(ownerAddress, codeChallenge);
      logger.log('3. Auth URL received:', response);

      logger.log('4. Opening popup...');
      const popup = window.open(
        response.auth_url,
        'twitter-oauth',
        'width=600,height=700,left=200,top=100'
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

          if (event.data.type === 'TWITTER_OAUTH_CALLBACK') {  // Changed from GOOGLE
            window.removeEventListener('message', handleMessage);
            clearTimeout(abandonmentTimeout);
            
            completeAuth(event.data.code, event.data.state)
              .then(() => resolve({ success: true }))
              .catch((error) => resolve({ success: false, error: error.message }));
          } else if (event.data.type === 'TWITTER_OAUTH_ERROR') {  // Changed from GOOGLE
            window.removeEventListener('message', handleMessage);
            clearTimeout(abandonmentTimeout);
            resolve({ success: false, error: event.data.error });
          }
        };

        const abandonmentTimeout = setTimeout(() => {
          window.removeEventListener('message', handleMessage);
          if (popup && !popup.closed) popup.close();
          sessionStorage.removeItem('twitter_code_verifier');  // Changed from google
          setIsLoading(false);
          resolve({ success: false, error: 'Authentication timeout' });
        }, 5 * 60 * 1000);

        window.addEventListener('message', handleMessage);
      });
      
    } catch (error) {
      console.error('=== SYNC FAILED ===');
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
      await unsyncTwitterAccount(ownerAddress, accountId);
      await onIdentitiesChange();
    } catch (error) {
      console.error('Failed to unsync Twitter account:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    accounts: twitterIdentities,
    isLoading,
    sync,
    unsync,
  };
}