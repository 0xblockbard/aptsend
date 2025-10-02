export type VaultInfoType = {
  address: string;
  balances: {
    apt: string;
    usdc?: string;
    usdt?: string;
  };
} | null;

export type VaultActionType = "deposit" | "withdraw" | null;