import { Link, NavLink } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletSelector } from "./WalletSelector";

export function Header() {
  const { connected } = useWallet();
  const homeHref = connected ? "/dashboard" : "/";

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between px-4 py-2">
        {/* LEFT: brand + nav */}
        <div className="flex items-center gap-6">
          <Link to={homeHref} className="text-2xl font-bold tracking-tight">
            AptSend
          </Link>

          <nav className="pl-4 flex items-center gap-6">
            
            {connected && (<NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `text-sm ${isActive ? "text-black font-bold" : "text-gray-600 hover:text-black"}`
              }
            >
              Dashboard
            </NavLink>)}

            <NavLink
              to="/checker"
              className={({ isActive }) =>
                `text-sm ${isActive ? "text-black font-bold" : "text-gray-600 hover:text-black"}`
              }
            >
              Checker
            </NavLink>
            
            {connected && (<NavLink
              to="/send"
              className={({ isActive }) =>
                `text-sm ${isActive ? "text-black font-bold" : "text-gray-600 hover:text-black"}`
              }
            >
              Send
            </NavLink>)}
          </nav>
        </div>

        {/* RIGHT: wallet */}
        <div className="flex items-center gap-2">
          <WalletSelector />
        </div>
      </div>
    </header>
  );
}
