import LinkedAccountItem from "./LinkedAccountItem";

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

interface ChannelCardProps {
  channel: Channel;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSync: () => void;
  onUnlink: (accountId: string) => void;
}

export default function ChannelCard({ 
  channel, 
  isExpanded, 
  onToggleExpand, 
  onSync, 
  onUnlink 
}: ChannelCardProps) {
  const hasAccounts = channel.accounts.length > 0;
  
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm transition-all">
      <div className="flex items-center justify-between py-4 px-6 gap-4">
        <div 
          className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-70"
          onClick={() => hasAccounts && onToggleExpand()}
        >
          <span className="text-2xl">{channel.icon}</span>
          <div className="flex-1">
            <div className="font-medium">{channel.label}</div>
            <div className="text-sm text-gray-500">
              {channel.accounts.length === 0
                ? "No accounts connected"
                : `${channel.accounts.length} account${channel.accounts.length > 1 ? 's' : ''} connected`}
            </div>
          </div>
        </div>

        <button
          onClick={onSync}
          className="rounded-md bg-blue-500/80 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          + Sync
        </button>

        <div
          className={`h-3 w-3 rounded-full flex-shrink-0 ${
            hasAccounts ? "bg-green-500" : "bg-gray-400"
          }`}
          title={hasAccounts ? "Connected" : "Not connected"}
        />
      </div>

      <div 
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ 
          maxHeight: isExpanded ? `${channel.accounts.length * 80}px` : '0px'
        }}
      >
        {hasAccounts && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
            <div className="space-y-2">
              {channel.accounts.map((account) => (
                <LinkedAccountItem
                  key={account.id}
                  account={account}
                  onUnlink={() => onUnlink(account.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}