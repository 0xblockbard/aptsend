import axios from 'axios';
import { API_BASE_URL } from "@/constants";

export interface LinkSolanaWalletRequest {
  owner_address: string;
  solana_address: string;
}

export interface LinkSolanaWalletResponse {
  success: boolean;
  identity: {
    id: string;
    channel: string;
    channel_user_id: string;
    vault_status: number;
    metadata: {
      address: string;
      sns_name?: string; // Solana Name Service (like ENS for Ethereum)
    };
  };
}

export interface UnlinkSolanaWalletRequest {
  owner_address: string;
  identity_id: string;
}

export interface UnlinkSolanaWalletResponse {
  success: boolean;
  message: string;
}

export const solanaApi = {
  /**
   * Link a Solana wallet to the user's Aptos account
   * Note: Signature verification happens on frontend
   */
  linkWallet: async (data: LinkSolanaWalletRequest): Promise<LinkSolanaWalletResponse> => {
    const response = await axios.post<LinkSolanaWalletResponse>(
      `${API_BASE_URL}/channels/sol/link-wallet`,
      data
    );
    return response.data;
  },

  /**
   * Unlink a Solana wallet from the user's Aptos account
   */
  unlinkWallet: async (data: UnlinkSolanaWalletRequest): Promise<UnlinkSolanaWalletResponse> => {
    const response = await axios.post<UnlinkSolanaWalletResponse>(
      `${API_BASE_URL}/channels/sol/unlink-wallet`,
      data
    );
    return response.data;
  },
};