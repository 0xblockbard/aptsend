import { useState } from "react";
import VaultCard from "../components/ui/dashboard/VaultCard";
import ChannelList from "../components/ui/dashboard/ChannelList";

type ChannelType = "twitter" | "telegram" | "email" | "discord" | "evm";
type ChannelStatus = "pending" | "linked" | "failed";

type LinkedAccount = {
  id: string;
  identifier: string;
  status: ChannelStatus;
};

type Channel = {
  type: ChannelType;
  label: string;
  icon: string;
  accounts: LinkedAccount[];
};

type VaultInfo = {
  address: string;
  balances: {
    apt: string;
    usdc?: string;
    usdt?: string;
  };
} | null;

type VaultAction = "deposit" | "withdraw" | null;

const MOCK_VAULT: VaultInfo = {
  address: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  balances: {
    apt: "125.45",
    usdc: "1,250.00",
    usdt: "500.00"
  }
};

const INITIAL_CHANNELS: Channel[] = [
  {
    type: "twitter",
    label: "Twitter",
    icon: "𝕏",
    accounts: [
      { id: "1", identifier: "@johndoe", status: "linked" },
      { id: "2", identifier: "@johndoe_alt", status: "linked" }
    ]
  },
  {
    type: "telegram",
    label: "Telegram",
    icon: "✈️",
    accounts: []
  },
  {
    type: "email",
    label: "Email",
    icon: "✉️",
    accounts: [
      { id: "3", identifier: "john@example.com", status: "linked" }
    ]
  },
  {
    type: "discord",
    label: "Discord",
    icon: "💬",
    accounts: []
  },
  {
    type: "evm",
    label: "EVM Wallet",
    icon: "⟠",
    accounts: []
  }
];

export default function Dashboard() {
  const [channels, setChannels] = useState<Channel[]>(INITIAL_CHANNELS);
  const [expandedChannel, setExpandedChannel] = useState<ChannelType | null>(null);
  const [vault] = useState<VaultInfo>(MOCK_VAULT);
  const [vaultAction, setVaultAction] = useState<VaultAction>(null);

  const handleSync = (channelType: ChannelType) => {
    console.log(`Syncing ${channelType}...`);
  };

  const handleUnlink = (channelType: ChannelType, accountId: string) => {
    setChannels(prev =>
      prev.map(channel =>
        channel.type === channelType
          ? {
              ...channel,
              accounts: channel.accounts.filter(acc => acc.id !== accountId)
            }
          : channel
      )
    );
    
    // Close expansion if no accounts left
    const updatedChannel = channels.find(c => c.type === channelType);
    if (updatedChannel && updatedChannel.accounts.length === 1) {
      setExpandedChannel(null);
    }
  };

  const toggleExpand = (channelType: ChannelType) => {
    setExpandedChannel(prev => prev === channelType ? null : channelType);
  };

  const handleVaultAction = (currency: string, amount: string) => {
    console.log(`${vaultAction}: ${amount} ${currency.toUpperCase()}`);
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
            onToggleExpand={toggleExpand}
            onSync={handleSync}
            onUnlink={handleUnlink}
          />
        </div>
      </div>
    </div>
  );
}