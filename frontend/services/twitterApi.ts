import { AccountAddress } from "@aptos-labs/ts-sdk";

const API_BASE_URL = 'https://aptsend-backend.test/api';

export interface TwitterAuthUrlResponse {
  auth_url: string;
  state: string;
}

export interface TwitterCallbackResponse {
  success: boolean;
  identity: {
    id: number;
    channel: string;
    channel_user_id: string;
    vault_status: number;
    metadata: {
      username: string;
      name: string;
      profile_image_url?: string;
    };
  };
}

export interface TwitterAccount {
  id: number;
  identifier: string;
  status: 'linked' | 'pending';
}

export async function getTwitterAuthUrl(
  ownerAddress: AccountAddress,
  codeChallenge: string,
  signature?: string,
  message?: string
): Promise<TwitterAuthUrlResponse> {
  const response = await fetch(`${API_BASE_URL}/channels/twitter/auth-url`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(signature && { 'X-Signature': signature }),
      ...(message && { 'X-Message': message }),
    },
    body: JSON.stringify({
      owner_address: ownerAddress.toString(),
      code_challenge: codeChallenge,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get auth URL');
  }

  return response.json();
}

export async function getTwitterAccounts(
  ownerAddress: AccountAddress
): Promise<TwitterAccount[]> {
  const response = await fetch(
    `${API_BASE_URL}/channels/twitter/accounts?owner_address=${ownerAddress.toString()}`,
    { 
      method: 'GET', 
      headers: { 'Content-Type': 'application/json' } 
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch accounts');
  }

  const data = await response.json();
  return data.accounts;
}

export async function handleTwitterCallback(
  code: string,
  state: string,
  codeVerifier: string
): Promise<TwitterCallbackResponse> {
  const response = await fetch(`${API_BASE_URL}/channels/twitter/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state, code_verifier: codeVerifier }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to connect Twitter account');
  }

  return response.json();
}