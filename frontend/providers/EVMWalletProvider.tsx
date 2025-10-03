// src/providers/EVMWalletProvider.tsx
import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi'
import { mainnet, arbitrum, polygon, base } from 'wagmi/chains'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { PropsWithChildren } from 'react'
import { REOWN_PROJECT_ID } from '@/constants'

if (!REOWN_PROJECT_ID) {
  throw new Error('VITE_REOWN_PROJECT_ID is not set')
}

const metadata = {
  name: 'AptSend',
  description: 'Multi-channel payment routing on Aptos',
  url: window.location.origin,
  icons: [`${window.location.origin}/logo.png`]
}

const networks = [mainnet, arbitrum, polygon, base]

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId: REOWN_PROJECT_ID,
})

createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet, arbitrum, polygon, base],
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
    "a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393", // Phantom
    "123e6d19e6c0f575b148c469eb191f8b92618c13c94c4758aee35e042e37fa21", // Compass
    "e0c2e199712878ed272e2c170b585baa0ff0eb50b07521ca586ebf7aeeffc598", // Talisman
    "6adb6082c909901b9e7189af3a4a0223102cd6f8d5c39e39f3d49acb92b578bb", // Keplr
  ],
})

export function EVMWalletProvider({ children }: PropsWithChildren) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      {children}
    </WagmiProvider>
  )
}