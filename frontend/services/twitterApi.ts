// frontend/services/twitterApi.ts

import { AccountAddress } from "@aptos-labs/ts-sdk";
import { 
  TwitterAuthUrlResponse, 
  TwitterCallbackResponse 
} from "../types/channelTypes";

const API_BASE_URL = 'https://aptsend-backend.test/api';

/**
 * Gets the Twitter OAuth authorization URL
 */
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

/**
 * Handles the Twitter OAuth callback
 */
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

/**
 * Unsync a Twitter account
 */
export async function unsyncTwitterAccount(
  ownerAddress: AccountAddress,
  accountId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/channels/twitter/unsync`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_address: ownerAddress.toString(),
        account_id: accountId,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to unsync Twitter account');
  }
}