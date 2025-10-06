# AptSend

*Send APT or Aptos fungible assets to anyone on Twitter, Telegram, Discord, Email, Phone Number, or even EVM/SOL addresses — even if they’re not on Aptos yet.*

Or better yet, simply make a tweet and automatically send tokens to your specified recipient. Or send a message on Telegram and Discord.

AptSend removes friction from crypto payments by letting you send tokens to anyone on major social platforms and blockchains. Recipients without Aptos wallets receive funds in temporary vaults, creating a natural incentive to join the ecosystem and claim their assets.

This exponentially expands the range of distribution and adoption for Aptos and any Aptos-related projects, as they can now utilise **one-way transfers** to users simply based on their public profile without requiring any knowledge of their wallet address.

Every user on every major social platform is now within reach as a direct channel through our unified system. 

**Distribution → Adoption**

## ✨ Key Features

- Send to **@usernames** on Twitter, Telegram, Discord  
- Send to **email addresses**
- Send to **EVM or Solana addresses** (extensible to any blockchain)
- Send via tweets to anyone on any channel
- Supports APT and any fungible asset on Aptos  
- **Claimable Vaults**: Recipients without Aptos wallets receive funds in temporary vaults, incentivizing them to create a wallet and claim their assets
- 0.2% transfer fee for sustainable operations

## ✨ Coming Soon

- Send to phone numbers 
- Send via Telegram Group
- Send via Discord Server 

## 🧠 Why AptSend?

- **Expand reach:** airdrop to KOLs on X/Twitter via a tweet 
- **Turn rewards into onboarding:** “You’ve got tokens waiting. Create an Aptos wallet to claim.”
- **Fewer DMs for addresses:** reward contributors directly without having to ask for their wallet address
- **Marketing loop:** every pending vault is a call-to-action to join Aptos

## 🏗️ How It Works (In simple terms)

It only takes 2 simple steps for any user to get started on the platform and receive funds, and an additional step if he wishes to send funds to anyone else.

1. User connects aptos wallet **[User Action 1]**
2. User selects any channel and connect to it with his social profile **[User Action 2]**
3. Authentication is securely handled through our backend 
4. A primary vault is created for the newly registered user / or channel identity synced if user is already registered
5. Any funds in his social profile will automatically be transferred to the primary vault
6. User deposits Apt / Supported Fungible Assets into his primary vault (which can be withdrawn at any time)
7. User can now send funds to anyone on any platform **[User Action 3]**
8. Temporary vaults will be created for receivers based on their channel and channel identifier 
9. If the receiver is already registered, funds will be sent to their primary vault
10. Receivers can claim their funds at any time by connecting their wallet and channel 

## 🧱 Architecture

**Frontend (React + Vite)**  
- User dashboard for wallet connection and account management
- OAuth popup flow with PKCE for secure channel authentication
- Direct wallet integration for user-initiated transactions (deposits, withdrawals, transfers)

**Backend (Laravel + MySQL + Redis Queue)**  
- OAuth token exchange and secure credential storage
- Service signer for automated smart contract calls:
  - `register_user` - Creates primary vault and links first channel identity
  - `sync_user` - Links additional channel identities to existing vault
  - `process_transfer` - Executes channel-to-channel transfers
- Background job processing via Laravel Horizon

**Smart Contract (Aptos Move)**  
- **Vault System**: Primary vaults per user, temporary vaults for unregistered recipients
- **Asset Management**: Deposits and withdrawals for APT and fungible assets (FA)
- **Channel Routing**: Maps social channel identities to vault addresses
- **Transfers**: P2P transfers with configurable fees, supports cross-channel routing

# 🔁 OAuth & Authentication Flows

*Production-grade PKCE OAuth 2.0 implementation with cross-window state management and blockchain integration*

## Twitter/Google/Discord Flow

