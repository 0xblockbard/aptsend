import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import VaultCard from "../components/ui/dashboard/VaultCard";
import ChannelList from "../components/ui/dashboard/ChannelList";
import { useChannels } from "../hooks/useChannels";
import { useToast } from "@/components/ui/use-toast";

type ChannelType = "twitter" | "telegram" | "email" | "discord" | "evm";
type VaultInfo = {
  address: string;
  balances: { apt: string; usdc?: string; usdt?: string };
} | null;
type VaultAction = "deposit" | "withdraw" | null;

export default function Dashboard() {
  const { account } = useWallet();
  const { toast } = useToast();
  const { identities, primaryVaultAddress, isLoading, syncChannel, unsyncChannel } = useChannels(account?.address);
  
  const [expandedChannel, setExpandedChannel] = useState<ChannelType | null>(null);
  const [vault, setVault] = useState<VaultInfo>(null);
  const [vaultAction, setVaultAction] = useState<VaultAction>(null);

  // Update vault when primaryVaultAddress changes
  useEffect(() => {
    if (primaryVaultAddress) {
      // TODO: Fetch actual balances from blockchain using primaryVaultAddress
      setVault({
        address: primaryVaultAddress,
        balances: { apt: "0.00" } // Placeholder until you implement balance fetching
      });
    } else {
      setVault(null);
    }
  }, [primaryVaultAddress]);

  const channels = [
    {
      type: "twitter" as const,
      label: "Twitter",
      icon: "𝕏",
      accounts: identities.twitter || [],
    },
    {
      type: "telegram" as const,
      label: "Telegram",
      icon: "✈️",
      accounts: identities.telegram || [],
    },
    {
      type: "email" as const,
      label: "Email",
      icon: "✉️",
      accounts: identities.email || [],
    },
    {
      type: "discord" as const,
      label: "Discord",
      icon: "💬",
      accounts: identities.discord || [],
    },
    {
      type: "evm" as const,
      label: "EVM Wallet",
      icon: "⟠",
      accounts: identities.evm || [],
    },
  ];

  const handleSync = async (channelType: ChannelType) => {
    const result = await syncChannel(channelType);
    
    if (result.success) {
      toast({
        title: "Connection Successful",
        description: `${channelType} account connected successfully.`,
      });
    } else {
      toast({
        title: "Connection Failed",
        description: result.error || "Failed to connect account",
        variant: "destructive",
      });
    }
  };

  const handleUnsync = async (channelType: ChannelType, accountId: string) => {
    await unsyncChannel(channelType, accountId);
    toast({ 
      title: "Account Unsynced",
      description: `${channelType} account has been removed.`,
    });
  };

  const handleVaultAction = (currency: string, amount: string) => {
    console.log(`${vaultAction}: ${amount} ${currency}`);
    toast({
      title: `${vaultAction === 'deposit' ? 'Deposit' : 'Withdrawal'} Initiated`,
      description: `Processing ${amount} ${currency}...`,
    });
    setVaultAction(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <h2 className="text-2xl font-semibold mb-6">Dashboard</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VaultCard
            vault={vault}
            vaultAction={vaultAction}
            onSetVaultAction={setVaultAction}
            onConfirmAction={handleVaultAction}
          />
          
          <ChannelList
            channels={channels}
            expandedChannel={expandedChannel}
            onToggleExpand={(type) => setExpandedChannel(prev => prev === type ? null : type)}
            onSync={handleSync}
            onUnsync={handleUnsync}
          />
        </div>
      </div>
    </div>
  );
}