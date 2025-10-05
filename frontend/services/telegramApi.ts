import { AccountAddress } from "@aptos-labs/ts-sdk";
import { TelegramCallbackResponse } from "../types/channelTypes";
import { API_BASE_URL } from "@/constants";

/**
 * Handles the Telegram authentication callback
 * Sends auth data from Telegram widget to backend for verification
 */
export async function handleTelegramCallback(
  ownerAddress: AccountAddress,
  authData: Record<string, any>
): Promise<TelegramCallbackResponse> {
  const response = await fetch(`${API_BASE_URL}/channels/telegram/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      owner_address: ownerAddress.toString(),
      auth_data: authData
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to connect Telegram account');
  }

  return response.json();
}

/**
 * Unsync a Telegram account
 */
export async function unsyncTelegramAccount(
  ownerAddress: AccountAddress,
  accountId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/channels/telegram/unsync`,
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
    throw new Error(error.message || 'Failed to unsync Telegram account');
  }
}