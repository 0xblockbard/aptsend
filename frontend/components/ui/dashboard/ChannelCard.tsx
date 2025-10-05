import LinkedAccountItem from "./LinkedAccountItem";
import { MultiChainChannelRow } from "./MultiChainChannelRow";
import { Channel, EVMIdentity } from "@/types/channelTypes";

interface ChannelCardProps {
  channel: Channel;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSync: () => void;
  onUnsync: (accountId: string) => void;
}

export default function ChannelCard({ 
  channel, 
  isExpanded, 
  onToggleExpand, 
  onSync, 
  onUnsync 
}: ChannelCardProps) {
  const hasAccounts = channel.accounts.length > 0;
  const isEVM = channel.type === 'evm';
  const isSol = channel.type === 'sol';
  
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm transition-all">
      <div className="flex items-center justify-between py-4 px-6 gap-4">
        <div 
          className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-70"
          onClick={() => hasAccounts && onToggleExpand()}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-700">
            {channel.iconType === 'lucide' && typeof channel.iconSource !== 'string' && (
              <channel.iconSource className="w-5 h-5" />
            )}
            {channel.iconType === 'svg' && typeof channel.iconSource === 'string' && (
              <div dangerouslySetInnerHTML={{ __html: channel.iconSource }} className="w-5 h-5" />
            )}
            {channel.iconType === 'image' && typeof channel.iconSource === 'string' && (
              <img src={channel.iconSource} alt={channel.label} className="w-5 h-5" />
            )}
            {channel.iconType === 'emoji' && typeof channel.iconSource === 'string' && (
              <span className="text-xl">{channel.iconSource}</span>
            )}
          </div>

          <div className="flex-1">
            <div className="font-medium">{channel.label}</div>
            <div className="text-sm text-gray-500">
              {channel.accounts.length === 0
                ? "No accounts connected"
                : `${channel.accounts.length} account${channel.accounts.length > 1 ? 's' : ''} connected`}
            </div>
          </div>
        </div>

        {/* Render appropriate sync button based on channel type */}
        {(() => {
          switch (channel.type) {
            case 'evm':
              return <MultiChainChannelRow channelType="evm" onSuccess={onSync} />;
            case 'sol':
              return <MultiChainChannelRow channelType="sol" onSuccess={onSync} />;
            default:
              return (
                <button
                  onClick={onSync}
                  className="rounded-md bg-blue-500/80 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  + Sync
                </button>
              );
          }
        })()}

        <div
          className={`h-3 w-3 rounded-full flex-shrink-0 ${
            hasAccounts ? "bg-green-500" : "bg-gray-400"
          }`}
          title={hasAccounts ? "Connected" : "Not connected"}
        />
      </div>

      {/* EVM/SOL channel renders differently based on connection state */}
      {isEVM || isSol ? (
        <div 
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ 
            maxHeight: isExpanded ? `${channel.accounts.length * 80}px` : '0px'
          }}
        >
          {hasAccounts && (
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
              <div className="space-y-2">
                {channel.accounts.map((account) => {
                  const evmAccount = account as EVMIdentity;

                  return (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium font-mono text-sm">
                          {evmAccount.metadata?.address?.slice(0, 6)}...{evmAccount.metadata?.address?.slice(-4)}
                        </span>

                        {evmAccount.metadata?.chain_name && (
                          <span className="text-xs text-gray-500 mt-0.5">
                            {evmAccount.metadata.chain_name}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => onUnsync(account.id)}
                        className="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Unsync
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
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
                    onUnsync={() => onUnsync(account.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}