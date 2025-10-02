import ChannelCard from "./ChannelCard";
import { Channel, ChannelType } from "@/types/channelTypes";

interface ChannelListProps {
  channels: Channel[];
  expandedChannel: ChannelType | null;
  onToggleExpand: (channelType: ChannelType) => void;
  onSync: (channelType: ChannelType) => void;
  onUnsync: (channelType: ChannelType, accountId: string) => void;
}

export default function ChannelList({ 
  channels, 
  expandedChannel, 
  onToggleExpand, 
  onSync, 
  onUnsync 
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
            onUnsync={(accountId) => onUnsync(channel.type, accountId)}
          />
        ))}
      </div>
    </div>
  );
}