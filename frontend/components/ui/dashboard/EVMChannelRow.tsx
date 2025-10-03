// src/components/ui/dashboard/EVMChannelRow.tsx
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';
import { useEVMChannel } from '@/hooks/useEVMChannel';
import { useToast } from '@/components/ui/use-toast';

interface EVMChannelRowProps {
  onSuccess: () => void;
}

export function EVMChannelRow({ onSuccess }: EVMChannelRowProps) {
  const { open } = useAppKit();
  const { account: aptosAccount } = useWallet();
  const { address: evmAddress, isConnected } = useAccount();
  const { toast } = useToast();
  
  const evm = useEVMChannel({
    ownerAddress: aptosAccount?.address,
    evmIdentities: [],
    onIdentitiesChange: async () => {},
  });

  const handleClick = async () => {
    if (!aptosAccount?.address) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please connect your Aptos wallet first',
      });
      return;
    }

    // If not connected OR needs signature, open wallet modal or trigger signing
    if (!isConnected) {
      open();
      return;
    }

    // If connected and needs signature (user closed modal previously), trigger signing again
    if (evm.needsSignature || isConnected) {
      const result = await evm.sync();

      if (result.success) {
        toast({
          title: 'Success',
          description: 'EVM wallet linked successfully! Blockchain transaction is processing...',
        });
        onSuccess();
      } else {
        // Only show error if it's not a user rejection
        if (!result.isUserRejection) {
          toast({
            variant: 'destructive',
            title: 'Failed to Link Wallet',
            description: result.error || 'An error occurred while linking your wallet',
          });
        }
      }
    }
  };

  // Determine button text based on state
  const getButtonText = () => {
    if (evm.isLoading) return 'Signing...';
    if (isConnected && evm.needsSignature) return 'Sign Message';
    return '+ Connect';
  };

  return (
    <button
      onClick={handleClick}
      disabled={evm.isLoading}
      className="rounded-md bg-blue-500/80 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-50"
    >
      {getButtonText()}
    </button>
  );
}