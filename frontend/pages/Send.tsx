import { useState } from "react";

type ChannelType = "twitter" | "telegram" | "email" | "discord";

export default function Send() {
  const [channel, setChannel] = useState<ChannelType>("twitter");
  const [identifier, setIdentifier] = useState("");
  const [result, setResult] = useState<null | {
    eligible: boolean;
    amount: number;
    symbol: string;
  }>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Placeholder logic: deterministic “mock” amount from identifier
    const clean = identifier.trim().toLowerCase();
    const eligible = clean.length >= 3;
    const hash = [...clean].reduce((a, c) => a + c.charCodeAt(0), 0);
    const amount = eligible ? (hash % 1000) / 10 : 0;
    setResult({ eligible, amount, symbol: "POINT" });
  }

  return (
    <div className="min-h-screen mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Send Tokens</h1>
      <p className="text-sm italic pt-1">Send to someone on any channel.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-600">Channel</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as ChannelType)}
            className="mt-1 w-full rounded-md border px-3 py-2"
          >
            <option value="twitter">Twitter / X</option>
            <option value="telegram">Telegram</option>
            <option value="email">Email</option>
            <option value="discord">Discord</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600">Identifier</label>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g. blockbard (no @)"
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-white"
        >
          Send
        </button>
      </form>

      {result && (
        <div className="mt-6 rounded-lg border p-5">
          <div className="text-sm text-gray-500">
            {channel} · {identifier || "—"}
          </div>
          <div className="mt-1">
            {result.eligible ? (
              <div className="text-lg">
                Eligible — <span className="font-semibold">
                  {result.amount.toFixed(1)} {result.symbol}
                </span>
              </div>
            ) : (
              <div className="text-lg">Not eligible</div>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Demo only. This will call the backend later.
          </div>
        </div>
      )}
    </div>
  );
}
