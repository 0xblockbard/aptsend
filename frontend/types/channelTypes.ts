// ============================================================================
// Channel Types
// ============================================================================

export type ChannelType = "twitter" | "telegram" | "google" | "discord" | "evm" | "sol";
export type ChannelStatus = "pending" | "linked" | "failed";

// ============================================================================
// Base Identity Interface
// ============================================================================

export interface ChannelIdentity {
  id: string;
  identifier: string;
  status: ChannelStatus;
  metadata?: Record<string, any>;
}

// ============================================================================
// Channel-Specific Interfaces
// ============================================================================

export interface TwitterIdentity extends ChannelIdentity {
  metadata?: {
    username: string;
    name: string;
    profile_image_url?: string;
  };
}

export interface TelegramIdentity extends ChannelIdentity {
  metadata?: {
    username?: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface GoogleIdentity extends ChannelIdentity {
  metadata?: {
    email: string;
    name?: string;
    picture?: string;
  };
}

export interface DiscordIdentity extends ChannelIdentity {
  metadata?: {
    username: string;
    discriminator?: string;
    avatar?: string;
  };
}

export interface EVMIdentity extends ChannelIdentity {
  metadata?: {
    address: string;
    chain_id: number;
    chain_name: string;
    ens_name?: string;
  };
}

export interface SolanaIdentity extends ChannelIdentity {
  metadata?: {
    address: string;
    sns_name?: string; // Solana Name Service (like ENS for Ethereum)
  };
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AllIdentitiesResponse {
  identities: Record<string, ChannelIdentity[]>;
  primary_vault_address: string | null;
}

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


export interface GoogleAuthUrlResponse {
  auth_url: string;
  state: string;
}

export interface GoogleCallbackResponse {
  success: boolean;
  identity: {
    id: string;
    channel: string;
    channel_user_id: string;
    vault_status: number;
    metadata: Record<string, any>;
  };
}


export interface TelegramAuthUrlResponse {
  auth_url: string;
  state: string;
}

export interface TelegramCallbackResponse {
  success: boolean;
  identity: {
    id: string;
    channel: string;
    channel_user_id: string;
    vault_status: number;
    metadata: {
      username?: string;
      first_name?: string;
      last_name?: string;
      photo_url?: string;
    };
  };
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface SyncResult {
  success: boolean;
  error?: string;
  isUserRejection?: boolean; // Add this new field
}

export interface UseSingleChannelReturn<T extends ChannelIdentity> {
  accounts: T[];
  isLoading: boolean;
  sync: () => Promise<SyncResult>;
  unsync: (accountId: string) => Promise<void>;
}

// Type aliases for specific channels
export type UseTwitterChannelReturn = UseSingleChannelReturn<TwitterIdentity>;
export type UseGoogleChannelReturn = UseSingleChannelReturn<GoogleIdentity>;
export type UseTelegramChannelReturn = UseSingleChannelReturn<TelegramIdentity>;
// export type UseDiscordChannelReturn = UseSingleChannelReturn<DiscordIdentity>;
// export type UseEVMChannelReturn = UseSingleChannelReturn<EVMIdentity>;
export type UseSolanaChannelReturn = UseSingleChannelReturn<SolanaIdentity>;

export interface UseChannelsReturn {
  identities: Record<string, ChannelIdentity[]>;
  primaryVaultAddress: string | null;
  isLoading: boolean;
  syncChannel: (channelType: ChannelType) => Promise<SyncResult>;
  unsyncChannel: (channelType: ChannelType, accountId: string) => Promise<void>;
  reload: () => Promise<void>;
}

export interface Channel {
  type: ChannelType;
  label: string;
  iconType: "lucide" | "svg" | "image" | "emoji";
  iconSource: string | React.ComponentType<{ className?: string }>;
  accounts: ChannelIdentity[];
}
