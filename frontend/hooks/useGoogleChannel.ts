import { useState, useEffect, useCallback } from 'react';
import { AccountAddress } from '@aptos-labs/ts-sdk';
import { generateCodeVerifier, generateCodeChallenge } from '../utils/pkce';
import { 
  getGoogleAuthUrl, 
  handleGoogleCallback,
  unsyncGoogleAccount
} from '../services/googleApi';
import { 
  GoogleIdentity, 
  SyncResult 
} from '../types/channelTypes';

interface UseGoogleChannelProps {
  ownerAddress: AccountAddress | undefined;
  googleIdentities: GoogleIdentity[];
  onIdentitiesChange: () => Promise<void>;
}

interface UseGoogleChannelReturn {
  accounts: GoogleIdentity[];
  isLoading: boolean;
  sync: () => Promise<SyncResult>;
  unsync: (accountId: string) => Promise<void>;
}

export function useGoogleChannel({
  ownerAddress,
  googleIdentities,
  onIdentitiesChange
}: UseGoogleChannelProps): UseGoogleChannelReturn {
  const [isLoading, setIsLoading] = useState(false);

  const completeAuth = useCallback(async (code: string, state: string) => {
    console.log('=== COMPLETE AUTH CALLED ===');
    console.log('Code:', code);
    console.log('State:', state);
    
    const timeoutId = sessionStorage.getItem('google_auth_timeout');
    if (timeoutId) {
      clearTimeout(Number(timeoutId));
      sessionStorage.removeItem('google_auth_timeout');
    }
    
    const codeVerifier = sessionStorage.getItem('google_code_verifier');
    console.log('Code verifier from storage:', codeVerifier ? 'Found' : 'NOT FOUND');
    
    if (!codeVerifier) {
      console.error('No code verifier in sessionStorage!');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Calling handleGoogleCallback...');
      await handleGoogleCallback(code, state, codeVerifier);
      console.log('Callback successful, reloading identities...');
      await onIdentitiesChange();
    } catch (error) {
      console.error('Google callback error:', error);
      throw error;
    } finally {
      sessionStorage.removeItem('google_code_verifier');
      setIsLoading(false);
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

      if (event.data.type === 'GOOGLE_OAUTH_CALLBACK') {
        console.log('Google OAuth callback message detected!');
        const { code, state } = event.data;
        try {
          await completeAuth(code, state);
        } catch (error) {
          console.error('Failed to complete auth:', error);
        }
      } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') { 
        console.error('OAuth error from popup:', event.data.error);
        setIsLoading(false);
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

      sessionStorage.setItem('google_code_verifier', codeVerifier);

      console.log('2. Calling backend for auth URL...');
      console.log('Request payload:', {
        owner_address: ownerAddress.toString(),
        code_challenge: codeChallenge
      });

      const response = await getGoogleAuthUrl(ownerAddress, codeChallenge);
      console.log('3. Auth URL received:', response);

      console.log('4. Opening popup...');
      const popup = window.open(
        response.auth_url,
        'google-oauth',
        'width=600,height=700,left=200,top=100'
      );

      if (!popup) {
        console.error('Popup blocked by browser');
        setIsLoading(false);
        return { success: false, error: 'Popup blocked' };
      }

      console.log('5. Popup opened successfully');
      console.log('Auth URL:', response.auth_url);

      const abandonmentTimeout = setTimeout(() => {
        if (popup && !popup.closed) {
          popup.close();
        }
        console.log('Auth timeout - user may have abandoned the flow');
        setIsLoading(false);
        sessionStorage.removeItem('google_code_verifier');
      }, 5 * 60 * 1000);

      sessionStorage.setItem('google_auth_timeout', abandonmentTimeout.toString());

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
      await unsyncGoogleAccount(ownerAddress, accountId);
      await onIdentitiesChange();
    } catch (error) {
      console.error('Failed to unsync Google account:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    accounts: googleIdentities,
    isLoading,
    sync,
    unsync,
  };
}