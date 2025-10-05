import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { useAccount } from 'wagmi';
import { useEVMChannel } from '@/hooks/useEVMChannel';
import { useSolanaChannel } from '@/hooks/useSolanaChannel';
import { useToast } from '@/components/ui/use-toast';

interface MultiChainChannelRowProps {
  onSuccess: () => void;
  channelType: 'evm' | 'sol';
}

export function MultiChainChannelRow({ onSuccess, channelType }: MultiChainChannelRowProps) {
  const { open } = useAppKit();
  const { account: aptosAccount } = useWallet();
  const { caipNetwork } = useAppKitNetwork();
  const { address: connectedAddress, isConnected: isAppKitConnected } = useAppKitAccount();
  const { address: evmAddress, isConnected: isWagmiConnected } = useAccount();
  const { toast } = useToast();
  
  const evm = useEVMChannel({
    ownerAddress: aptosAccount?.address,
    evmIdentities: [],
    onIdentitiesChange: async () => {},
  });

  const solana = useSolanaChannel({
    ownerAddress: aptosAccount?.address,
    solanaIdentities: [],
    onIdentitiesChange: async () => {},
  });

  const isEVMChain = caipNetwork?.chainNamespace === 'eip155';
  const isSolanaChain = caipNetwork?.chainNamespace === 'solana';

  const handleClick = async () => {
    if (!aptosAccount?.address) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please connect your Aptos wallet first',
      });
      return;
    }

    // Open wallet modal to connect
    if (!isAppKitConnected) {
      open();
      return;
    }

    // Handle EVM signing
    if (channelType === 'evm' && isEVMChain && isWagmiConnected && evmAddress) {
      const result = await evm.sync();

      if (result.success) {
        toast({
          title: 'Success',
          description: 'EVM wallet linked successfully!',
        });
        onSuccess();
      } else if (!result.isUserRejection) {
        toast({
          variant: 'destructive',
          title: 'Failed to Link Wallet',
          description: result.error || 'An error occurred while linking your wallet',
        });
      }
    }

    // Handle Solana signing
    if (channelType === 'sol' && isSolanaChain && connectedAddress) {
      const result = await solana.sync();
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Solana wallet linked successfully!',
        });
        onSuccess();
      } else if (!result.isUserRejection) {
        toast({
          variant: 'destructive',
          title: 'Failed to Link Wallet',
          description: result.error,
        });
      }
    }
  };

  const getButtonText = () => {
    // Not connected at all
    if (!isAppKitConnected) {
      return '+ Connect';
    }

    // EVM button states
    if (channelType === 'evm') {
      if (!isEVMChain) return '+ Connect'; // Wrong network, show connect
      if (evm.isLoading) return 'Signing...';
      return 'Sign Message';
    }

    // Solana button states
    if (channelType === 'sol') {
      if (!isSolanaChain) return '+ Connect'; // Wrong network, show connect
      if (solana.isLoading) return 'Signing...';
      return 'Sign Message';
    }

    return '+ Connect';
  };

  const getChainInfo = () => {
    if (!caipNetwork) return null;
    
    return (
      <div className="text-xs text-gray-500 mt-1">
        Connected: {caipNetwork.name || 'Unknown'}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={handleClick}
        disabled={(channelType === 'evm' && evm.isLoading) || (channelType === 'sol' && solana.isLoading)}
        className="rounded-md bg-blue-500/80 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-50"
      >
        {getButtonText()}
      </button>
      {isAppKitConnected && getChainInfo()}
    </div>
  );
}