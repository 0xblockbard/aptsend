import { ChannelIdentity } from "@/types/channelTypes";

interface LinkedAccountItemProps {
  account: ChannelIdentity;
  onUnsync: () => void;
}

export default function LinkedAccountItem({ account, onUnsync }: LinkedAccountItemProps) {
  return (
    <div className="flex items-center justify-between rounded-md bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`h-2 w-2 rounded-full ${
            account.status === "linked"
              ? "bg-green-500"
              : account.status === "pending"
              ? "bg-yellow-500"
              : "bg-red-500"
          }`}
        />
        <span className="font-mono text-sm">
          {account.identifier}
        </span>
      </div>
      {/* <button
        onClick={onUnsync}
        className="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
      >
        Unsync
      </button> */}
    </div>
  );
}