import { AccountAddress } from "@aptos-labs/ts-sdk";
import { 
  GoogleAuthUrlResponse, 
  GoogleCallbackResponse 
} from "../types/channelTypes";

import { API_BASE_URL } from "@/constants";

// const API_BASE_URL = "https://hostilely-unmarkable-opal.ngrok-free.dev/api";
// const API_BASE_URL = "https://aptsend-backend.xyz/api";

export async function getGoogleAuthUrl(
  ownerAddress: AccountAddress,
  codeChallenge: string,
  signature?: string,
  message?: string
): Promise<GoogleAuthUrlResponse> {
  const response = await fetch(`${API_BASE_URL}/channels/google/auth-url`, {
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

export async function handleGoogleCallback(
  code: string,
  state: string,
  codeVerifier: string
): Promise<GoogleCallbackResponse> {
  const response = await fetch(`${API_BASE_URL}/channels/google/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state, code_verifier: codeVerifier }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to connect Google account');
  }

  return response.json();
}

export async function unsyncGoogleAccount(
  ownerAddress: AccountAddress,
  accountId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/channels/google/unsync`,
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
    throw new Error(error.message || 'Failed to unsync Google account');
  }
}