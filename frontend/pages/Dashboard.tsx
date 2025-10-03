// pages/Dashboard.tsx
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
  const [isSyncing, setIsSyncing] = useState(false);

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
      iconSource: '<svg viewBox="0 0 1000 1000" fill="none"><defs><linearGradient x1="50%" y1="0%" x2="50%" y2="99.2583404%" id="tg-grad"><stop stop-color="#2AABEE" offset="0%"></stop><stop stop-color="#229ED9" offset="100%"></stop></linearGradient></defs><circle fill="url(#tg-grad)" cx="500" cy="500" r="500"></circle><path d="M226.328419,494.722069 C372.088573,431.216685 469.284839,389.350049 517.917216,369.122161 C656.772535,311.36743 685.625481,301.334815 704.431427,301.003532 C708.567621,300.93067 717.815839,301.955743 723.806446,306.816707 C728.864797,310.92121 730.256552,316.46581 730.922551,320.357329 C731.588551,324.248848 732.417879,333.113828 731.758626,340.040666 C724.234007,419.102486 691.675104,610.964674 675.110982,699.515267 C668.10208,736.984342 654.301336,749.547532 640.940618,750.777006 C611.904684,753.448938 589.856115,731.588035 561.733393,713.153237 C517.726886,684.306416 492.866009,666.349181 450.150074,638.200013 C400.78442,605.66878 432.786119,587.789048 460.919462,558.568563 C468.282091,550.921423 596.21508,434.556479 598.691227,424.000355 C599.00091,422.680135 599.288312,417.758981 596.36474,415.160431 C593.441168,412.561881 589.126229,413.450484 586.012448,414.157198 C581.598758,415.158943 511.297793,461.625274 375.109553,553.556189 C355.154858,567.258623 337.080515,573.934908 320.886524,573.585046 C303.033948,573.199351 268.692754,563.490928 243.163606,555.192408 C211.851067,545.013936 186.964484,539.632504 189.131547,522.346309 C190.260287,513.342589 202.659244,504.134509 226.328419,494.722069 Z" fill="#FFFFFF"></path></svg>',
      accounts: identities.telegram || [],
    },
    {
      type: "email" as const,
      label: "Email",
      iconType: "svg" as const,
      iconSource: '<svg viewBox="52 42 88 66" fill="none"><path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"/><path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"/><path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"/><path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92"/><path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2"/></svg>',
      accounts: identities.google || [],
    },
    {
      type: "evm" as const,
      label: "EVM Wallet",
      iconType: "svg" as const,
      iconSource: '<svg viewBox="0 0 24 24" fill="currentColor"><g transform="translate(12, 12) scale(0.022, 0.022) translate(-270, -440)"><path d="m269.9 325.2-269.9 122.7 269.9 159.6 270-159.6z" opacity=".6"/><path d="m0.1 447.8 269.9 159.6v-607.4z" opacity=".45"/><path d="m270 0v607.4l269.9-159.6z" opacity=".8"/><path d="m0 499 269.9 380.4v-220.9z" opacity=".45"/><path d="m269.9 658.5v220.9 l270.1-380.4z" opacity=".8"/></g></svg>',
      accounts: identities.evm || [],
    },
    {
      type: "discord" as const,
      label: "Discord",
      iconType: "svg" as const,
      iconSource: '<svg viewBox="0 0 16 16" fill="#5865F2"><path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/></svg>',
      accounts: identities.discord || [],
    },
  ];

  const handleSync = async (channelType: ChannelType) => {
    setIsSyncing(true);
    
    toast({
      title: "Connecting...",
      description: `Opening ${channelType} authentication...`,
    });

    try {
      const result = await syncChannel(channelType);
      
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: `${channelType} account connected and vault created!`,
        });
        
        // Trigger vault balance refresh
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Failed to connect account",
          variant: "destructive",
        });
      }
    } finally {
      setIsSyncing(false);
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
            isProcessing={isProcessing || isSyncing}
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