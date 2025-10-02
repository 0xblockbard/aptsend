#[test_only]
module aptsend_addr::aptsend_tests {
    
    use std::signer;
    use std::option;
    use std::string;
    use std::vector;
    use std::bcs;

    use aptos_framework::account;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::timestamp;
    use aptos_framework::object::{Self, Object};

    use aptos_framework::fungible_asset::{Self, Metadata};
    use aptos_framework::primary_fungible_store;

    use aptsend_addr::aptsend;

    // Test account addresses
    const ADMIN: address = @aptsend_addr;

    // ======================== Test Helpers ========================
    
    // Helper function to setup test environment
    fun setup_test(aptos_framework: &signer, admin: &signer): (coin::BurnCapability<AptosCoin>, coin::MintCapability<AptosCoin>) {
        // Initialize timestamp for testing
        timestamp::set_time_has_started_for_testing(aptos_framework);
        
        // Initialize AptosCoin and return capabilities
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);
        
        // Create admin account if it doesn't exist
        if (!account::exists_at(signer::address_of(admin))) {
            account::create_account_for_test(signer::address_of(admin));
        };
        
        // Initialize the module using init_module_for_test
        aptsend::init_module_for_test(admin);
        
        (burn_cap, mint_cap)
    }

    // Helper function to mint coins for testing
    fun mint_apt(mint_cap: &coin::MintCapability<AptosCoin>, amount: u64): coin::Coin<AptosCoin> {
        coin::mint<AptosCoin>(amount, mint_cap)
    }

    // Helper to convert u128 to vector<u8>
    fun u128_to_bytes(val: u128): vector<u8> {
        bcs::to_bytes(&val)
    }

    // Helper to calculate expected fee amount based on current config
    fun calculate_expected_fee(amount: u64): u64 {
        let (fee_rate, _) = aptsend::get_fee_config();
        (amount * fee_rate) / 10000
    }

    // Helper to calculate expected net amount (amount after fee deduction)
    fun calculate_expected_net_amount(amount: u64): u64 {
        let fee = calculate_expected_fee(amount);
        amount - fee
    }

    // ======================== FA Test Helpers ========================

    struct TestFAStore has key {
        mint_ref: fungible_asset::MintRef,
        burn_ref: fungible_asset::BurnRef,
    }

    // Helper function to create a test FA token
    fun create_test_fa(creator: &signer): Object<Metadata> {
        let constructor_ref = &object::create_named_object(creator, b"TEST_FA");
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::none(), // max_supply
            string::utf8(b"Test Token"),
            string::utf8(b"TEST"),
            8, // decimals
            string::utf8(b""), // icon_uri
            string::utf8(b""), // project_uri
        );
        
        // Store mint/burn refs for later use
        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let burn_ref = fungible_asset::generate_burn_ref(constructor_ref);
        
        move_to(creator, TestFAStore {
            mint_ref,
            burn_ref,
        });
        
        object::object_from_constructor_ref<Metadata>(constructor_ref)
    }

    // Helper to mint test FA tokens
    fun mint_test_fa(creator_addr: address, _fa_metadata: Object<Metadata>, to: address, amount: u64) acquires TestFAStore {
        let store = borrow_global<TestFAStore>(creator_addr);
        let fa = fungible_asset::mint(&store.mint_ref, amount);
        primary_fungible_store::deposit(to, fa);
    }

    // ======================== Tests ========================

    #[test(aptos_framework = @0x1, admin = @aptsend_addr)]
    fun test_init_module_success(aptos_framework: &signer, admin: &signer) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        // If we get here without abort, initialization was successful
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, service = @0x123)]
    fun test_admin_set_service_signer(
        aptos_framework: &signer, 
        admin: &signer,
        service: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        let service_addr = signer::address_of(service);
        
        aptsend::admin_set_service_signer(admin, service_addr);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr)]
    fun test_admin_pause_unpause(aptos_framework: &signer, admin: &signer) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        // Pause the contract
        aptsend::admin_set_paused(admin, true);
        
        // Unpause the contract
        aptsend::admin_set_paused(admin, false);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    fun test_register_user_creates_primary_vault(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        let channel = b"telegram";
        let channel_user_id = u128_to_bytes(12345);
        
        // Service signer is admin by default
        aptsend::register_user(admin, user_addr, channel, channel_user_id);
        
        // Verify primary vault exists
        let primary_vault = aptsend::get_primary_vault_for_owner(user_addr);
        assert!(primary_vault != @0x0, 1);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    #[expected_failure(abort_code = 3, location = aptsend_addr::aptsend)] // E_ALREADY_REGISTERED
    fun test_register_user_twice_fails(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        let channel = b"telegram";
        let channel_user_id = u128_to_bytes(12345);
        
        // First register user should succeed
        aptsend::register_user(admin, user_addr, channel, channel_user_id);
        
        // Second register user should fail
        aptsend::register_user(admin, user_addr, channel, channel_user_id);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    fun test_sync_user_links_new_channel(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        
        // First register user with telegram
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(12345));
        
        // Sync user with discord
        aptsend::sync_user(admin, user_addr, b"discord", u128_to_bytes(67890));
        
        // Verify user profile exists and verify owner using getter function
        let profile_owner = aptsend::get_user_profile_owner(user_addr);
        assert!(profile_owner == user_addr, 1);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    #[expected_failure(abort_code = 4, location = aptsend_addr::aptsend)] // E_NOT_REGISTERED
    fun test_sync_user_without_register_user_fails(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        
        // Try to sync user without registering user first
        aptsend::sync_user(admin, user_addr, b"telegram", u128_to_bytes(12345));
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    fun test_deposit_to_primary_vault(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        
        // Register user and create primary vault
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(12345));
        
        // Fund user account
        let coins = mint_apt(&mint_cap, 1000000);
        coin::register<AptosCoin>(user);
        coin::deposit(user_addr, coins);
        
        // Get vault address before deposit
        let vault_addr = aptsend::get_primary_vault_for_owner(user_addr);
        let balance_before = aptsend::get_vault_apt_balance(vault_addr);
        
        // Deposit to primary vault - NO TYPE PARAMETER
        let deposit_amount = 500000;
        aptsend::deposit_to_primary_vault(user, deposit_amount);
        
        // Check balance increased
        let balance_after = aptsend::get_vault_apt_balance(vault_addr);
        assert!(balance_after == balance_before + deposit_amount, 1);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456, recipient = @0x789)]
    fun test_withdraw_from_primary_vault(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer,
        recipient: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        let recipient_addr = signer::address_of(recipient);
        
        // Setup user with vault and funds
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(12345));
        
        let coins = mint_apt(&mint_cap, 1000000);
        coin::register<AptosCoin>(user);
        coin::deposit(user_addr, coins);
        
        aptsend::deposit_to_primary_vault(user, 500000);
        
        // Setup recipient account
        account::create_account_for_test(recipient_addr);
        coin::register<AptosCoin>(recipient);
        
        // Withdraw from vault - NO TYPE PARAMETER
        let withdraw_amount = 200000;
        aptsend::withdraw_from_primary_vault(user, recipient_addr, withdraw_amount);
        
        // Verify recipient received funds
        let recipient_balance = coin::balance<AptosCoin>(recipient_addr);
        assert!(recipient_balance == withdraw_amount, 1);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, sender = @0x456, receiver = @0x789)]
    fun test_transfer_within_channel(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer,
        receiver: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let sender_addr = signer::address_of(sender);
        let _receiver_addr = signer::address_of(receiver);
        
        let channel = b"telegram";
        let sender_id = u128_to_bytes(11111);
        let receiver_id = u128_to_bytes(22222);
        
        // Setup sender with vault and funds
        aptsend::register_user(admin, sender_addr, channel, sender_id);
        
        let coins = mint_apt(&mint_cap, 1000000);
        coin::register<AptosCoin>(sender);
        coin::deposit(sender_addr, coins);
        
        aptsend::deposit_to_primary_vault(sender, 500000);
        
        // Setup receiver (not registered yet - should create temp vault)
        let transfer_amount = 100000;
        
        // Execute transfer - NO TYPE PARAMETER
        aptsend::transfer_within_channel(
            admin,
            channel,
            sender_id,
            receiver_id,
            transfer_amount
        );
        
        // Verify route was created for receiver using getter function
        let receiver_vault = aptsend::get_route_target_vault(channel, receiver_id);
        assert!(receiver_vault != @0x0, 1);

        // Calculate expected amounts
        let expected_net = calculate_expected_net_amount(transfer_amount);
        let expected_fee = calculate_expected_fee(transfer_amount);
        
        // Verify receiver vault has received funds
        let receiver_balance = aptsend::get_vault_apt_balance(receiver_vault);
        assert!(receiver_balance == expected_net, 2); // less fees

        // Verify fee receiver (admin) has collected the fee
        let (_, fee_receiver_addr) = aptsend::get_fee_config();
        let fee_balance = coin::balance<AptosCoin>(fee_receiver_addr);
        assert!(fee_balance == expected_fee, 2);

        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr)]
    #[expected_failure(abort_code = 2, location = aptsend_addr::aptsend)] // E_PAUSED
    fun test_register_user_fails_when_paused(
        aptos_framework: &signer,
        admin: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        // Pause the contract
        aptsend::admin_set_paused(admin, true);
        
        // Try to register user - should fail
        aptsend::register_user(admin, @0x456, b"telegram", u128_to_bytes(12345));
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, unauthorized = @0x999)]
    #[expected_failure(abort_code = 7, location = aptsend_addr::aptsend)] // E_UNAUTHORIZED
    fun test_unauthorized_service_call_fails(
        aptos_framework: &signer,
        admin: &signer,
        unauthorized: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        // Try to call register user with unauthorized signer
        aptsend::register_user(unauthorized, @0x456, b"telegram", u128_to_bytes(12345));
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, sender = @0x456)]
    #[expected_failure(abort_code = 8, location = aptsend_addr::aptsend)] // E_INSUFFICIENT_BALANCE
    fun test_transfer_insufficient_balance_fails(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let sender_addr = signer::address_of(sender);
        let channel = b"telegram";
        
        // Setup sender with vault but no funds
        aptsend::register_user(admin, sender_addr, channel, u128_to_bytes(11111));
        
        // Try to transfer more than balance - should fail - NO TYPE PARAMETER
        aptsend::transfer_within_channel(
            admin,
            channel,
            u128_to_bytes(11111),
            u128_to_bytes(22222),
            1000000
        );
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, sender = @0x456)]
    fun test_register_user_sweeps_temp_vault(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let sender_addr = signer::address_of(sender);
        let channel = b"telegram";
        let receiver_id = u128_to_bytes(99999);
        
        // Setup sender with funds
        aptsend::register_user(admin, sender_addr, channel, u128_to_bytes(11111));
        
        let coins = mint_apt(&mint_cap, 1000000);
        coin::register<AptosCoin>(sender);
        coin::deposit(sender_addr, coins);
        
        aptsend::deposit_to_primary_vault(sender, 500000);

        // Get initial fee receiver balance
        let (_, fee_receiver_addr) = aptsend::get_fee_config();
        let fee_balance_before = coin::balance<AptosCoin>(fee_receiver_addr);
            
        // Transfer to non-existent user (creates temp vault) - NO TYPE PARAMETER
        let transfer_amount = 100000;
        aptsend::transfer_within_channel(
            admin,
            channel,
            u128_to_bytes(11111),
            receiver_id,
            transfer_amount
        );

        // Calculate final transfer amount less fees
        let expected_net = calculate_expected_net_amount(transfer_amount);
        let expected_fee = calculate_expected_fee(transfer_amount);
        
        // Verify temp vault was created with funds
        let temp_vault = aptsend::get_route_target_vault(channel, receiver_id);
        let temp_balance = aptsend::get_vault_apt_balance(temp_vault);
        assert!(temp_balance == expected_net, 1);

        // Verify fee was collected
        let fee_balance_after = coin::balance<AptosCoin>(fee_receiver_addr);
        assert!(fee_balance_after == fee_balance_before + expected_fee, 2);
        
        // Now receiver registers - should sweep temp vault to primary
        let receiver_addr = @0x888;
        aptsend::register_user(admin, receiver_addr, channel, receiver_id);
        
        // Get primary vault and verify funds were swept
        let primary_vault = aptsend::get_primary_vault_for_owner(receiver_addr);
        let primary_balance = aptsend::get_vault_apt_balance(primary_vault);
        assert!(primary_balance == expected_net, 2);
        
        // Temp vault should now be empty
        let temp_balance_after = aptsend::get_vault_apt_balance(temp_vault);
        assert!(temp_balance_after == 0, 3);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    fun test_sync_user_sweeps_temp_vault(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        
        // User registered with telegram
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(11111));
        
        // Setup another user to send funds
        let sender_addr = @0x999;
        aptsend::register_user(admin, sender_addr, b"discord", u128_to_bytes(22222));
        
        let coins = mint_apt(&mint_cap, 1000000);
        account::create_account_for_test(sender_addr);
        coin::register<AptosCoin>(&account::create_signer_for_test(sender_addr));
        coin::deposit(sender_addr, coins);
        
        aptsend::deposit_to_primary_vault(&account::create_signer_for_test(sender_addr), 500000);
        
        // Get initial fee receiver balance
        let (_, fee_receiver_addr) = aptsend::get_fee_config();
        let fee_balance_before = coin::balance<AptosCoin>(fee_receiver_addr);
    
        // Transfer to user on discord (creates temp vault since user not on discord yet) - NO TYPE PARAMETER
        let transfer_amount = 100000;
        let discord_user_id = u128_to_bytes(33333);
        aptsend::process_transfer(
            admin,
            b"discord",
            u128_to_bytes(22222),
            b"discord",
            discord_user_id,
            transfer_amount
        );

        // Calculate final transfer amount less fees
        let expected_net = calculate_expected_net_amount(transfer_amount);
        let expected_fee = calculate_expected_fee(transfer_amount);
        
        // Verify temp vault created
        let temp_vault = aptsend::get_route_target_vault(b"discord", discord_user_id);
        let temp_balance = aptsend::get_vault_apt_balance(temp_vault);
        assert!(temp_balance == expected_net, 1);

        // Verify fee was collected
        let fee_balance_after = coin::balance<AptosCoin>(fee_receiver_addr);
        assert!(fee_balance_after == fee_balance_before + expected_fee, 2);
        
        // User syncs with discord - should sweep temp vault
        aptsend::sync_user(admin, user_addr, b"discord", discord_user_id);
        
        // Verify funds swept to primary vault
        let primary_vault = aptsend::get_primary_vault_for_owner(user_addr);
        let primary_balance = aptsend::get_vault_apt_balance(primary_vault);
        assert!(primary_balance == expected_net, 2);
        
        // Temp vault should be empty
        let temp_balance_after = aptsend::get_vault_apt_balance(temp_vault);
        assert!(temp_balance_after == 0, 3);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, sender = @0x456)]
    fun test_cross_channel_transfer(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let sender_addr = signer::address_of(sender);
        
        // Sender registered with telegram
        aptsend::register_user(admin, sender_addr, b"telegram", u128_to_bytes(11111));
        
        // Fund sender
        let coins = mint_apt(&mint_cap, 1000000);
        coin::register<AptosCoin>(sender);
        coin::deposit(sender_addr, coins);
        
        aptsend::deposit_to_primary_vault(sender, 500000);
        
        // Get initial fee receiver balance
        let (_, fee_receiver_addr) = aptsend::get_fee_config();
        let fee_balance_before = coin::balance<AptosCoin>(fee_receiver_addr);
        
        // Transfer from telegram to discord user - NO TYPE PARAMETER
        let transfer_amount = 150000;
        let discord_id = u128_to_bytes(99999);
        aptsend::process_transfer(
            admin,
            b"telegram",
            u128_to_bytes(11111),
            b"discord",
            discord_id,
            transfer_amount
        );

        // Calculate final transfer amount less fees
        let expected_net = calculate_expected_net_amount(transfer_amount);
        let expected_fee = calculate_expected_fee(transfer_amount);

        // Verify discord user received funds in temp vault
        let discord_vault = aptsend::get_route_target_vault(b"discord", discord_id);
        let discord_balance = aptsend::get_vault_apt_balance(discord_vault);
        assert!(discord_balance == expected_net, 1);

        // Verify fee was collected
        let fee_balance_after = coin::balance<AptosCoin>(fee_receiver_addr);
        assert!(fee_balance_after == fee_balance_before + expected_fee, 2);
        
        // Verify sender's balance decreased
        let sender_vault = aptsend::get_primary_vault_for_owner(sender_addr);
        let sender_balance = aptsend::get_vault_apt_balance(sender_vault);
        assert!(sender_balance == 500000 - transfer_amount, 2);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user_a = @0x456, user_b = @0x789)]
    #[expected_failure(abort_code = 6, location = aptsend_addr::aptsend)] // E_ROUTE_CONFLICT_ALREADY_LINKED
    fun test_sync_user_fails_if_channel_linked_to_other_user(
        aptos_framework: &signer,
        admin: &signer,
        user_a: &signer,
        user_b: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_a_addr = signer::address_of(user_a);
        let user_b_addr = signer::address_of(user_b);
        
        let telegram_id = u128_to_bytes(12345);
        
        // User A registered with telegram:12345
        aptsend::register_user(admin, user_a_addr, b"telegram", telegram_id);
        
        // User B registered with different telegram ID
        aptsend::register_user(admin, user_b_addr, b"telegram", u128_to_bytes(67890));
        
        // User B tries to sync with the same telegram ID as User A - should fail
        aptsend::sync_user(admin, user_b_addr, b"telegram", telegram_id);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    fun test_sync_user_multiple_channels(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        
        // Register user with telegram
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(11111));
        
        // Sync user with discord
        aptsend::sync_user(admin, user_addr, b"discord", u128_to_bytes(22222));
        
        // Sync user with whatsapp
        aptsend::sync_user(admin, user_addr, b"whatsapp", u128_to_bytes(33333));
        
        // Verify all channels are linked to the same primary vault
        let primary_vault = aptsend::get_primary_vault_for_owner(user_addr);
        
        let telegram_vault = aptsend::get_route_target_vault(b"telegram", u128_to_bytes(11111));
        assert!(telegram_vault == primary_vault, 1);
        
        let discord_vault = aptsend::get_route_target_vault(b"discord", u128_to_bytes(22222));
        assert!(discord_vault == primary_vault, 2);
        
        let whatsapp_vault = aptsend::get_route_target_vault(b"whatsapp", u128_to_bytes(33333));
        assert!(whatsapp_vault == primary_vault, 3);
        
        // Verify user profile owner
        let profile_owner = aptsend::get_user_profile_owner(user_addr);
        assert!(profile_owner == user_addr, 4);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    fun test_sync_user_multiple_ids_same_channel(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        
        // Register with first telegram ID
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(11111));
        
        // Sync with second telegram ID
        aptsend::sync_user(admin, user_addr, b"telegram", u128_to_bytes(22222));
        
        // Both routes should point to same primary vault
        let primary_vault = aptsend::get_primary_vault_for_owner(user_addr);
        let route1_vault = aptsend::get_route_target_vault(b"telegram", u128_to_bytes(11111));
        let route2_vault = aptsend::get_route_target_vault(b"telegram", u128_to_bytes(22222));
        
        assert!(route1_vault == primary_vault, 1);
        assert!(route2_vault == primary_vault, 2);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    fun test_email_and_evm_address_as_user_ids(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        
        // Register with numeric ID first
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(12345));
        
        // Sync with email as user ID
        let email = b"user@example.com";
        aptsend::sync_user(admin, user_addr, b"email", email);
        
        // Sync with EVM address as user ID
        let evm_address = b"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
        aptsend::sync_user(admin, user_addr, b"evm", evm_address);
        
        // Verify all routes point to same primary vault
        let primary_vault = aptsend::get_primary_vault_for_owner(user_addr);
        
        let email_vault = aptsend::get_route_target_vault(b"email", email);
        assert!(email_vault == primary_vault, 1);
        
        let evm_vault = aptsend::get_route_target_vault(b"evm", evm_address);
        assert!(evm_vault == primary_vault, 2);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, old_service = @0x111, new_service = @0x222, user = @0x456)]
    #[expected_failure(abort_code = 7, location = aptsend_addr::aptsend)] // E_UNAUTHORIZED
    fun test_old_service_signer_unauthorized_after_change(
        aptos_framework: &signer,
        admin: &signer,
        old_service: &signer,
        new_service: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        let new_service_addr = signer::address_of(new_service);
        
        // Admin sets new service signer
        aptsend::admin_set_service_signer(admin, new_service_addr);
        
        // Old service signer (admin) tries to call register user - should fail
        aptsend::register_user(old_service, user_addr, b"telegram", u128_to_bytes(12345));
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    // ======================== FA Tests ========================

    #[test(aptos_framework = @0x1, admin = @aptsend_addr)]
    fun test_admin_add_and_remove_supported_fa(
        aptos_framework: &signer,
        admin: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        // Create test FA
        let fa_metadata = create_test_fa(admin);
        
        // Add FA to supported list
        aptsend::admin_add_supported_fa(admin, fa_metadata);
        
        // Remove FA from supported list
        aptsend::admin_remove_supported_fa(admin, fa_metadata);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    fun test_deposit_fa_to_primary_vault(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) acquires TestFAStore {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let admin_addr = signer::address_of(admin); 
        let user_addr  = signer::address_of(user);
        
        // Create test FA
        let fa_metadata = create_test_fa(admin);
        aptsend::admin_add_supported_fa(admin, fa_metadata);
        
        // Register user and create primary vault
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(12345));
        
        // Ensure user has FA store and mint some tokens
        primary_fungible_store::ensure_primary_store_exists(user_addr, fa_metadata);
        mint_test_fa(admin_addr, fa_metadata, user_addr, 1000000);
        
        // Get vault address and initial balance
        let vault_addr = aptsend::get_primary_vault_for_owner(user_addr);
        let balance_before = aptsend::get_vault_fa_balance(vault_addr, fa_metadata);
        
        // Deposit FA to primary vault
        let deposit_amount = 500000;
        aptsend::deposit_fa_to_primary_vault(user, fa_metadata, deposit_amount);
        
        // Check balance increased
        let balance_after = aptsend::get_vault_fa_balance(vault_addr, fa_metadata);
        assert!(balance_after == balance_before + deposit_amount, 1);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456, recipient = @0x789)]
    fun test_withdraw_fa_from_primary_vault(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer,
        recipient: &signer
    ) acquires TestFAStore {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let admin_addr     = signer::address_of(admin); 
        let user_addr      = signer::address_of(user);
        let recipient_addr = signer::address_of(recipient);
        
        // Create test FA
        let fa_metadata = create_test_fa(admin);
        aptsend::admin_add_supported_fa(admin, fa_metadata);
        
        // Register user
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(12345));
        
        // Setup user with FA
        primary_fungible_store::ensure_primary_store_exists(user_addr, fa_metadata);
        mint_test_fa(admin_addr, fa_metadata, user_addr, 1000000);
        aptsend::deposit_fa_to_primary_vault(user, fa_metadata, 500000);
        
        // Setup recipient account
        account::create_account_for_test(recipient_addr);
        primary_fungible_store::ensure_primary_store_exists(recipient_addr, fa_metadata);
        
        // Withdraw FA from vault
        let withdraw_amount = 200000;
        aptsend::withdraw_fa_from_primary_vault(user, fa_metadata, recipient_addr, withdraw_amount);
        
        // Verify recipient received FA
        let recipient_balance = aptsend::get_vault_fa_balance(recipient_addr, fa_metadata);
        assert!(recipient_balance == withdraw_amount, 1);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, sender = @0x456)]
    #[expected_failure(abort_code = 10, location = aptsend_addr::aptsend)] // E_UNSUPPORTED_FA
    fun test_fa_transfer_unsupported_fa_fails(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let sender_addr = signer::address_of(sender);
        
        // Create test FA but DON'T add it to supported list
        let unsupported_fa = create_test_fa(admin);
        
        // Register sender
        aptsend::register_user(admin, sender_addr, b"telegram", u128_to_bytes(11111));
        
        // Try to transfer unsupported FA - should fail
        aptsend::process_fa_transfer(
            admin,
            b"telegram",
            u128_to_bytes(11111),
            b"telegram",
            u128_to_bytes(22222),
            unsupported_fa,
            100000
        );
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, sender = @0x456)]
    fun test_fa_transfer_within_channel(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer
    ) acquires TestFAStore {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let admin_addr  = signer::address_of(admin); 
        let sender_addr = signer::address_of(sender);

        let channel = b"telegram";
        let sender_id = u128_to_bytes(11111);
        let receiver_id = u128_to_bytes(22222);
        
        // Create and add supported FA
        let fa_metadata = create_test_fa(admin);
        aptsend::admin_add_supported_fa(admin, fa_metadata);
        
        // Register sender
        aptsend::register_user(admin, sender_addr, channel, sender_id);
        
        // Fund sender with FA
        let sender_vault = aptsend::get_primary_vault_for_owner(sender_addr);
        primary_fungible_store::ensure_primary_store_exists(sender_vault, fa_metadata);
        mint_test_fa(admin_addr, fa_metadata, sender_vault, 1000000);
        
        // Execute FA transfer
        let transfer_amount = 100000;
        aptsend::transfer_fa_within_channel(
            admin,
            channel,
            sender_id,
            receiver_id,
            fa_metadata,
            transfer_amount
        );

        // Calculate expected amounts
        let expected_net = calculate_expected_net_amount(transfer_amount);
        let expected_fee = calculate_expected_fee(transfer_amount);
        
        // Verify receiver vault was created and has FA
        let receiver_vault = aptsend::get_route_target_vault(channel, receiver_id);
        let receiver_balance = aptsend::get_vault_fa_balance(receiver_vault, fa_metadata);
        assert!(receiver_balance == expected_net, 1);

        // Verify fee receiver (admin) has collected the fee
        let (_, fee_receiver_addr) = aptsend::get_fee_config();
        let fee_balance = aptsend::get_vault_fa_balance(fee_receiver_addr, fa_metadata);
        assert!(fee_balance == expected_fee, 3);
        
        // Verify sender's balance decreased
        let sender_balance = aptsend::get_vault_fa_balance(sender_vault, fa_metadata);
        assert!(sender_balance == 1000000 - transfer_amount, 2);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, sender = @0x456)]
    fun test_fa_cross_channel_transfer(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer
    ) acquires TestFAStore {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let admin_addr  = signer::address_of(admin); 
        let sender_addr = signer::address_of(sender);
        
        // Create and add supported FA
        let fa_metadata = create_test_fa(admin);
        aptsend::admin_add_supported_fa(admin, fa_metadata);
        
        // Register sender with telegram
        aptsend::register_user(admin, sender_addr, b"telegram", u128_to_bytes(11111));
        
        // Fund sender with FA
        let sender_vault = aptsend::get_primary_vault_for_owner(sender_addr);
        primary_fungible_store::ensure_primary_store_exists(sender_vault, fa_metadata);
        mint_test_fa(admin_addr, fa_metadata, sender_vault, 1000000);
        
        // Transfer from telegram to discord user
        let transfer_amount = 150000;
        let discord_id = u128_to_bytes(99999);
        aptsend::process_fa_transfer(
            admin,
            b"telegram",
            u128_to_bytes(11111),
            b"discord",
            discord_id,
            fa_metadata,
            transfer_amount
        );

        // Calculate expected amounts
        let expected_net = calculate_expected_net_amount(transfer_amount);
        let expected_fee = calculate_expected_fee(transfer_amount);
        
        // Verify discord user received FA in temp vault
        let discord_vault = aptsend::get_route_target_vault(b"discord", discord_id);
        let discord_balance = aptsend::get_vault_fa_balance(discord_vault, fa_metadata);
        assert!(discord_balance == expected_net, 1);

        // Verify fee receiver (admin) has collected the fee
        let (_, fee_receiver_addr) = aptsend::get_fee_config();
        let fee_balance = aptsend::get_vault_fa_balance(fee_receiver_addr, fa_metadata);
        assert!(fee_balance == expected_fee, 3);
        
        // Verify sender's balance decreased
        let sender_balance = aptsend::get_vault_fa_balance(sender_vault, fa_metadata);
        assert!(sender_balance == 1000000 - transfer_amount, 2);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, sender = @0x456)]
    fun test_register_user_sweeps_fa_from_temp_vault(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer
    ) acquires TestFAStore {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let admin_addr  = signer::address_of(admin); 
        let sender_addr = signer::address_of(sender);

        let receiver_id = u128_to_bytes(99999);
        let channel = b"telegram";
        
        // Create and add supported FA
        let fa_metadata = create_test_fa(admin);
        aptsend::admin_add_supported_fa(admin, fa_metadata);
        
        // Setup sender
        aptsend::register_user(admin, sender_addr, channel, u128_to_bytes(11111));
        
        // Fund sender with FA
        let sender_vault = aptsend::get_primary_vault_for_owner(sender_addr);
        primary_fungible_store::ensure_primary_store_exists(sender_vault, fa_metadata);
        mint_test_fa(admin_addr, fa_metadata, sender_vault, 1000000);
        
        // Send FA to non-existent user (creates temp vault)
        let transfer_amount = 200000;
        aptsend::transfer_fa_within_channel(
            admin,
            channel,
            u128_to_bytes(11111),
            receiver_id,
            fa_metadata,
            transfer_amount
        );

        // Calculate expected amounts
        let expected_net = calculate_expected_net_amount(transfer_amount);
        let expected_fee = calculate_expected_fee(transfer_amount);
        
        // Verify temp vault has FA
        let temp_vault = aptsend::get_route_target_vault(channel, receiver_id);
        let temp_balance = aptsend::get_vault_fa_balance(temp_vault, fa_metadata);
        assert!(temp_balance == expected_net, 1);

        // Verify fee receiver (admin) has collected the fee
        let (_, fee_receiver_addr) = aptsend::get_fee_config();
        let fee_balance = aptsend::get_vault_fa_balance(fee_receiver_addr, fa_metadata);
        assert!(fee_balance == expected_fee, 3);
        
        // Register receiver (should sweep FA to primary vault)
        let receiver_addr = @0x888;
        aptsend::register_user(admin, receiver_addr, channel, receiver_id);
        
        // Verify primary vault has FA
        let primary_vault = aptsend::get_primary_vault_for_owner(receiver_addr);
        let primary_balance = aptsend::get_vault_fa_balance(primary_vault, fa_metadata);
        assert!(primary_balance == expected_net, 2);
        
        // Temp vault should be empty
        let temp_balance_after = aptsend::get_vault_fa_balance(temp_vault, fa_metadata);
        assert!(temp_balance_after == 0, 3);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456, sender = @0x999)]
    fun test_sync_user_sweeps_fa_from_temp_vault(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer,
        sender: &signer
    ) acquires TestFAStore {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let admin_addr  = signer::address_of(admin); 
        let user_addr   = signer::address_of(user);
        let sender_addr = signer::address_of(sender);
        
        // Create and add supported FA
        let fa_metadata = create_test_fa(admin);
        aptsend::admin_add_supported_fa(admin, fa_metadata);
        
        // User registered with telegram
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(11111));
        
        // Setup sender on discord
        aptsend::register_user(admin, sender_addr, b"discord", u128_to_bytes(22222));
        let sender_vault = aptsend::get_primary_vault_for_owner(sender_addr);
        primary_fungible_store::ensure_primary_store_exists(sender_vault, fa_metadata);
        mint_test_fa(admin_addr, fa_metadata, sender_vault, 1000000);
        
        // Send FA to discord user (creates temp vault)
        let transfer_amount = 100000;
        let discord_user_id = u128_to_bytes(33333);
        aptsend::process_fa_transfer(
            admin,
            b"discord",
            u128_to_bytes(22222),
            b"discord",
            discord_user_id,
            fa_metadata,
            transfer_amount
        );

        // Calculate expected amounts
        let expected_net = calculate_expected_net_amount(transfer_amount);
        let expected_fee = calculate_expected_fee(transfer_amount);
        
        // Verify temp vault created with FA
        let temp_vault = aptsend::get_route_target_vault(b"discord", discord_user_id);
        let temp_balance = aptsend::get_vault_fa_balance(temp_vault, fa_metadata);
        assert!(temp_balance == expected_net, 1);

        // Verify fee receiver (admin) has collected the fee
        let (_, fee_receiver_addr) = aptsend::get_fee_config();
        let fee_balance = aptsend::get_vault_fa_balance(fee_receiver_addr, fa_metadata);
        assert!(fee_balance == expected_fee, 3);
        
        // User syncs with discord (sweeps FA to primary)
        aptsend::sync_user(admin, user_addr, b"discord", discord_user_id);
        
        // Verify primary vault has FA
        let primary_vault = aptsend::get_primary_vault_for_owner(user_addr);
        let primary_balance = aptsend::get_vault_fa_balance(primary_vault, fa_metadata);
        assert!(primary_balance == expected_net, 2);
        
        // Temp vault should be empty
        let temp_balance_after = aptsend::get_vault_fa_balance(temp_vault, fa_metadata);
        assert!(temp_balance_after == 0, 3);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, sender = @0x456)]
    fun test_register_sweeps_both_apt_and_fa(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer
    ) acquires TestFAStore {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let admin_addr  = signer::address_of(admin); 
        let sender_addr = signer::address_of(sender);

        let receiver_id = u128_to_bytes(99999);
        let channel = b"telegram";
        
        // Create and add supported FA
        let fa_metadata = create_test_fa(admin);
        aptsend::admin_add_supported_fa(admin, fa_metadata);
        
        // Setup sender with APT
        aptsend::register_user(admin, sender_addr, channel, u128_to_bytes(11111));
        let coins = mint_apt(&mint_cap, 1000000);
        coin::register<AptosCoin>(sender);
        coin::deposit(sender_addr, coins);
        aptsend::deposit_to_primary_vault(sender, 500000);
        
        // Fund sender with FA
        let sender_vault = aptsend::get_primary_vault_for_owner(sender_addr);
        primary_fungible_store::ensure_primary_store_exists(sender_vault, fa_metadata);
        mint_test_fa(admin_addr, fa_metadata, sender_vault, 1000000);
        
        // Send APT to create temp vault
        let apt_amount = 100000;
        aptsend::transfer_within_channel(
            admin,
            channel,
            u128_to_bytes(11111),
            receiver_id,
            apt_amount
        );
        
        // Send FA to same temp vault
        let fa_amount = 200000;
        aptsend::transfer_fa_within_channel(
            admin,
            channel,
            u128_to_bytes(11111),
            receiver_id,
            fa_metadata,
            fa_amount
        );

        // Calculate expected amounts
        let expected_net_apt = calculate_expected_net_amount(apt_amount);
        let expected_fee_apt = calculate_expected_fee(apt_amount);
        let expected_net_fa  = calculate_expected_net_amount(fa_amount);
        let expected_fee_fa  = calculate_expected_fee(fa_amount);
        
        // Verify temp vault has both - less fees
        let temp_vault = aptsend::get_route_target_vault(channel, receiver_id);
        assert!(aptsend::get_vault_apt_balance(temp_vault) == expected_net_apt, 1);
        assert!(aptsend::get_vault_fa_balance(temp_vault, fa_metadata) == expected_net_fa, 2);

        // Verify fee receiver (admin) has collected the fee
        let (_, fee_receiver_addr) = aptsend::get_fee_config();
        let fee_balance_apt = coin::balance<AptosCoin>(fee_receiver_addr);
        let fee_balance_fa  = aptsend::get_vault_fa_balance(fee_receiver_addr, fa_metadata);
        assert!(fee_balance_fa  == expected_fee_fa, 3);
        assert!(fee_balance_apt == expected_fee_apt, 2);
        
        // Register receiver (should sweep both APT and FA)
        let receiver_addr = @0x888;
        aptsend::register_user(admin, receiver_addr, channel, receiver_id);
        
        // Verify primary vault has both APT and FA
        let primary_vault = aptsend::get_primary_vault_for_owner(receiver_addr);
        assert!(aptsend::get_vault_apt_balance(primary_vault) == expected_net_apt, 3);
        assert!(aptsend::get_vault_fa_balance(primary_vault, fa_metadata) == expected_net_fa, 4);
        
        // Temp vault should be empty for both
        assert!(aptsend::get_vault_apt_balance(temp_vault) == 0, 5);
        assert!(aptsend::get_vault_fa_balance(temp_vault, fa_metadata) == 0, 6);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, unauthorized = @0x999)]
    #[expected_failure(abort_code = 1, location = aptsend_addr::aptsend)] // E_ADMIN_ONLY
    fun test_unauthorized_add_fa_fails(
        aptos_framework: &signer,
        admin: &signer,
        unauthorized: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let fa_metadata = create_test_fa(admin);
        
        // Non-admin tries to add FA - should fail
        aptsend::admin_add_supported_fa(unauthorized, fa_metadata);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr)]
    fun test_add_same_fa_twice_idempotent(
        aptos_framework: &signer,
        admin: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let fa_metadata = create_test_fa(admin);
        
        // Add FA first time
        aptsend::admin_add_supported_fa(admin, fa_metadata);
        
        // Add same FA second time - should not fail (idempotent)
        aptsend::admin_add_supported_fa(admin, fa_metadata);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr)]
    fun test_remove_nonexistent_fa_safe(
        aptos_framework: &signer,
        admin: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let fa_metadata = create_test_fa(admin);
        
        // Remove FA that was never added - should not fail
        aptsend::admin_remove_supported_fa(admin, fa_metadata);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    // ======================== Fee Tests ========================

    #[test(aptos_framework = @0x1, admin = @aptsend_addr)]
    fun test_default_fee_config(aptos_framework: &signer, admin: &signer) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        // Check default fee config
        let (fee, fee_receiver) = aptsend::get_fee_config();
        assert!(fee == 200, 1); // Default 2% fee (200/10000)
        assert!(fee_receiver == signer::address_of(admin), 2); // Admin is default fee receiver
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr)]
    fun test_admin_set_fee(aptos_framework: &signer, admin: &signer) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        // Set new fee
        aptsend::admin_set_fee(admin, 500); // 5% fee
        
        let (fee, _) = aptsend::get_fee_config();
        assert!(fee == 500, 1);
        
        // Test setting to 0 (no fee)
        aptsend::admin_set_fee(admin, 0);
        let (fee_zero, _) = aptsend::get_fee_config();
        assert!(fee_zero == 0, 2);
        
        // Test max allowed fee (10%)
        aptsend::admin_set_fee(admin, 1000);
        let (fee_max, _) = aptsend::get_fee_config();
        assert!(fee_max == 1000, 3);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr)]
    #[expected_failure(abort_code = 11, location = aptsend_addr::aptsend)] // E_INVALID_FEE
    fun test_admin_set_fee_too_high_fails(aptos_framework: &signer, admin: &signer) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        // Try to set fee > 10% - should fail
        aptsend::admin_set_fee(admin, 1001);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, fee_collector = @0xFEE)]
    fun test_admin_set_fee_receiver(
        aptos_framework: &signer, 
        admin: &signer,
        fee_collector: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let fee_collector_addr = signer::address_of(fee_collector);
        
        // Set new fee receiver
        aptsend::admin_set_fee_receiver(admin, fee_collector_addr);
        
        let (_, fee_receiver) = aptsend::get_fee_config();
        assert!(fee_receiver == fee_collector_addr, 1);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr)]
    fun test_calculate_transfer_amounts(aptos_framework: &signer, admin: &signer) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        // Test with default 2% fee
        let (fee_amount, net_amount) = aptsend::calculate_transfer_amounts(10000);
        assert!(fee_amount == 200, 1); // 2% of 10000
        assert!(net_amount == 9800, 2); // 10000 - 200
        
        // Test with different amount
        let (fee_amount_2, net_amount_2) = aptsend::calculate_transfer_amounts(50000);
        assert!(fee_amount_2 == 1000, 3); // 2% of 50000
        assert!(net_amount_2 == 49000, 4); // 50000 - 1000
        
        // Change fee to 5%
        aptsend::admin_set_fee(admin, 500);
        let (fee_amount_3, net_amount_3) = aptsend::calculate_transfer_amounts(10000);
        assert!(fee_amount_3 == 500, 5); // 5% of 10000
        assert!(net_amount_3 == 9500, 6); // 10000 - 500
        
        // Set fee to 0
        aptsend::admin_set_fee(admin, 0);
        let (fee_amount_4, net_amount_4) = aptsend::calculate_transfer_amounts(10000);
        assert!(fee_amount_4 == 0, 7);
        assert!(net_amount_4 == 10000, 8); // No fee deducted
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, sender = @0x456, receiver = @0x789, fee_collector = @0xFEE)]
    fun test_transfer_with_fee_collection(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer,
        fee_collector: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let sender_addr = signer::address_of(sender);
        let fee_collector_addr = signer::address_of(fee_collector);
        
        // Setup fee collector account
        account::create_account_for_test(fee_collector_addr);
        coin::register<AptosCoin>(fee_collector);
        
        // Set fee receiver
        aptsend::admin_set_fee_receiver(admin, fee_collector_addr);
        
        // Register sender and receiver
        aptsend::register_user(admin, sender_addr, b"telegram", u128_to_bytes(11111));
        
        // Fund sender
        let coins = mint_apt(&mint_cap, 1000000);
        coin::register<AptosCoin>(sender);
        coin::deposit(sender_addr, coins);
        aptsend::deposit_to_primary_vault(sender, 500000);
        
        // Execute transfer
        let transfer_amount = 100000;
        aptsend::transfer_within_channel(
            admin,
            b"telegram",
            u128_to_bytes(11111),
            u128_to_bytes(22222),
            transfer_amount
        );
        
        // Verify fee was collected (2% of 100000 = 2000)
        let fee_collector_balance = coin::balance<AptosCoin>(fee_collector_addr);
        assert!(fee_collector_balance == 2000, 1);
        
        // Verify receiver got net amount (100000 - 2000 = 98000)
        let receiver_vault = aptsend::get_route_target_vault(b"telegram", u128_to_bytes(22222));
        let receiver_balance = aptsend::get_vault_apt_balance(receiver_vault);
        assert!(receiver_balance == 98000, 2);
        
        // Verify sender's balance decreased by full amount
        let sender_vault = aptsend::get_primary_vault_for_owner(sender_addr);
        let sender_balance = aptsend::get_vault_apt_balance(sender_vault);
        assert!(sender_balance == 500000 - 100000, 3);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, sender = @0x456)]
    fun test_transfer_with_zero_fee(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let sender_addr = signer::address_of(sender);
        
        // Set fee to 0
        aptsend::admin_set_fee(admin, 0);
        
        // Register sender
        aptsend::register_user(admin, sender_addr, b"telegram", u128_to_bytes(11111));
        
        // Fund sender
        let coins = mint_apt(&mint_cap, 1000000);
        coin::register<AptosCoin>(sender);
        coin::deposit(sender_addr, coins);
        aptsend::deposit_to_primary_vault(sender, 500000);
        
        // Execute transfer
        let transfer_amount = 100000;
        aptsend::transfer_within_channel(
            admin,
            b"telegram",
            u128_to_bytes(11111),
            u128_to_bytes(22222),
            transfer_amount
        );
        
        // Verify no fee was deducted
        let receiver_vault = aptsend::get_route_target_vault(b"telegram", u128_to_bytes(22222));
        let receiver_balance = aptsend::get_vault_apt_balance(receiver_vault);
        assert!(receiver_balance == transfer_amount, 1); // Full amount received
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, sender = @0x456)]
    fun test_fa_transfer_with_fee(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer
    ) acquires TestFAStore {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let admin_addr = signer::address_of(admin);
        let sender_addr = signer::address_of(sender);
        
        // Create and add supported FA
        let fa_metadata = create_test_fa(admin);
        aptsend::admin_add_supported_fa(admin, fa_metadata);
        
        // Register sender
        aptsend::register_user(admin, sender_addr, b"telegram", u128_to_bytes(11111));
        
        // Fund sender with FA
        let sender_vault = aptsend::get_primary_vault_for_owner(sender_addr);
        primary_fungible_store::ensure_primary_store_exists(sender_vault, fa_metadata);
        mint_test_fa(admin_addr, fa_metadata, sender_vault, 1000000);
        
        // Execute FA transfer
        let transfer_amount = 100000;
        aptsend::transfer_fa_within_channel(
            admin,
            b"telegram",
            u128_to_bytes(11111),
            u128_to_bytes(22222),
            fa_metadata,
            transfer_amount
        );
        
        // Verify receiver got net amount (98000 with 2% fee)
        let receiver_vault = aptsend::get_route_target_vault(b"telegram", u128_to_bytes(22222));
        let receiver_balance = aptsend::get_vault_fa_balance(receiver_vault, fa_metadata);
        assert!(receiver_balance == 98000, 1);
        
        // Verify fee receiver got fee (2000)
        let (_, fee_receiver) = aptsend::get_fee_config();
        let fee_balance = aptsend::get_vault_fa_balance(fee_receiver, fa_metadata);
        assert!(fee_balance == 2000, 2);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, sender = @0x456)]
    fun test_cross_channel_transfer_with_fee(
        aptos_framework: &signer,
        admin: &signer,
        sender: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let sender_addr = signer::address_of(sender);
        
        // Set fee to 3%
        aptsend::admin_set_fee(admin, 300);
        
        // Register sender with telegram
        aptsend::register_user(admin, sender_addr, b"telegram", u128_to_bytes(11111));
        
        // Fund sender
        let coins = mint_apt(&mint_cap, 1000000);
        coin::register<AptosCoin>(sender);
        coin::deposit(sender_addr, coins);
        aptsend::deposit_to_primary_vault(sender, 500000);
        
        // Transfer from telegram to discord
        let transfer_amount = 50000;
        aptsend::process_transfer(
            admin,
            b"telegram",
            u128_to_bytes(11111),
            b"discord",
            u128_to_bytes(99999),
            transfer_amount
        );
        
        // Verify discord user received net amount (50000 - 1500 = 48500)
        let discord_vault = aptsend::get_route_target_vault(b"discord", u128_to_bytes(99999));
        let discord_balance = aptsend::get_vault_apt_balance(discord_vault);
        assert!(discord_balance == 48500, 1);
        
        // Verify fee was collected (1500)
        let (_, fee_receiver) = aptsend::get_fee_config();
        let fee_balance = coin::balance<AptosCoin>(fee_receiver);
        assert!(fee_balance == 1500, 2);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, unauthorized = @0x999)]
    #[expected_failure(abort_code = 1, location = aptsend_addr::aptsend)] // E_ADMIN_ONLY
    fun test_unauthorized_set_fee_fails(
        aptos_framework: &signer,
        admin: &signer,
        unauthorized: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        // Non-admin tries to set fee - should fail
        aptsend::admin_set_fee(unauthorized, 500);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, unauthorized = @0x999)]
    #[expected_failure(abort_code = 1, location = aptsend_addr::aptsend)] // E_ADMIN_ONLY
    fun test_unauthorized_set_fee_receiver_fails(
        aptos_framework: &signer,
        admin: &signer,
        unauthorized: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        // Non-admin tries to set fee receiver - should fail
        aptsend::admin_set_fee_receiver(unauthorized, @0xFEE);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    // ======================== Unsync User Tests ========================

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    fun test_unsync_user_removes_route(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        
        // Register user with telegram
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(11111));
        
        // Sync user with discord
        aptsend::sync_user(admin, user_addr, b"discord", u128_to_bytes(22222));
        
        // Verify both routes exist
        let telegram_vault = aptsend::get_route_target_vault(b"telegram", u128_to_bytes(11111));
        let discord_vault  = aptsend::get_route_target_vault(b"discord", u128_to_bytes(22222));
        let primary_vault  = aptsend::get_primary_vault_for_owner(user_addr);
        assert!(telegram_vault == primary_vault, 1);
        assert!(discord_vault == primary_vault, 2);
        
        // Unsync discord
        aptsend::unsync_user(admin, user_addr, b"discord", u128_to_bytes(22222));
        
        // Verify telegram route still exists
        let telegram_vault_after = aptsend::get_route_target_vault(b"telegram", u128_to_bytes(11111));
        assert!(telegram_vault_after == primary_vault, 3);

        // Verify discord route no longer exists
        let discord_route_exists = aptsend::route_exists(b"discord", u128_to_bytes(22222));
        assert!(!discord_route_exists, 4);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    fun test_unsync_user_updates_profile(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        
        // Register with telegram
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(11111));
        
        // Sync with discord
        aptsend::sync_user(admin, user_addr, b"discord", u128_to_bytes(22222));
        
        // Verify discord ID is in profile
        let discord_ids = aptsend::get_user_channel_ids(user_addr, b"discord");
        assert!(option::is_some(&discord_ids), 1);
        
        // Unsync discord
        aptsend::unsync_user(admin, user_addr, b"discord", u128_to_bytes(22222));
        
        // Verify discord channel is removed from profile (no IDs left)
        let discord_ids_after = aptsend::get_user_channel_ids(user_addr, b"discord");
        assert!(option::is_none(&discord_ids_after), 2);
        
        // Verify telegram still exists
        let telegram_ids = aptsend::get_user_channel_ids(user_addr, b"telegram");
        assert!(option::is_some(&telegram_ids), 3);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    fun test_unsync_one_of_multiple_channel_ids(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        
        // Register with first telegram ID
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(11111));
        
        // Sync with second telegram ID
        aptsend::sync_user(admin, user_addr, b"telegram", u128_to_bytes(22222));
        
        // Verify both IDs exist
        let telegram_ids = aptsend::get_user_channel_ids(user_addr, b"telegram");
        assert!(option::is_some(&telegram_ids), 1);
        let ids = option::destroy_some(telegram_ids);
        assert!(vector::length(&ids) == 2, 2);
        
        // Unsync second telegram ID
        aptsend::unsync_user(admin, user_addr, b"telegram", u128_to_bytes(22222));
        
        // Verify only first ID remains
        let telegram_ids_after = aptsend::get_user_channel_ids(user_addr, b"telegram");
        assert!(option::is_some(&telegram_ids_after), 3);
        let ids_after = option::destroy_some(telegram_ids_after);
        assert!(vector::length(&ids_after) == 1, 4);
        assert!(*vector::borrow(&ids_after, 0) == u128_to_bytes(11111), 5);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    fun test_unsync_last_channel_identity(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        
        // Register with only telegram
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(11111));
        
        // Verify route exists
        let telegram_vault = aptsend::get_route_target_vault(b"telegram", u128_to_bytes(11111));
        let primary_vault = aptsend::get_primary_vault_for_owner(user_addr);
        assert!(telegram_vault == primary_vault, 1);
        
        // Unsync the only channel - should succeed (user can still use direct vault access)
        aptsend::unsync_user(admin, user_addr, b"telegram", u128_to_bytes(11111));
        
        // Verify primary vault still exists and is accessible
        let vault = aptsend::get_primary_vault_for_owner(user_addr);
        assert!(vault == primary_vault, 2);

        // Verify telegram route no longer exists
        let telegram_route_exists = aptsend::route_exists(b"telegram", u128_to_bytes(11111));
        assert!(!telegram_route_exists, 3);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    #[expected_failure(abort_code = 4, location = aptsend_addr::aptsend)] // E_NOT_REGISTERED
    fun test_unsync_user_not_registered_fails(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        
        // Try to unsync without registering - should fail
        aptsend::unsync_user(admin, user_addr, b"telegram", u128_to_bytes(11111));
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user_a = @0x456, user_b = @0x789)]
    #[expected_failure(abort_code = 7, location = aptsend_addr::aptsend)] // E_UNAUTHORIZED
    fun test_unsync_other_users_channel_fails(
        aptos_framework: &signer,
        admin: &signer,
        user_a: &signer,
        user_b: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_a_addr = signer::address_of(user_a);
        let user_b_addr = signer::address_of(user_b);
        
        // User A registers with telegram
        aptsend::register_user(admin, user_a_addr, b"telegram", u128_to_bytes(11111));
        
        // User B registers with discord
        aptsend::register_user(admin, user_b_addr, b"discord", u128_to_bytes(22222));
        
        // User B tries to unsync User A's telegram - should fail
        aptsend::unsync_user(admin, user_b_addr, b"telegram", u128_to_bytes(11111));
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    fun test_unsync_nonexistent_route_safe(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        
        // Register with telegram
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(11111));
        
        // Try to unsync a channel that was never synced - should not fail
        aptsend::unsync_user(admin, user_addr, b"discord", u128_to_bytes(99999));
        
        // Verify telegram route still exists
        let telegram_vault = aptsend::get_route_target_vault(b"telegram", u128_to_bytes(11111));
        let primary_vault = aptsend::get_primary_vault_for_owner(user_addr);
        assert!(telegram_vault == primary_vault, 1);

        // Verify telegram route still exists
        let telegram_route_exists = aptsend::route_exists(b"telegram", u128_to_bytes(11111));
        assert!(telegram_route_exists, 2);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    #[expected_failure(abort_code = 7, location = aptsend_addr::aptsend)] // E_UNAUTHORIZED
    fun test_unsync_temp_route_fails(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        
        // Register sender
        aptsend::register_user(admin, @0x999, b"telegram", u128_to_bytes(11111));
        let coins = mint_apt(&mint_cap, 1000000);
        account::create_account_for_test(@0x999);
        coin::register<AptosCoin>(&account::create_signer_for_test(@0x999));
        coin::deposit(@0x999, coins);
        aptsend::deposit_to_primary_vault(&account::create_signer_for_test(@0x999), 500000);
        
        // Send to unregistered user (creates temp route)
        aptsend::transfer_within_channel(
            admin,
            b"telegram",
            u128_to_bytes(11111),
            u128_to_bytes(22222),
            100000
        );
        
        // Verify temp route was created
        let telegram_vault_status = aptsend::get_route_status(b"telegram", u128_to_bytes(22222));
        assert!(telegram_vault_status == 0, 1); // ROUTE_STATUS_TEMP
        
        // Register user with different channel
        aptsend::register_user(admin, user_addr, b"discord", u128_to_bytes(33333));
        
        // User tries to unsync the temp route - should fail (not their route)
        aptsend::unsync_user(admin, user_addr, b"telegram", u128_to_bytes(22222));
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456, unauthorized = @0x999)]
    #[expected_failure(abort_code = 7, location = aptsend_addr::aptsend)] // E_UNAUTHORIZED
    fun test_unsync_user_unauthorized_service_fails(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer,
        unauthorized: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        
        // Register user
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(11111));
        
        // Unauthorized signer tries to unsync - should fail
        aptsend::unsync_user(unauthorized, user_addr, b"telegram", u128_to_bytes(11111));
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr)]
    #[expected_failure(abort_code = 2, location = aptsend_addr::aptsend)] // E_PAUSED
    fun test_unsync_user_fails_when_paused(
        aptos_framework: &signer,
        admin: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        // Register user first
        aptsend::register_user(admin, @0x456, b"telegram", u128_to_bytes(11111));
        
        // Pause the contract
        aptsend::admin_set_paused(admin, true);
        
        // Try to unsync - should fail
        aptsend::unsync_user(admin, @0x456, b"telegram", u128_to_bytes(11111));
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456)]
    fun test_unsync_then_resync_same_channel(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        
        // Register with telegram
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(11111));
        let primary_vault = aptsend::get_primary_vault_for_owner(user_addr);
        
        // Unsync telegram
        aptsend::unsync_user(admin, user_addr, b"telegram", u128_to_bytes(11111));
        
        // Resync with same telegram ID
        aptsend::sync_user(admin, user_addr, b"telegram", u128_to_bytes(11111));
        
        // Verify route is back and points to same primary vault
        let telegram_vault        = aptsend::get_route_target_vault(b"telegram", u128_to_bytes(11111));
        let telegram_vault_status = aptsend::get_route_status(b"telegram", u128_to_bytes(11111));
        assert!(telegram_vault == primary_vault, 1);
        assert!(telegram_vault_status == 1, 2); // ROUTE_STATUS_LINKED
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @aptsend_addr, user = @0x456, sender = @0x999)]
    fun test_unsync_does_not_affect_vault_balance(
        aptos_framework: &signer,
        admin: &signer,
        user: &signer,
        sender: &signer
    ) {
        let (burn_cap, mint_cap) = setup_test(aptos_framework, admin);
        
        let user_addr = signer::address_of(user);
        let sender_addr = signer::address_of(sender);
        
        // Register user and sender
        aptsend::register_user(admin, user_addr, b"telegram", u128_to_bytes(11111));
        aptsend::register_user(admin, sender_addr, b"telegram", u128_to_bytes(22222));
        
        // Fund user's vault
        let coins = mint_apt(&mint_cap, 1000000);
        coin::register<AptosCoin>(user);
        coin::deposit(user_addr, coins);
        aptsend::deposit_to_primary_vault(user, 500000);
        
        let primary_vault = aptsend::get_primary_vault_for_owner(user_addr);
        let balance_before = aptsend::get_vault_apt_balance(primary_vault);
        
        // Unsync telegram
        aptsend::unsync_user(admin, user_addr, b"telegram", u128_to_bytes(11111));
        
        // Verify vault balance unchanged
        let balance_after = aptsend::get_vault_apt_balance(primary_vault);
        assert!(balance_after == balance_before, 1);
        assert!(balance_after == 500000, 2);
        
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }
}