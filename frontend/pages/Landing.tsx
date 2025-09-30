import { Navigate } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import HeroSection from "./sections/HeroSection";
import SupportedChannels from "./sections/SupportedChannels";

export default function Landing() {
  const { connected } = useWallet();
  if (connected) return <Navigate to="/dashboard" replace />;

  return (
    <div className="bg-white">
      <HeroSection />
      <SupportedChannels />
    </div>
  );
}
