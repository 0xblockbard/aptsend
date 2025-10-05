import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { sendFromPrimaryVault } from "../services/aptosTransactions";
import { ChannelType } from "@/types/channelTypes";
import {
  validateIdentifier,
  resolveChannelUserId,
  getIdentifierLabel,
  getIdentifierPlaceholder
} from "../utils/channelUtils";

export default function Sender() {
  const { signAndSubmitTransaction } = useWallet();
  const [channel, setChannel] = useState<ChannelType>("twitter");
  const [identifier, setIdentifier] = useState("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("APT");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    success: boolean;
    message: string;
    txHash?: string;
  }>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    // Validation
    if (!identifier.trim()) {
      setResult({
        success: false,
        message: "Please enter a recipient identifier"
      });
      return;
    }

    // Validate identifier format
    const validation = validateIdentifier(channel, identifier);
    if (!validation.valid) {
      setResult({
        success: false,
        message: validation.error || "Invalid identifier"
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setResult({
        success: false,
        message: "Please enter a valid amount"
      });
      return;
    }

    setLoading(true);

    try {
      // Resolve identifier to channel_user_id
      const channelUserId = await resolveChannelUserId(channel, identifier);

      // Create the transaction using sendFromPrimaryVault with channel_user_id
      const transaction = await sendFromPrimaryVault(
        channel,
        channelUserId,
        amount
      );

      // Sign and submit the transaction
      const response = await signAndSubmitTransaction(transaction);
      
      setResult({
        success: true,
        message: "Transaction submitted successfully!",
        txHash: response.hash
      });

      // Clear form on success
      setIdentifier("");
      setAmount("");
    } catch (error) {
      console.error("Send error:", error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to send tokens"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Send Tokens</h1>
      <p className="text-sm italic pt-1">Send to someone on any channel.</p>
      
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Channel
          </label>
          <select
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value as ChannelType);
              setIdentifier(''); // Clear identifier when channel changes
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            disabled={loading}
          >
            <option value="twitter">Twitter / X</option>
            <option value="telegram">Telegram</option>
            <option value="google">Email</option>
            <option value="discord">Discord</option>
            <option value="evm">Ethereum / EVM</option>
            <option value="sol">Solana</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {getIdentifierLabel(channel)}
          </label>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={getIdentifierPlaceholder(channel)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            disabled={loading}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <input
            type="number"
            step="0.000001"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 10"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            disabled={loading}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Token
          </label>
          <select
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            disabled={loading}
          >
            <option value="APT">APT</option>
            {/* Future fungible assets can be added here */}
            {/* <option value="USDC">USDC</option> */}
            {/* <option value="USDT">USDT</option> */}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Currently only APT is supported. More tokens coming soon!
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !identifier.trim() || !amount}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </form>

      {result && (
        <div className={`mt-6 rounded-lg border shadow-sm p-5 ${
          result.success 
            ? "border-green-200 bg-green-50" 
            : "border-red-200 bg-red-50"
        }`}>
          <div className={`text-lg font-semibold mb-2 ${
            result.success ? "text-green-800" : "text-red-800"
          }`}>
            {result.success ? "✓ Transaction Successful" : "✗ Transaction Failed"}
          </div>
          <div className={`text-sm ${
            result.success ? "text-green-700" : "text-red-700"
          }`}>
            {result.message}
          </div>
          {result.txHash && (
            <div className="mt-3 p-3 bg-white rounded-md border border-green-200">
              <div className="text-xs text-gray-500 mb-1">Transaction Hash</div>
              <a
                href={`https://explorer.aptoslabs.com/txn/${result.txHash}?network=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-blue-600 hover:underline break-all"
              >
                {result.txHash}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}