import { useState } from "react";

interface VaultActionFormProps {
  action: "deposit" | "withdraw";
  onClose: () => void;
  onConfirm: (currency: string, amount: string) => void;
}

export default function VaultActionForm({ 
  action, 
  onClose, 
  onConfirm 
}: VaultActionFormProps) {
  const [selectedCurrency, setSelectedCurrency] = useState("apt");
  const [amount, setAmount] = useState("");

  const handleConfirm = () => {
    onConfirm(selectedCurrency, amount);
    setAmount("");
  };

  return (
    <div 
      className="overflow-hidden transition-all duration-300 ease-in-out"
      style={{ 
        maxHeight: action ? '400px' : '0px'
      }}
    >
      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold capitalize">{action}</h4>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="apt">APT</option>
              <option value="usdc">USDC</option>
              <option value="usdt">USDT</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleConfirm}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Confirm {action}
          </button>
        </div>
      </div>
    </div>
  );
}