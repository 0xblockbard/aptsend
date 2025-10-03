import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { ChannelType } from "@/types/channelTypes";
import { API_BASE_URL, MODULE_ADDRESS, NETWORK } from "@/constants";

interface CheckResult {
  eligible: boolean;
  vault_address?: string;
  balances: {
    apt?: string;
    usdc?: string;
    usdt?: string;
  };
  status: 'temp' | 'linked' | 'not_found';
  message: string;
}

const aptosConfig = new AptosConfig({ network: NETWORK as Network });
const aptos = new Aptos(aptosConfig);

export default function Checker() {
  const { account } = useWallet();
  const [channel, setChannel] = useState<ChannelType>("twitter");
  const [identifier, setIdentifier] = useState("");
  const [searchedIdentifier, setSearchedIdentifier] = useState("");
  const [searchedChannel, setSearchedChannel] = useState<ChannelType>("twitter");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    setSearchedIdentifier(identifier.trim());
    setSearchedChannel(channel);

    try {
      const params = new URLSearchParams({
        channel,
        identifier: identifier.trim()
      });

      const backendResponse = await fetch(
        `${API_BASE_URL}/checker/get-identity?${params}`,
        {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      const backendData = await backendResponse.json();

      if (!backendResponse.ok || !backendData.success) {
        throw new Error(backendData.message || 'Failed to resolve identifier');
      }

      const channelUserId = backendData.channel_user_id;

      const routeExists = await checkRouteExists(channel, channelUserId);
      
      if (!routeExists) {
        setResult({
          eligible: false,
          balances: {},
          status: 'not_found',
          message: 'No vault found for this identifier'
        });
        return;
      }

      const route = await getSocialRoute(channel, channelUserId);
      const routeStatus = route.status;
      const vaultAddress = route.target_vault;

      // Always get balances regardless of status
      const balances = await getVaultBalances(vaultAddress);
      const hasBalance = Object.values(balances).some(b => parseFloat(b as string) > 0);

      setResult({
        eligible: routeStatus === 0 && hasBalance, // Only eligible if temp AND has balance
        vault_address: vaultAddress,
        balances,
        status: routeStatus === 0 ? 'temp' : 'linked',
        message: routeStatus === 0 
          ? (hasBalance ? 'Funds available to claim' : 'No funds in this vault')
          : 'This account is already linked to a wallet'
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function checkRouteExists(channel: string, userId: string): Promise<boolean> {
    try {
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::aptsend::route_exists`,
          typeArguments: [],
          functionArguments: [
            Array.from(Buffer.from(channel)),
            Array.from(Buffer.from(userId))
          ]
        }
      });
      return result[0] as boolean;
    } catch (error) {
      console.error('Error checking route:', error);
      return false;
    }
  }

  async function getSocialRoute(channel: string, userId: string) {
    const result = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::aptsend::get_social_route`,
        typeArguments: [],
        functionArguments: [
          Array.from(Buffer.from(channel)),
          Array.from(Buffer.from(userId))
        ]
      }
    });
    
    const route = result[0] as any;
    return {
      target_vault: route.target_vault,
      status: parseInt(route.status),
      channel: route.channel,
      created_at_seconds: parseInt(route.created_at_seconds)
    };
  }

  async function getVaultBalances(vaultAddress: string) {
    const balances: any = {};

    const aptBalance = await getVaultAptBalance(vaultAddress);
    if (aptBalance > 0) {
      balances.apt = (aptBalance / 100000000).toFixed(5);
    }

    // TODO: Add FA balances when you have the metadata addresses
    // const usdcMetadata = "YOUR_USDC_METADATA_ADDRESS";
    // const usdcBalance = await getVaultFaBalance(vaultAddress, usdcMetadata);
    // if (usdcBalance > 0) {
    //   balances.usdc = (usdcBalance / 1000000).toFixed(5);
    // }

    return balances;
  }

  async function getVaultAptBalance(vaultAddress: string): Promise<number> {
    try {
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::aptsend::get_vault_apt_balance`,
          typeArguments: [],
          functionArguments: [vaultAddress]
        }
      });
      return parseInt(result[0] as string);
    } catch (error) {
      console.error('Error getting APT balance:', error);
      return 0;
    }
  }

  async function getVaultFaBalance(vaultAddress: string, faMetadata: string): Promise<number> {
    try {
      const result = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::aptsend::get_vault_fa_balance`,
          typeArguments: [],
          functionArguments: [vaultAddress, faMetadata]
        }
      });
      return parseInt(result[0] as string);
    } catch (error) {
      console.error('Error getting FA balance:', error);
      return 0;
    }
  }

  async function handleClaim() {
    if (!result?.vault_address || !account) return;
    
    // TODO: Implement claim logic
    console.log('Claiming from vault:', result.vault_address);
  }

  const getPlaceholder = () => {
    switch (channel) {
      case 'twitter': return 'e.g. aptos (no @)';
      case 'telegram': return 'e.g. @username or user ID';
      case 'email': return 'e.g. user@example.com';
      case 'discord': return 'e.g. username#1234 or user ID';
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Checker</h1>
      <p className="text-sm text-gray-600 pt-1">
        Check the balance for your social account and if you have any unclaimed tokens
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Channel
          </label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as ChannelType)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          >
            <option value="twitter">Twitter / X</option>
            <option value="telegram">Telegram</option>
            <option value="email">Email</option>
            <option value="discord">Discord</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Identifier
          </label>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={getPlaceholder()}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !identifier.trim()}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Checking...' : 'Check Claim Status'}
        </button>
      </form>

      {result && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-medium text-gray-500">
                {searchedChannel.charAt(0).toUpperCase() + searchedChannel.slice(1)}
              </div>
              <div className="text-base font-semibold">{searchedIdentifier}</div>
            </div>
            <div className="flex gap-2">
              {result.status === 'temp' && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  Unclaimed
                </span>
              )}
              {result.status === 'linked' && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Registered
                </span>
              )}
            </div>
          </div>

          {/* Always show balances section */}
          <div className="border-t pt-4 mb-4">
            <div className="text-sm font-medium text-gray-700 mb-3">
              Vault Balances
            </div>
            {Object.keys(result.balances).length > 0 ? (
              <div className="space-y-2">
                {result.balances.apt && parseFloat(result.balances.apt) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">APT</span>
                    <span className="text-sm font-mono font-semibold">{result.balances.apt}</span>
                  </div>
                )}
                {result.balances.usdc && parseFloat(result.balances.usdc) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">USDC</span>
                    <span className="text-sm font-mono font-semibold">{result.balances.usdc}</span>
                  </div>
                )}
                {result.balances.usdt && parseFloat(result.balances.usdt) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">USDT</span>
                    <span className="text-sm font-mono font-semibold">{result.balances.usdt}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No funds in this vault</div>
            )}
          </div>

          {/* Vault address */}
          {result.vault_address && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <div className="text-xs text-gray-500 mb-1">Vault Address</div>
              <div className="text-xs font-mono break-all">{result.vault_address}</div>
            </div>
          )}

          {/* Action section */}
          {result.status === 'temp' && result.eligible ? (
            account ? (
              <button
                onClick={handleClaim}
                className="w-full rounded-md bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 transition-colors"
              >
                Claim to My Wallet
              </button>
            ) : (
              <div className="text-center p-3 bg-blue-50 rounded-md text-sm text-gray-700">
                Connect your wallet and social profile to claim these funds
              </div>
            )
          ) : result.status === 'linked' ? (
            <div className="text-center p-3 bg-gray-50 rounded-md text-sm text-gray-600">
              This account is registered. Connect your wallet on the dashboard to access your funds.
            </div>
          ) : (
            <div className="text-center p-3 bg-gray-50 rounded-md text-sm text-gray-600">
              {result.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}