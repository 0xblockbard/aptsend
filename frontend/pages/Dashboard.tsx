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
import { logger } from '../utils/logger';
import { VaultInfoType, VaultActionType } from "@/types/vaultTypes";

export default function Dashboard() {
  const { account, signAndSubmitTransaction } = useWallet();
  const { toast } = useToast();
  const { identities, primaryVaultAddress, syncChannel, unsyncChannel } = useChannels(account?.address);
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
      type: "google" as const,
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
      type: "sol" as const,
      label: "SOL Wallet",
      iconType: "svg" as const,
      iconSource: '<svg viewBox="0 0 101 88" fill="none"><defs><linearGradient id="sol-gradient" x1="8.526" y1="90.097" x2="88.993" y2="-3.016" gradientUnits="userSpaceOnUse"><stop offset="0.08" stop-color="#9945FF"/><stop offset="0.3" stop-color="#8752F3"/><stop offset="0.5" stop-color="#5497D5"/><stop offset="0.6" stop-color="#43B4CA"/><stop offset="0.72" stop-color="#28E0B9"/><stop offset="0.97" stop-color="#19FB9B"/></linearGradient></defs><path fill="url(#sol-gradient)" d="M100.48 69.3817L83.8068 86.8015C83.4444 87.1799 83.0058 87.4816 82.5185 87.6878C82.0312 87.894 81.5055 88.0003 80.9743 88H1.93563C1.55849 88 1.18957 87.8926 0.874202 87.6912C0.558829 87.4897 0.31074 87.2029 0.160416 86.8659C0.0100923 86.529 -0.0359181 86.1566 0.0280382 85.7945C0.0919944 85.4324 0.263131 85.0964 0.520422 84.8278L17.2061 67.408C17.5676 67.0306 18.0047 66.7295 18.4904 66.5234C18.9762 66.3172 19.5002 66.2104 20.0301 66.2095H99.0644C99.4415 66.2095 99.8104 66.3169 100.126 66.5183C100.441 66.7198 100.689 67.0067 100.84 67.3436C100.99 67.6806 101.036 68.0529 100.972 68.415C100.908 68.7771 100.737 69.1131 100.48 69.3817ZM83.8068 34.3032C83.4444 33.9248 83.0058 33.6231 82.5185 33.4169C82.0312 33.2108 81.5055 33.1045 80.9743 33.1048H1.93563C1.55849 33.1048 1.18957 33.2121 0.874202 33.4136C0.558829 33.6151 0.31074 33.9019 0.160416 34.2388C0.0100923 34.5758 -0.0359181 34.9482 0.0280382 35.3103C0.0919944 35.6723 0.263131 36.0083 0.520422 36.277L17.2061 53.6968C17.5676 54.0742 18.0047 54.3752 18.4904 54.5814C18.9762 54.7875 19.5002 54.8944 20.0301 54.8952H99.0644C99.4415 54.8952 99.8104 54.7879 100.126 54.5864C100.441 54.3849 100.689 54.0981 100.84 53.7612C100.99 53.4242 101.036 53.0518 100.972 52.6897C100.908 52.3277 100.737 51.9917 100.48 51.723L83.8068 34.3032ZM1.93563 21.7905H80.9743C81.5055 21.7907 82.0312 21.6845 82.5185 21.4783C83.0058 21.2721 83.4444 20.9704 83.8068 20.592L100.48 3.17219C100.737 2.90357 100.908 2.56758 100.972 2.2055C101.036 1.84342 100.99 1.47103 100.84 1.13408C100.689 0.79713 100.441 0.510296 100.126 0.308823C99.8104 0.107349 99.4415 1.24074e-05 99.0644 0L20.0301 0C19.5002 0.000878397 18.9762 0.107699 18.4904 0.313848C18.0047 0.519998 17.5676 0.821087 17.2061 1.19848L0.524723 18.6183C0.267681 18.8866 0.0966198 19.2223 0.0325185 19.5839C-0.0315829 19.9456 0.0140624 20.3177 0.163856 20.6545C0.31365 20.9913 0.561081 21.2781 0.875804 21.4799C1.19053 21.6817 1.55886 21.7896 1.93563 21.7905Z"/></svg>',
      accounts: identities.sol || [],
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
    
    const capitalizedChannel = channelType.charAt(0).toUpperCase() + channelType.slice(1);

    toast({
      title: "Connecting...",
      description: `Opening ${capitalizedChannel} authentication...`,
    });

    try {
      const result = await syncChannel(channelType);
      
      if (result.success) {
        // At this point, useChannels has already called loadAllIdentities()
        // and primaryVaultAddress should be updated

        toast({
          title: "Connection Successful",
          description: `Your ${capitalizedChannel} account is connected!`,
        });
        
        // Trigger vault balance refresh if vault exists
        if (primaryVaultAddress) {
          setRefreshTrigger(prev => prev + 1);
        }
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
        logger.log("Transaction submitted:", response);
        
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