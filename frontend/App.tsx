import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer"; 
import { VaultBalanceProvider } from "./contexts/VaultBalanceContext";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Checker from "./pages/Checker";
import Send from "./pages/Send";
import TwitterCallback from "./pages/TwitterCallback";
import GoogleCallback from "./pages/GoogleCallback";


function RouteGuard({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();
  if (!connected) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <VaultBalanceProvider>
        <Header />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/dashboard"
            element={
              <RouteGuard>
                <Dashboard />
              </RouteGuard>
            }
          />
          <Route path="/checker" element={<Checker />} />
          <Route path="/send" element={<Send />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          
          <Route path="/auth/twitter/callback" element={<TwitterCallback />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />

        </Routes>
         <Footer />
      </VaultBalanceProvider>
    </BrowserRouter>
  );
}