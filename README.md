# AptSend

*Send APT or Aptos fungible assets to anyone on Twitter, Telegram, Discord, Email, Phone Number, or even EVM/SOL addresses — even if they’re not on Aptos yet.*

Or better yet, simply make a tweet and automatically send tokens to your specified recipient. Or send a message on Telegram and Discord.

AptSend removes friction from crypto payments by letting you send tokens to anyone on major social platforms and blockchains. Recipients without Aptos wallets receive funds in temporary vaults, creating a natural incentive to join the ecosystem and claim their assets.

This exponentially expands the range of distribution and adoption for Aptos and any Aptos-related projects, as they can now utilise **one-way transfers** to users simply based on their public profile without requiring any knowledge of their wallet address.

> **Key Opportunities:** Exponentially expand the reach of Aptos and Aptos-related projects. Every user on every major social platform is now within reach as a direct channel through a unified interface. Distribution → adoption.

## ✨ Key Features

- Send to **@usernames** on Twitter, Telegram, Discord  
- Send to **email addresses** or **phone numbers**  
- Send to **EVM or Solana addresses** (extensible to any blockchain)
- Send via public posts (tweet to anyone on Twitter) or direct messages (requires bot integration for Telegram/Discord) - coming soon
- Supports APT and any fungible asset on Aptos  
- **Claimable Vaults**: Recipients without Aptos wallets receive funds in temporary vaults, incentivizing them to create a wallet and claim their assets
- 0.2% transfer fee for sustainable operations

## 🧠 Why AptSend?

- **Expand reach:** airdrop to KOLs on X/Twitter via a tweet 
- **Turn rewards into onboarding:** “You’ve got tokens waiting. Create an Aptos wallet to claim.”
- **Fewer DMs for addresses:** reward contributors without asking for wallet strings
- **Marketing loop:** every pending vault is a call-to-action to join Aptos

## 🏗️ How It Works (In simple terms)

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

## 🔁 OAuth Flow (Twitter Example)

### Phase 1: Initiation (Frontend)

1. User clicks "Sync Twitter" on the React dashboard
2. Frontend generates PKCE parameters:
   - `code_verifier`: Random 43-character string
   - `code_challenge`: SHA-256 hash of code_verifier, base64url encoded
3. Frontend stores `code_verifier` in sessionStorage (critical for later)
4. Frontend calls backend: `POST /api/channels/twitter/auth-url`
   - Sends: `owner_address`, `code_challenge`

### Phase 2: Backend Authorization Setup

1. Backend generates `state` (40-character random string for CSRF protection)
2. Backend caches state data in database for 10 minutes:
   - Key: `twitter_oauth_state:{state}`
   - Value: `{owner_address, code_challenge}`
3. Backend builds Twitter OAuth URL with parameters:
   - `client_id`, `redirect_uri`, `scope`, `state`, `code_challenge`, `code_challenge_method=S256`
4. Backend returns `{auth_url, state}` to frontend

### Phase 3: User Authorization (Popup)

1. Frontend opens popup with the Twitter OAuth URL
2. User authorizes the app on Twitter's website
3. Twitter redirects to: `https://aptsend-backend.test/api/channels/twitter/callback?code=xxx&state=yyy`

### Phase 4: Backend Redirect to Frontend

1. Backend GET route catches redirect (`/api/channels/twitter/callback`)
2. Backend validates parameters and redirects to React app: `http://localhost:5174/auth/twitter/callback?code=xxx&state=yyy`
3. If error occurs, backend redirects with error parameter

### Phase 5: Frontend Callback Handler (Popup)

1. React TwitterCallback component loads in popup
2. Component extracts `code` and `state` from URL (or `error` if authorization failed)
3. Component sends postMessage to parent window:
   - On success - Type: `TWITTER_OAUTH_CALLBACK`, Data: `{code, state}`
   - On error - Type: `TWITTER_OAUTH_ERROR`, Data: `{error}`
4. Popup closes after 500ms
5. If no `window.opener` exists (direct URL access), redirects to dashboard with error state

### Phase 6: Parent Window Processing

1. Parent window receives postMessage (Dashboard)
2. Retrieves `code_verifier` from sessionStorage
3. Calls backend: `POST /api/channels/twitter/callback`
   - Sends: `{code, state, code_verifier}`

### Phase 7: Backend Token Exchange

1. Backend retrieves cached data using `state`
2. Backend validates state exists and matches
3. Backend deletes cache entry (prevent replay attacks)
4. Backend exchanges code for tokens with Twitter:
   - Sends: `code`, `grant_type`, `client_id`, `client_secret`, `redirect_uri`, `code_verifier`
   - Uses Basic Auth with `client_id` and `client_secret`
5. Twitter validates PKCE: Verifies `code_verifier` matches original `code_challenge`
6. Twitter returns tokens: `access_token`, `refresh_token`, `expires_in`

### Phase 8: User Data & Storage

1. Backend fetches Twitter user info using `access_token`
   - Requests fields: `id`, `username`, `name`, `profile_image_url`
2. Backend finds/creates User record by `owner_address`
3. Backend checks if Twitter account is already linked to another wallet (prevents duplicate linking)
4. Backend creates/updates ChannelIdentity:
   - Stores encrypted tokens (`access_token`, `refresh_token`)
   - Stores user metadata (username, name, profile_image_url)
   - Sets `vault_status=0` (temporary vault, pending smart contract sync)
   - Sets `token_expires_at` based on `expires_in`
5. Backend dispatches appropriate smart contract job:
   - If user has `primary_vault_address`: Dispatches `SyncUserJob` to call `sync_user` on the AptSend smart contract (links new channel to existing vault)
   - If user has no vault: Dispatches `RegisterUserJob` to call `register_user` on the AptSend smart contract (creates primary vault and links channel)
6. Backend returns success response with identity data to frontend

### Phase 9: Frontend Update

1. Frontend receives success response
2. Frontend reloads accounts list
3. Dashboard shows connected Twitter account
4. Frontend cleans up: Removes `code_verifier` from sessionStorage

# AptSend Smart Contract Entrypoints

AptSend enables users to send cryptocurrency to recipients on major social media platforms and crypto blockchains using familiar standard identifiers - social media handles, email addresses, phone numbers, or EVM addresses - without requiring the sender to know the recipient's Aptos wallet address or the recipient to have an Aptos wallet. The system uses a vault-based architecture with channel identity routing:

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

## Code Coverage

Aptsend has comprehensive 100% test coverage, with all entrypoints thoroughly tested. This includes a full range of scenarios that ensure the platform's reliability and robustness.

The following section provides a breakdown of the tests that validate each function and feature, affirming that AptSend performs as expected under all intended use cases.

![Code Coverage](https://res.cloudinary.com/blockbard/image/upload/c_scale,w_auto,q_auto,f_auto,fl_lossy/v1759516789/aptsend-tests_kov5vk.png)

## 📦 Repository Structure

This repository contains the smart contract implementation and frontend application. The backend is maintained in a separate private repository.

**To request access to the backend repository**, please contact me directly.

## 🤝 Contributing

AptSend is proprietary software and is not currently accepting external contributions.

## 📄 License

Copyright © 2025 AptSend. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use of this software, via any medium, is strictly prohibited.