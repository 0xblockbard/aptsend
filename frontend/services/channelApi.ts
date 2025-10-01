import { AccountAddress } from "@aptos-labs/ts-sdk";

const API_BASE_URL = 'https://aptsend-backend.test/api';

export type ChannelType = "twitter" | "telegram" | "email" | "discord" | "evm";
export type ChannelStatus = "pending" | "linked" | "failed";

export interface ChannelIdentity {
  id: string;
  identifier: string;
  status: ChannelStatus;
}

export interface AllIdentities {
  [key: string]: ChannelIdentity[];
}

export async function getAllIdentities(
  ownerAddress: AccountAddress
): Promise<AllIdentities> {
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
  return data.identities;
}