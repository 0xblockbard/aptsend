import { AccountAddress } from "@aptos-labs/ts-sdk";
import { 
  DiscordAuthUrlResponse, 
  DiscordCallbackResponse 
} from "../types/channelTypes";
import { API_BASE_URL } from "@/constants";

/**
 * Gets the Discord OAuth authorization URL
 */
export async function getDiscordAuthUrl(
  ownerAddress: AccountAddress,
  signature?: string,
  message?: string
): Promise<DiscordAuthUrlResponse> {
  const response = await fetch(`${API_BASE_URL}/channels/discord/auth-url`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(signature && { 'X-Signature': signature }),
      ...(message && { 'X-Message': message }),
    },
    body: JSON.stringify({
      owner_address: ownerAddress.toString(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get Discord auth URL');
  }

  return response.json();
}

/**
 * Handles the Discord OAuth callback
 */
export async function handleDiscordCallback(
  code: string,
  state: string
): Promise<DiscordCallbackResponse> {
  const response = await fetch(`${API_BASE_URL}/channels/discord/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to connect Discord account');
  }

  return response.json();
}

/**
 * Unsync a Discord account
 */
export async function unsyncDiscordAccount(
  ownerAddress: AccountAddress,
  accountId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/channels/discord/unsync`,
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
    throw new Error(error.message || 'Failed to unsync Discord account');
  }
}