import { useState, useEffect } from "react";
import VaultActionForm from "./VaultActionForm";
import { useVaultBalanceCache } from "../../../contexts/VaultBalanceContext";
import { VaultInfoType, VaultActionType } from "@/types/vaultTypes";
import { GRAPHQL_ENDPOINT } from "@/constants";

interface VaultCardProps {
  vault: VaultInfoType;
  vaultAction: VaultActionType;
  onSetVaultAction: (action: VaultActionType) => void;
  onConfirmAction: (currency: string, amount: string) => void;
  isProcessing?: boolean;
  refreshTrigger?: number; // Add this prop to trigger refreshes
}

interface FungibleAssetBalance {
  asset_type: string;
  amount: string;
  metadata: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

async function fetchVaultBalances(address: string): Promise<{
  apt: string;
  usdc?: string;
  usdt?: string;
}> {
  const query = `
    query GetBalances($address: String!) {
      current_fungible_asset_balances(
        where: {owner_address: {_eq: $address}}
      ) {
        asset_type
        amount
        metadata {
          name
          symbol
          decimals
        }
      }
    }
  `;

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { address },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch balances: ${response.statusText}`);
  }

  const data = await response.json();
  const balances = data.data.current_fungible_asset_balances as FungibleAssetBalance[];

  const result: { apt: string; usdc?: string; usdt?: string } = {
    apt: "0.00",
  };

  balances.forEach((balance) => {
    const symbol = balance.metadata.symbol.toUpperCase();
    const decimals = balance.metadata.decimals;
    const amount = parseFloat(balance.amount) / Math.pow(10, decimals);
    
    if (amount > 0) {
      const formatted = amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 5,
      });

      if (symbol === "APT") {
        result.apt = formatted;
      } else if (symbol === "USDC") {
        result.usdc = formatted;
      } else if (symbol === "USDT") {
        result.usdt = formatted;
      }
    }
  });

  return result;
}

export default function VaultCard({ 
  vault, 
  vaultAction, 
  onSetVaultAction, 
  onConfirmAction,
  isProcessing = false,
  refreshTrigger = 0
}: VaultCardProps) {
  const { getBalances, setBalances, isCacheValid } = useVaultBalanceCache();
  const [balances, setLocalBalances] = useState<{ apt: string; usdc?: string; usdt?: string } | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load when vault address changes
  useEffect(() => {
    if (vault?.address) {
      if (isCacheValid(vault.address)) {
        const cached = getBalances(vault.address);
        if (cached) {
          console.log('✅ Loading from CACHE:', cached);
          setLocalBalances(cached);
          return;
        }
      }
      console.log('🌐 No valid cache, fetching from API...');
      loadBalances();
    }
  }, [vault?.address]);

  // Auto-refresh when refreshTrigger changes (after transactions)
  useEffect(() => {
    if (refreshTrigger > 0 && vault?.address) {
      console.log('🔄 Auto-refreshing balances after transaction...');
      loadBalances();
    }
  }, [refreshTrigger]);

  const loadBalances = async () => {
    if (!vault?.address) return;

    setLoading(true);
    setError(null);

    try {
      console.log('📡 API call started for:', vault.address);
      const fetchedBalances = await fetchVaultBalances(vault.address);
      console.log('📡 API call completed:', fetchedBalances);
      setLocalBalances(fetchedBalances);
      setBalances(vault.address, fetchedBalances);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load balances");
      console.error("Error fetching balances:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold">Primary Vault</h3>
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        {vault ? (
          <>
            <div className="text-sm font-medium text-gray-500">Vault Address</div>
            <div className="mt-2 font-mono text-sm text-gray-900 break-all">
              {vault.address}
            </div>
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Balances
                </div>
                <button
                  onClick={loadBalances}
                  disabled={loading || isProcessing}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 transition-colors"
                  title="Refresh balances"
                >
                  {loading ? "Refreshing..." : "↻ Refresh"}
                </button>
              </div>

              {error && (
                <div className="mb-3 text-xs text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">APT</span>
                  <span className="font-mono text-sm font-semibold">
                    {loading ? "..." : balances?.apt || "0.00"}
                  </span>
                </div>
                {balances?.usdc && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">USDC</span>
                    <span className="font-mono text-sm font-semibold">
                      {loading ? "..." : balances.usdc}
                    </span>
                  </div>
                )}
                {balances?.usdt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">USDT</span>
                    <span className="font-mono text-sm font-semibold">
                      {loading ? "..." : balances.usdt}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => onSetVaultAction(vaultAction === "deposit" ? null : "deposit")}
                disabled={isProcessing}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Deposit
              </button>
              <button
                onClick={() => onSetVaultAction(vaultAction === "withdraw" ? null : "withdraw")}
                disabled={isProcessing}
                className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Withdraw
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center py-6">
              <div className="text-sm font-medium text-gray-600 mb-1">
                Sync a channel to generate a primary vault
              </div>
              <div className="text-xs text-gray-500 italic">
                Connect any channel on the right to get started
              </div>
            </div>
            
            <div className="mt-4 border-t pt-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                Balances
              </div>
              <div className="space-y-2 opacity-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">APT</span>
                  <span className="font-mono text-sm font-semibold text-gray-400">0.00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">USDC</span>
                  <span className="font-mono text-sm font-semibold text-gray-400">0.00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">USDT</span>
                  <span className="font-mono text-sm font-semibold text-gray-400">0.00</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <button
                disabled
                className="rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-gray-500 cursor-not-allowed"
              >
                Deposit
              </button>
              <button
                disabled
                className="rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-gray-500 cursor-not-allowed"
              >
                Withdraw
              </button>
            </div>
          </>
        )}
      </div>

      {vaultAction && (
        <VaultActionForm
          action={vaultAction}
          onClose={() => onSetVaultAction(null)}
          onConfirm={onConfirmAction}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}