1. User clicks "Sync" on Dashboard
2. Frontend generates PKCE parameters (`code_verifier`, `code_challenge`) and stores verifier in sessionStorage
3. Frontend → Backend: `POST /api/channels/{platform}/auth-url` with `owner_address` + `code_challenge`
4. Backend generates random `state`, caches `{state: owner_address, code_challenge}` (10min TTL), returns OAuth URL
5. Frontend opens popup with platform's OAuth authorization page
6. User authorizes → Platform redirects to backend callback with `code` + `state`
7. Backend validates and proxies redirect to Frontend
8. Frontend callback component extracts params, sends `postMessage` to parent window with `{code, state}`
9. Dashboard receives message, retrieves `code_verifier` from sessionStorage
10. Dashboard → Backend: `POST /api/channels/{platform}/callback` with `{code, state, code_verifier}`
11. Backend validates state, exchanges code for tokens (platform verifies PKCE), fetches user profile
12. Backend creates/updates `User` + `ChannelIdentity` with encrypted tokens, dispatches smart contract job (`register_user` or `sync_user`)
13. Popup closes, Dashboard displays toast notification and reloads connected accounts

## Telegram Flow

1. User clicks "Sync" → Frontend renders Telegram Login Widget in modal/page
2. User authorizes via Telegram widget → Widget callback returns auth data with cryptographic hash
3. Frontend → Backend: `POST /api/channels/telegram/callback` with `{owner_address, auth_data}`
4. Backend verifies Telegram hash (HMAC-SHA256 using bot token), validates timestamp (prevents replay attacks)
5. Backend creates/updates `User` + `ChannelIdentity` with Telegram metadata (no tokens stored)
6. Backend dispatches smart contract job (`register_user` or `sync_user` based on vault status)
7. Frontend receives success response, displays toast, reloads connected accounts

## EVM / SOL Wallet Connection (Reown)

1. User clicks "Connect" → Dashboard triggers Reown AppKit connection flow
2. Reown handles wallet signature verification (SIWE - Sign-In with Ethereum) on frontend
3. Frontend → Backend: `POST /api/channels/{chain}/link-wallet` with `{owner_address, wallet_address, chain_id}`
4. Backend validates EVM address format, checks for duplicate links across wallets
5. Backend creates/updates `ChannelIdentity` with normalized address + chain metadata
6. Backend dispatches smart contract job (`register_user` or `sync_user` based on vault status)
7. Frontend receives success response, displays connected wallet in Dashboard

## Key Technical Complexities

- **PKCE prevents authorization code interception** (essential for SPAs without client secrets)
- **Cross-window postMessage coordination** handles popup → parent communication securely
- **State caching with TTL** prevents CSRF and replay attacks across OAuth flows
- **Telegram cryptographic verification** uses HMAC-SHA256 hash validation to prevent auth data forgery
- **Multi-platform abstraction** (Twitter/Google/Discord share identical flow architecture)
- **Wallet signature verification** via Reown AppKit ensures address ownership (SIWE standard for EVM)
- **Address normalization and duplicate prevention** ensures unique wallet identities per owner address
- **Encrypted token storage** for OAuth platforms with expiry tracking
- **Async blockchain sync** queues Aptos smart contract calls (`register_user` creates vault, `sync_user` links to existing vault) without blocking authentication flows
- **Duplicate prevention** ensures each social identity/wallet can only link to one Aptos owner address (but users can link multiple identities)
- **Reown multi-chain support** enables universal wallet authentication (EVM chains + Solana)

This implementation follows OAuth 2.0, Telegram Login Widget, and Web3 wallet authentication best practices for production-grade identity linking.

# AptSend Smart Contract Entrypoints

Built on Move, AptSend enables users to send cryptocurrency on Aptos to recipients on major social media platforms and crypto blockchains using familiar standard identifiers - social media handles, email addresses, phone numbers, or EVM addresses - without requiring the sender to know the recipient's Aptos wallet address or the recipient to have an Aptos wallet. The system uses a vault-based architecture with channel identity routing:

- **Primary Vaults**: Each registered user gets a vault linked to their Aptos wallet address
- **Temporary Vaults**: Automatically created for unregistered recipients when they receive funds
- **Channel Routing**: External identifiers (e.g., @username on Twitter, email@domain.com, phone numbers, EVM addresses) map to vault addresses
- **Auto-Linking**: When a recipient registers, their temporary vault funds automatically transfer to their primary vault

