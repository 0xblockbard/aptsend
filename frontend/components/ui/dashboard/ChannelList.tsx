import ChannelCard from "./ChannelCard";

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

interface ChannelListProps {
  channels: Channel[];
  expandedChannel: ChannelType | null;
  onToggleExpand: (channelType: ChannelType) => void;
  onSync: (channelType: ChannelType) => void;
  onUnlink: (channelType: ChannelType, accountId: string) => void;
}

export default function ChannelList({ 
  channels, 
  expandedChannel, 
  onToggleExpand, 
  onSync, 
  onUnlink 
}: ChannelListProps) {
  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold">Connected Channels</h3>
      
      <div className="space-y-3">
        {channels.map((channel) => (
          <ChannelCard
            key={channel.type}
            channel={channel}
            isExpanded={expandedChannel === channel.type}
            onToggleExpand={() => onToggleExpand(channel.type)}
            onSync={() => onSync(channel.type)}
            onUnlink={(accountId) => onUnlink(channel.type, accountId)}
          />
        ))}
      </div>
    </div>
  );
}