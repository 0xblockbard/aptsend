import { AccountAddress } from "@aptos-labs/ts-sdk";
import { AllIdentitiesResponse } from "../types/channelTypes";

const API_BASE_URL = 'https://aptsend-backend.test/api';

/**
 * Fetches all channel identities for a given owner address
 */
export async function getAllIdentities(
  ownerAddress: AccountAddress
): Promise<AllIdentitiesResponse> {
  const response = await fetch(
    `${API_BASE_URL}/channels/identities?owner_address=${ownerAddress.toString()}`,
    { 
      method: 'GET', 
      headers: { 'Content-Type': 'application/json' } 
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch identities');
  }

  const data = await response.json();
  return data;
}