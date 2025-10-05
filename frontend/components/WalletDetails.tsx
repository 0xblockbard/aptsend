import { useWallet } from "@aptos-labs/wallet-adapter-react";
// Internal components
import { LabelValueGrid } from "@/components/LabelValueGrid";

export function WalletDetails() {
  const { wallet } = useWallet();
  
  // Type assertion to access properties
  const walletWithInfo = wallet as any;
  
  return (
    <div className="flex flex-col gap-6">
      <h4 className="text-lg font-medium">Wallet Details</h4>
      <LabelValueGrid
        items={[
          {
            label: "Icon",
            value: walletWithInfo?.icon ? (
              <img 
                src={walletWithInfo.icon} 
                alt={walletWithInfo.name || "Wallet"} 
                width={24} 
                height={24} 
              />
            ) : (
              "Not Present"
            ),
          },
          {
            label: "Name",
            value: <p>{walletWithInfo?.name ?? "Not Present"}</p>,
          },
          {
            label: "URL",
            value: walletWithInfo?.url ? (
              <a 
                href={walletWithInfo.url} 
                target="_blank" 
                rel="noreferrer" 
                className="text-blue-600 dark:text-blue-300"
              >
                {walletWithInfo.url}
              </a>
            ) : (
              "Not Present"
            ),
          },
        ]}
      />
    </div>
  );
}