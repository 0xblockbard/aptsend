import { useState, useEffect } from "react";
import VaultActionForm from "./VaultActionForm";
import { useVaultBalanceCache } from "../../../contexts/VaultBalanceContext";

type VaultInfo = {
  address: string;
  balances: {
    apt: string;
    usdc?: string;
    usdt?: string;
  };
} | null;

type VaultAction = "deposit" | "withdraw" | null;

interface VaultCardProps {
  vault: VaultInfo;
  vaultAction: VaultAction;
  onSetVaultAction: (action: VaultAction) => void;
  onConfirmAction: (currency: string, amount: string) => void;
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

const GRAPHQL_ENDPOINT = "https://api.devnet.aptoslabs.com/v1/graphql";
const GEOMI_API_KEY = process.env.NEXT_PUBLIC_GEOMI_API_KEY || "";

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
      ...(GEOMI_API_KEY && { "Authorization": `Bearer ${GEOMI_API_KEY}` }),
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
        maximumFractionDigits: 2,
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
  onConfirmAction 
}: VaultCardProps) {
  const { getBalances, setBalances, isCacheValid } = useVaultBalanceCache();
  const [balances, setLocalBalances] = useState<{ apt: string; usdc?: string; usdt?: string } | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vault?.address) {
      // Check cache first
      if (isCacheValid(vault.address)) {
        const cached = getBalances(vault.address);
        if (cached) {
          console.log('✅ Loading from CACHE:', cached);
          setLocalBalances(cached);
          return;
        }
      }
      // If no valid cache, fetch new data
      console.log('🌐 No valid cache, fetching from API...');
      loadBalances();
    }
  }, [vault?.address]);

  const loadBalances = async () => {
    if (!vault?.address) return;

    setLoading(true);
    setError(null);

    try {
      console.log('📡 API call started for:', vault.address);
      const fetchedBalances = await fetchVaultBalances(vault.address);
      console.log('📡 API call completed:', fetchedBalances);
      setLocalBalances(fetchedBalances);
      // Update the shared cache
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
        <div className="text-sm font-medium text-gray-500">Vault Address</div>
        {vault ? (
          <>
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
                  disabled={loading}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
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
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
              >
                Deposit
              </button>
              <button
                onClick={() => onSetVaultAction(vaultAction === "withdraw" ? null : "withdraw")}
                className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
              >
                Withdraw
              </button>
            </div>
          </>
        ) : (
          <div className="mt-2 text-sm text-gray-600">
            Connect with one channel first and your primary vault will be generated automatically.
          </div>
        )}
      </div>

      {vaultAction && (
        <VaultActionForm
          action={vaultAction}
          onClose={() => onSetVaultAction(null)}
          onConfirm={onConfirmAction}
        />
      )}
    </div>
  );
}