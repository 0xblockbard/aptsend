import { useState, useEffect, useCallback } from 'react';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { generateCodeVerifier, generateCodeChallenge } from '../utils/pkce';
import { 
  getTwitterAuthUrl, 
  handleTwitterCallback,
  unsyncTwitterAccount
} from '../services/twitterApi';
import { 
  TwitterIdentity, 
  SyncResult 
} from '../types/channelTypes';

interface UseTwitterChannelProps {
  ownerAddress: AccountAddress | undefined;
  twitterIdentities: TwitterIdentity[];
  onIdentitiesChange: () => Promise<void>;
}

interface UseTwitterChannelReturn {
  accounts: TwitterIdentity[];
  isLoading: boolean;
  sync: () => Promise<SyncResult>;
  unsync: (accountId: string) => Promise<void>;
}

/**
 * Hook for managing Twitter channel integration
 * Note: This hook receives identities from the parent useChannels hook
 * to maintain a single source of truth. It does NOT fetch accounts independently.
 */
export function useTwitterChannel({
  ownerAddress,
  twitterIdentities,
  onIdentitiesChange
}: UseTwitterChannelProps): UseTwitterChannelReturn {
  const [isLoading, setIsLoading] = useState(false);

  const completeAuth = useCallback(async (code: string, state: string) => {
    console.log('=== COMPLETE AUTH CALLED ===');
    console.log('Code:', code);
    console.log('State:', state);
    
    const codeVerifier = sessionStorage.getItem('twitter_code_verifier');
    console.log('Code verifier from storage:', codeVerifier ? 'Found' : 'NOT FOUND');
    
    if (!codeVerifier) {
      console.error('No code verifier in sessionStorage!');
      return;
    }

    try {
      console.log('Calling handleTwitterCallback...');
      await handleTwitterCallback(code, state, codeVerifier);
      console.log('Callback successful, reloading identities...');
      await onIdentitiesChange();
    } catch (error) {
      console.error('Twitter callback error:', error);
      throw error;
    } finally {
      sessionStorage.removeItem('twitter_code_verifier');
    }
  }, [onIdentitiesChange]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      console.log('=== MESSAGE RECEIVED ===');
      console.log('Origin:', event.origin);
      console.log('Expected origin:', window.location.origin);
      console.log('Message data:', event.data);
      
      if (event.origin !== window.location.origin) {
        console.warn('Origin mismatch, ignoring message');
        return;
      }

      if (event.data.type === 'TWITTER_OAUTH_CALLBACK') {
        console.log('Twitter OAuth callback message detected!');
        const { code, state } = event.data;
        await completeAuth(code, state);
      } else {
        console.log('Message type not recognized:', event.data.type);
      }
    };

    console.log('Setting up message listener...');
    window.addEventListener('message', handleMessage);
    return () => {
      console.log('Removing message listener...');
      window.removeEventListener('message', handleMessage);
    };
  }, [completeAuth]);

  const sync = async (): Promise<SyncResult> => {
    console.log('=== SYNC STARTED ===');
    
    if (!ownerAddress) {
      console.error('No wallet connected');
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsLoading(true);
      
      console.log('1. Generating PKCE codes...');
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      console.log('PKCE generated:', { 
        verifier_length: codeVerifier.length,
        challenge_length: codeChallenge.length 
      });

      sessionStorage.setItem('twitter_code_verifier', codeVerifier);

      console.log('2. Calling backend for auth URL...');
      console.log('Request payload:', {
        owner_address: ownerAddress.toString(),
        code_challenge: codeChallenge
      });

      const response = await getTwitterAuthUrl(ownerAddress, codeChallenge);
      console.log('3. Auth URL received:', response);

      console.log('4. Opening popup...');
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

      console.log('5. Popup opened successfully');
      console.log('Auth URL:', response.auth_url);

      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          console.log('Popup closed');
          setIsLoading(false);
        }
      }, 500);

      return { success: true };
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