The module provides thirteen public/service entrypoints and six admin entrypoints for managing vaults, transfers, and channel identities.

## Public Entrypoints

### Vault Management

1. **deposit_to_primary_vault**: Allows a user to deposit APT tokens into their primary vault
   - **Input**: Amount of APT to deposit
   - **Output**: Transfers APT from user's account to their primary vault

2. **withdraw_from_primary_vault**: Allows a user to withdraw APT tokens from their primary vault
   - **Input**: Recipient address and amount of APT to withdraw
   - **Output**: Transfers APT from primary vault to specified address

3. **deposit_fa_to_primary_vault**: Allows a user to deposit fungible assets (FA) into their primary vault
   - **Input**: FA metadata object and amount to deposit
   - **Output**: Transfers FA from user's account to their primary vault

4. **withdraw_fa_from_primary_vault**: Allows a user to withdraw fungible assets from their primary vault
   - **Input**: FA metadata object, recipient address, and amount to withdraw
   - **Output**: Transfers FA from primary vault to specified address

### Sending Functions

5. **send_from_primary_vault**: Allows a user to send APT tokens from their primary vault to a social channel user
   - **Input**: Target channel, target user ID, and amount to send
   - **Output**: Transfers APT to recipient's vault (creates temporary vault if needed), deducts fee, and emits TransferEvent

6. **send_fa_from_primary_vault**: Allows a user to send fungible assets from their primary vault to a social channel user
   - **Input**: Target channel, target user ID, FA metadata object, and amount to send
   - **Output**: Transfers FA to recipient's vault (creates temporary vault if needed), deducts fee, and emits FATransferEvent

## Service-Protected Entrypoints

These entrypoints require authorization from the designated service signer:

7. **register_user**: Registers a new user with a social channel identity
   - **Input**: Service signer verification, user address, channel name, and channel user ID
   - **Output**: Creates primary vault for user, establishes social route, creates user profile, and emits UserRegisteredEvent

8. **sync_user**: Links an additional social channel identity to an existing registered user
   - **Input**: Service signer verification, user address, channel name, and channel user ID
   - **Output**: Links social route to user's primary vault, sweeps any existing temporary vault, updates user profile, and emits UserSyncedEvent

9. **unsync_user**: Removes a social channel identity from a registered user
   - **Input**: Service signer verification, user address, channel name, and channel user ID
   - **Output**: Removes social route, updates user profile to remove channel identity, and emits UserUnsyncedEvent

10. **process_transfer**: Processes an APT transfer between social channel users
    - **Input**: Service signer verification, sender channel, sender user ID, recipient channel, recipient user ID, and amount
    - **Output**: Transfers APT from sender vault to recipient vault (creates temporary vault if needed), deducts fee, and emits TransferEvent

11. **transfer_within_channel**: Convenience function for APT transfers within the same channel
    - **Input**: Service signer verification, channel name, sender user ID, recipient user ID, and amount
    - **Output**: Calls process_transfer with same channel for both sender and recipient

12. **process_fa_transfer**: Processes a fungible asset transfer between social channel users
    - **Input**: Service signer verification, sender channel, sender user ID, recipient channel, recipient user ID, FA metadata object, and amount
    - **Output**: Transfers FA from sender vault to recipient vault (creates temporary vault if needed), deducts fee, and emits FATransferEvent

13. **transfer_fa_within_channel**: Convenience function for FA transfers within the same channel
    - **Input**: Service signer verification, channel name, sender user ID, recipient user ID, FA metadata object, and amount
    - **Output**: Calls process_fa_transfer with same channel for both sender and recipient

## Admin Entrypoints

1. **admin_set_paused**: Allows the admin to pause or unpause the contract
   - **Input**: Verifies that the signer is the admin and new paused state (boolean)
   - **Output**: Updates the contract's paused status

2. **admin_set_service_signer**: Allows the admin to update the authorized service signer address
   - **Input**: Verifies that the signer is the admin and new service signer address
   - **Output**: Updates the service_signer address in Config

