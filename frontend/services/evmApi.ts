import axios from 'axios';
import { API_BASE_URL } from "@/constants";

export interface LinkWalletRequest {
  owner_address: string;
  evm_address: string;
  chain_id: number;
}

export interface LinkWalletResponse {
  success: boolean;
  identity: {
    id: string;
    channel: string;
    channel_user_id: string;
    vault_status: number;
    metadata: {
      address: string;
      chain_id: number;
      chain_name: string;
      ens_name?: string;
    };
  };
}

export const evmApi = {
  /**
   * Link an EVM wallet to the user's Aptos account
   * Note: Signature verification happens on frontend via Reown AppKit
   */
  linkWallet: async (data: LinkWalletRequest): Promise<LinkWalletResponse> => {
    const response = await axios.post<LinkWalletResponse>(
      `${API_BASE_URL}/channels/evm/link-wallet`,
      data
    );
    return response.data;
  },
};