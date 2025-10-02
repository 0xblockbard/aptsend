import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import VaultCard from "../components/ui/dashboard/VaultCard";
import ChannelList from "../components/ui/dashboard/ChannelList";
import { useChannels } from "../hooks/useChannels";
import { useToast } from "@/components/ui/use-toast";
import { useVaultBalanceCache } from "../contexts/VaultBalanceContext";
import { 
  depositToVault, 
  withdrawFromVault, 
  depositFAToVault, 
  withdrawFAFromVault,
  waitForTransaction,
  TOKEN_METADATA 
} from "../services/aptosTransactions";

import { ChannelType } from "@/types/channelTypes";
import { VaultInfoType, VaultActionType } from "@/types/vaultTypes";

export default function Dashboard() {
  const { account, signAndSubmitTransaction } = useWallet();
  const { toast } = useToast();
  const { identities, primaryVaultAddress, isLoading, syncChannel, unsyncChannel, reload } = useChannels(account?.address);
  const { clearCache } = useVaultBalanceCache();
  
  const [expandedChannel, setExpandedChannel] = useState<ChannelType | null>(null);
  const [vault, setVault] = useState<VaultInfoType>(null);
  const [vaultAction, setVaultAction] = useState<VaultActionType>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (primaryVaultAddress) {
      setVault({
        address: primaryVaultAddress,
        balances: { apt: "0.00" }
      });
    } else {
      setVault(null);
    }
  }, [primaryVaultAddress]);

  const channels = [
  {
    type: "twitter" as const,
    label: "Twitter",
    iconType: "emoji" as const,
    iconSource: "𝕏",
    accounts: identities.twitter || [],
  },
  {
    type: "telegram" as const,
    label: "Telegram",
    iconType: "svg" as const,
    iconSource: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.67-.52.36-.99.53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.37-.48 1.02-.73 3.98-1.74 6.64-2.89 7.98-3.46 3.8-1.58 4.59-1.85 5.1-1.86.11 0 .37.03.53.17.14.11.17.26.19.37-.01.06.01.24 0 .38z"/></svg>',
    accounts: identities.telegram || [],
  },
  {
    type: "email" as const,
    label: "Email",
    iconType: "svg" as const,
    iconSource: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    accounts: identities.email || [],
  },
  {
    type: "discord" as const,
    label: "Discord",
    iconType: "svg" as const,
    iconSource: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/></svg>',
    accounts: identities.discord || [],
  },
  {
    type: "evm" as const,
    label: "EVM Wallet",
    iconType: "svg" as const,
    iconSource: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15h.01M11 15h4"/></svg>',
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

  const handleVaultAction = async (currency: string, amount: string) => {
    if (!account?.address || !vault) {
      toast({
        title: "Error",
        description: "Wallet not connected or vault not found",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      let transaction;

      if (vaultAction === "deposit") {
        if (currency === "apt") {
          transaction = await depositToVault(amount);
        } else if (currency === "usdc") {
          transaction = await depositFAToVault(TOKEN_METADATA.usdc, amount, 6);
        } else if (currency === "usdt") {
          transaction = await depositFAToVault(TOKEN_METADATA.usdt, amount, 6);
        }
      } else if (vaultAction === "withdraw") {
        const toAddress = account.address.toString();
        
        if (currency === "apt") {
          transaction = await withdrawFromVault(toAddress, amount);
        } else if (currency === "usdc") {
          transaction = await withdrawFAFromVault(TOKEN_METADATA.usdc, toAddress, amount, 6);
        } else if (currency === "usdt") {
          transaction = await withdrawFAFromVault(TOKEN_METADATA.usdt, toAddress, amount, 6);
        }
      }

      if (transaction) {
        const response = await signAndSubmitTransaction(transaction);
        console.log("Transaction submitted:", response);
        
        toast({
          title: `${vaultAction === 'deposit' ? 'Deposit' : 'Withdrawal'} Submitted`,
          description: `Transaction submitted. Waiting for confirmation...`,
        });

        // Wait for blockchain confirmation first
        const txHash = (response as any).hash || response;
        const confirmed = await waitForTransaction(txHash);
        
        if (confirmed) {
          toast({
            title: `${vaultAction === 'deposit' ? 'Deposit' : 'Withdrawal'} Confirmed`,
            description: `${amount} ${currency.toUpperCase()} has been ${vaultAction === 'deposit' ? 'deposited to' : 'withdrawn from'} your vault. Updating balance...`,
          });
          
          // Clear cache and wait for indexer to update
          if (vault?.address) {
            clearCache(vault.address);
            
            // Wait 3 seconds for GraphQL indexer to update
            setTimeout(() => {
              setRefreshTrigger(prev => prev + 1);
            }, 3000);
          }
        }
      }
    } catch (error: any) {
      console.error("Transaction error:", error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to process transaction",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setVaultAction(null);
    }
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
            isProcessing={isProcessing}
            refreshTrigger={refreshTrigger}
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