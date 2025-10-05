import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { SolanaAdapter } from '@reown/appkit-adapter-solana'
import { PropsWithChildren } from 'react'
import { REOWN_PROJECT_ID } from '@/constants'

import {
  mainnet,
  arbitrum,
  sepolia,
  solana,
  solanaTestnet,
  solanaDevnet,
} from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/types";

if (!REOWN_PROJECT_ID) {
  throw new Error('VITE_REOWN_PROJECT_ID is not set')
}

const metadata = {
  name: 'AptSend',
  description: 'Multi-channel payment routing on Aptos',
  url: window.location.origin,
  icons: [`${window.location.origin}/logo.png`]
}

// Separate EVM and Solana networks with explicit types
const evmNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [mainnet, arbitrum, sepolia]

// All networks for AppKit - explicitly typed
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet,
  arbitrum,
  sepolia,
  solana,
  solanaTestnet,
  solanaDevnet
]

// Create Wagmi adapter with ONLY EVM networks
const wagmiAdapter = new WagmiAdapter({
  networks: evmNetworks,
  projectId: REOWN_PROJECT_ID,
})

// Create Solana adapter
const solanaAdapter = new SolanaAdapter({
  wallets: [] 
})

createAppKit({
  adapters: [wagmiAdapter, solanaAdapter],
  networks,
  projectId: REOWN_PROJECT_ID,
  metadata,
  features: {
    analytics: false,
  },
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
    '163d2cf19babf05eb8962e9748f9ebe613ed52ebf9c8107c9a0f104bfcf161b3', // Frame
  ],
  excludeWalletIds: [
    "123e6d19e6c0f575b148c469eb191f8b92618c13c94c4758aee35e042e37fa21", // Compass
    "e0c2e199712878ed272e2c170b585baa0ff0eb50b07521ca586ebf7aeeffc598", // Talisman
    "6adb6082c909901b9e7189af3a4a0223102cd6f8d5c39e39f3d49acb92b578bb", // Keplr
  ],
})

export function MultiChainWalletProvider({ children }: PropsWithChildren) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      {children}
    </WagmiProvider>
  )
}