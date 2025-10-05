import "../vite.polyfills";
import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "@/App.tsx";
// Internal components
import { Toaster } from "@/components/ui/toaster.tsx";
import { WalletProvider } from "@/components/WalletProvider.tsx";
import { MultiChainWalletProvider } from "@/providers/MultiChainWalletProvider";
import { WrongNetworkAlert } from "@/components/WrongNetworkAlert";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <MultiChainWalletProvider>
          <App />
          <WrongNetworkAlert />
          <Toaster />
        </MultiChainWalletProvider>
      </WalletProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);