3. **admin_set_fee**: Allows the admin to update the transfer fee percentage
   - **Input**: Verifies that the signer is the admin and new fee value (max 1000 = 10%)
   - **Output**: Updates the fee in Config

4. **admin_set_fee_receiver**: Allows the admin to update the address that receives transfer fees
   - **Input**: Verifies that the signer is the admin and new fee receiver address
   - **Output**: Updates the fee_receiver address in Config

5. **admin_add_supported_fa**: Allows the admin to add a fungible asset to the supported list
   - **Input**: Verifies that the signer is the admin and FA metadata object to add
   - **Output**: Adds FA to supported_fas list if not already present

6. **admin_remove_supported_fa**: Allows the admin to remove a fungible asset from the supported list
   - **Input**: Verifies that the signer is the admin and FA metadata object to remove
   - **Output**: Removes FA from supported_fas list if present

## View Functions

The contract provides several read-only view functions for querying state:

- **get_fee_config**: Returns current fee percentage and fee receiver address
- **calculate_transfer_amounts**: Calculates fee and net amount for a given transfer amount
- **get_primary_vault_for_owner**: Returns the primary vault address for a given owner
- **get_vault_apt_balance**: Returns APT balance of a specified vault
- **get_vault_fa_balance**: Returns FA balance of a specified vault for a given FA
- **get_social_route**: Returns complete route information for a channel/user ID pair
- **get_route_target_vault**: Returns the target vault address for a social route
- **get_route_status**: Returns the status of a social route (TEMP or LINKED)
- **route_exists**: Checks if a social route exists for a channel/user ID pair
- **get_user_profile**: Returns complete user profile including all channel identities
- **get_user_channel_ids**: Returns all user IDs associated with a user for a specific channel

## Route Status Types

- **ROUTE_STATUS_TEMP (0)**: Temporary vault created for unregistered recipient
- **ROUTE_STATUS_LINKED (1)**: Route linked to a registered user's primary vault

## ✅ Code Coverage & Production Readiness

AptSend maintains 100% test coverage across all smart contract entrypoints. Every function has been tested against multiple scenarios including edge cases and error conditions to ensure reliable behavior in production.

The platform is production-ready and operates on a sustainable business model with a 0.2% transfer fee. It is currently deployed on the testnet at 0xd5ca2760a1d578a8fd488da6f057f3bcaa7c497fa976af75fc501b6930189bd5.

![Code Coverage](https://res.cloudinary.com/blockbard/image/upload/c_scale,w_auto,q_auto,f_auto,fl_lossy/v1759516789/aptsend-tests_kov5vk.png)

## 📦 Repository Structure

This repository contains the smart contract implementation and frontend application. The backend is maintained in a separate private repository.

**To request access to the backend repository**, please contact me directly.

## Conclusion

AptSend bridges the gap between traditional social platforms and the Aptos blockchain, making crypto transfers as simple as sending a message. By eliminating the need for wallet addresses and creating automatic onboarding pathways through claimable vaults, AptSend opens new distribution channels for the entire Aptos ecosystem.

I built AptSend to accelerate Aptos adoption by meeting users where they already are — on social media, in their inboxes, and across other blockchains.

## Credits and Support

Thanks for reading!

AptSend is designed and built by 0xBlockBard, a solo indie maker focused on building practical web3 infrastructure that solves real user experience problems.

With over 10 years of development experience across full-stack web applications and smart contracts, I work primarily with Laravel for backend systems and have experience with Solidity, Rust, and Aptos Move. I occasionally write about crypto market trends and interesting projects worth watching.

If you're interested in following my web3 journey:

**Twitter / X:** [0xBlockBard](https://x.com/0xblockbard)  
**Substack:** [0xBlockBard Research](https://www.0xblockbard.com/)

## 🤝 Contributing

AptSend is proprietary software and is not currently accepting external contributions.

## 📄 License

Copyright © 2025 AptSend. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use of this software, via any medium, is strictly prohibited.