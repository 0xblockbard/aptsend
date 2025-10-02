module aptsend_addr::aptsend {

    use std::option;
    use std::vector;
    use std::bcs;
    use std::signer;

    use aptos_std::smart_table::{Self, SmartTable};
    use aptos_std::table;

    use aptos_framework::ordered_map::{Self, OrderedMap};

    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::fungible_asset::{Self, Metadata};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_framework::object::{Self, Object};

    // ======================== Constants ========================

    const APP_OBJECT_SEED: vector<u8> = b"APTSEND_V1";
    
    const ROUTE_STATUS_TEMP: u8   = 0;
    const ROUTE_STATUS_LINKED: u8 = 1;

    // ======================== Errors ========================

    const E_ADMIN_ONLY: u64                      = 1;
    const E_PAUSED: u64                          = 2;
    const E_ALREADY_REGISTERED: u64              = 3;
    const E_NOT_REGISTERED: u64                  = 4;
    const E_CAPABILITY_NOT_FOUND: u64            = 5;
    const E_ROUTE_CONFLICT_ALREADY_LINKED: u64   = 6;
    const E_UNAUTHORIZED: u64                    = 7;
    const E_INSUFFICIENT_BALANCE: u64            = 8;
    const E_UNSUPPORTED_FA: u64                  = 10;
    const E_INVALID_FEE: u64                     = 11;

    // ======================== Events ========================

    #[event]
    struct UserRegisteredEvent has drop, store {
        owner: address,
        primary_vault: address,
        channel: vector<u8>,           
        channel_user_id: vector<u8>,         
        registered_at_seconds: u64,
    }

    #[event]
    struct UserSyncedEvent has drop, store {
        owner: address,
        primary_vault: address,
        temp_vault: address,
        channel: vector<u8>,           
        channel_user_id: vector<u8>,         
        synced_at_seconds: u64,
    }

    #[event]
    struct UserUnsyncedEvent has drop, store {
        owner: address,
        primary_vault: address,
        channel: vector<u8>,
        channel_user_id: vector<u8>,
        unsynced_at_seconds: u64,
    }

    #[event]
    struct RouteLinkedEvent has drop, store {
        channel: vector<u8>,           
        external_id: vector<u8>,
        target_vault: address,
        linked_at_seconds: u64,
    }

    #[event]
    struct TempVaultCreatedEvent has drop, store {
        channel: vector<u8>,
        external_id: vector<u8>,
        temp_vault: address,
        created_at_seconds: u64,
    }

    #[event]
    struct VaultSweptEvent has drop, store {
        from_vault: address,
        to_vault: address,
        amount_apt: u64,
        swept_at_seconds: u64,
    }

    #[event]
    struct TransferEvent has drop, store {
        from_owner: address,
        from_vault: address,
        to_vault_or_address: address,
        amount: u64,
        net_amount: u64,
        fee: u64,
        context_channel: vector<u8>,
        context_external_id: vector<u8>,
        executed_at_seconds: u64,
    }

    #[event]
    struct FATransferEvent has drop, store {
        from_owner: address,
        from_vault: address,
        to_vault_or_address: address,
        amount: u64,
        net_amount: u64,
        fee: u64,
        fa_metadata: Object<Metadata>,
        context_channel: vector<u8>,
        context_external_id: vector<u8>,
        executed_at_seconds: u64,
    }

    // ======================== Structs ========================

    struct Config has key {
        admin: address,
        paused: bool,
        service_signer: address,
        fee: u64,               // 200 for 0.2%
        fee_receiver: address,  // Address that receives fees
        supported_fas: vector<Object<Metadata>>,
    }

    struct Route has copy, drop, store {
        target_vault: address,
        status: u8,
        channel: vector<u8>, 
        created_at_seconds: u64,
    }

    struct VaultDirectory has key {
        owner_to_primary_vault: SmartTable<address, address>,
        vault_to_owner: SmartTable<address, address>,
    }

    struct VaultCapabilityRegistry has key {
        capabilities: table::Table<address, account::SignerCapability>,
    }

    struct VaultCapabilityTemp has key {
        capability: account::SignerCapability
    }

    struct SocialKey has copy, drop, store {
        channel: vector<u8>,
        user_id: vector<u8>,
    }

    struct SocialDirectory has key {
        social_routes: SmartTable<SocialKey, Route>,
    }

    struct UserProfile has copy, drop, store {
        owner: address,
        primary_vault: address,
        channel_identities: OrderedMap<vector<u8>, vector<vector<u8>>>,
        registered_at_seconds: u64,
    }

    struct UserProfileDirectory has key {
        profiles: SmartTable<address, UserProfile>,
    }

    struct AptSendSigner has key {
        extend_ref: object::ExtendRef,
    }

    // ======================== Init ========================

    fun init_module(admin: &signer) {
        let admin_address = signer::address_of(admin);
        
        let constructor_ref = object::create_named_object(admin, APP_OBJECT_SEED);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let aptsend_signer = object::generate_signer(&constructor_ref);
        
        move_to(&aptsend_signer, AptSendSigner { extend_ref });

        move_to(admin, Config { 
            admin: admin_address, 
            paused: false,
            service_signer: admin_address,
            fee: 200,
            fee_receiver: admin_address,
            supported_fas: vector::empty<Object<Metadata>>(),
        });

        move_to(admin, VaultDirectory {
            owner_to_primary_vault: smart_table::new<address, address>(),
            vault_to_owner: smart_table::new<address, address>(),
        });

        move_to(admin, SocialDirectory {
            social_routes: smart_table::new<SocialKey, Route>(),
        });

        move_to(admin, UserProfileDirectory {
            profiles: smart_table::new<address, UserProfile>(),
        });

        move_to(admin, VaultCapabilityRegistry {
            capabilities: table::new<address, account::SignerCapability>(),
        });
    }

    // ======================== Admin Write functions ========================

    public entry fun admin_set_paused(admin: &signer, paused: bool) acquires Config {
        let config = borrow_global_mut<Config>(module_addr());
        assert!(signer::address_of(admin) == config.admin, E_ADMIN_ONLY);
        config.paused = paused;
    }

    public entry fun admin_set_service_signer(admin: &signer, service_signer: address) acquires Config {
        let config = borrow_global_mut<Config>(module_addr());
        assert!(signer::address_of(admin) == config.admin, E_ADMIN_ONLY);
        config.service_signer = service_signer;
    }

    public entry fun admin_set_fee(admin: &signer, fee: u64) acquires Config {
        let config = borrow_global_mut<Config>(module_addr());
        assert!(signer::address_of(admin) == config.admin, E_ADMIN_ONLY);
        assert!(fee <= 1000, E_INVALID_FEE);
        
        config.fee = fee;
    }

    public entry fun admin_set_fee_receiver(admin: &signer, fee_receiver: address) acquires Config {
        let config = borrow_global_mut<Config>(module_addr());
        assert!(signer::address_of(admin) == config.admin, E_ADMIN_ONLY);
        
        config.fee_receiver = fee_receiver;
    }

    public entry fun admin_add_supported_fa(admin: &signer, fa_metadata: Object<Metadata>) acquires Config {
        let config = borrow_global_mut<Config>(module_addr());
        assert!(signer::address_of(admin) == config.admin, E_ADMIN_ONLY);
        
        // Check if FA is already in the list
        if (!vector::contains(&config.supported_fas, &fa_metadata)) {
            vector::push_back(&mut config.supported_fas, fa_metadata);
        };
    }

    public entry fun admin_remove_supported_fa(admin: &signer, fa_metadata: Object<Metadata>) acquires Config {
        let config = borrow_global_mut<Config>(module_addr());
        assert!(signer::address_of(admin) == config.admin, E_ADMIN_ONLY);
        
        let (found, index) = vector::index_of(&config.supported_fas, &fa_metadata);
        if (found) {
            vector::remove(&mut config.supported_fas, index);
        };
    }

    // ======================== Protected Write functions (Service) ========================

    public entry fun register_user(
        service_signer: &signer,
        user_address: address,
        channel: vector<u8>,
        channel_user_id: vector<u8>
    ) acquires Config, VaultDirectory, SocialDirectory, VaultCapabilityRegistry, VaultCapabilityTemp, UserProfileDirectory, AptSendSigner {

        assert_service_signer(signer::address_of(service_signer));

        let config = borrow_global<Config>(module_addr());
        assert!(!config.paused, E_PAUSED);

        let vault_directory = borrow_global_mut<VaultDirectory>(module_addr());
        assert!(
            !smart_table::contains(&vault_directory.owner_to_primary_vault, user_address),
            E_ALREADY_REGISTERED
        );

        let primary_vault_address = create_primary_vault_for_user(user_address);
        smart_table::add(&mut vault_directory.owner_to_primary_vault, user_address, primary_vault_address);
        smart_table::add(&mut vault_directory.vault_to_owner, primary_vault_address, user_address);

        let social_directory = borrow_global_mut<SocialDirectory>(module_addr());
        let social_key = SocialKey { channel, user_id: channel_user_id };

        if (smart_table::contains(&social_directory.social_routes, social_key)) {

            let existing_route = *smart_table::borrow(&social_directory.social_routes, social_key);

            if (existing_route.status == ROUTE_STATUS_LINKED) {
                let vault_directory_view = borrow_global<VaultDirectory>(module_addr());
                if (smart_table::contains(&vault_directory_view.vault_to_owner, existing_route.target_vault)) {
                    let route_owner = *smart_table::borrow(&vault_directory_view.vault_to_owner, existing_route.target_vault);
                    assert!(route_owner == user_address, E_ROUTE_CONFLICT_ALREADY_LINKED);
                }
            };

            if (existing_route.status == ROUTE_STATUS_TEMP) {
                sweep_all_from_vault(existing_route.target_vault, primary_vault_address);
            };

            upsert_social_route_to_primary(social_directory, social_key, channel, channel_user_id, primary_vault_address);
        } else {
            upsert_social_route_to_primary(social_directory, social_key, channel, channel_user_id, primary_vault_address);
        };

        let profile_dir = borrow_global_mut<UserProfileDirectory>(module_addr());
        let channel_identities = ordered_map::new<vector<u8>, vector<vector<u8>>>();
        let user_ids = vector::empty<vector<u8>>();
        vector::push_back(&mut user_ids, channel_user_id);
        ordered_map::add(&mut channel_identities, channel, user_ids);

        let profile = UserProfile {
            owner: user_address,
            primary_vault: primary_vault_address,
            channel_identities,
            registered_at_seconds: timestamp::now_seconds(),
        };

        smart_table::add(&mut profile_dir.profiles, user_address, profile);

        event::emit(UserRegisteredEvent {
            owner: user_address,
            primary_vault: primary_vault_address,
            channel,
            channel_user_id,
            registered_at_seconds: timestamp::now_seconds(),
        })
    }

    public entry fun sync_user(
        service_signer: &signer,
        user_address: address,
        channel: vector<u8>,
        channel_user_id: vector<u8>
    ) acquires Config, VaultDirectory, SocialDirectory, VaultCapabilityRegistry, VaultCapabilityTemp, UserProfileDirectory {

        assert_service_signer(signer::address_of(service_signer));

        let config = borrow_global<Config>(module_addr());
        assert!(!config.paused, E_PAUSED);

        let vault_directory_view = borrow_global<VaultDirectory>(module_addr());
        assert!(
            smart_table::contains(&vault_directory_view.owner_to_primary_vault, user_address),
            E_NOT_REGISTERED
        );
        let user_primary_vault_address = *smart_table::borrow(&vault_directory_view.owner_to_primary_vault, user_address);

        let social_directory = borrow_global_mut<SocialDirectory>(module_addr());
        let social_key = SocialKey { channel, user_id: channel_user_id };

        let temp_vault_address = @0x0;

        if (smart_table::contains(&social_directory.social_routes, social_key)) {

            let existing_route = *smart_table::borrow(&social_directory.social_routes, social_key);

            if (existing_route.status == ROUTE_STATUS_LINKED) {

                if (smart_table::contains(&vault_directory_view.vault_to_owner, existing_route.target_vault)) {

                    let route_owner = *smart_table::borrow(&vault_directory_view.vault_to_owner, existing_route.target_vault);

                    if (route_owner == user_address && existing_route.target_vault == user_primary_vault_address) {
                        return
                    };

                    assert!(false, E_ROUTE_CONFLICT_ALREADY_LINKED);
                }
            };

            if (existing_route.status == ROUTE_STATUS_TEMP) {
                temp_vault_address = existing_route.target_vault;
                sweep_all_from_vault(existing_route.target_vault, user_primary_vault_address);
            };

            upsert_social_route_to_primary(social_directory, social_key, channel, channel_user_id, user_primary_vault_address);

        } else {
            upsert_social_route_to_primary(social_directory, social_key, channel, channel_user_id, user_primary_vault_address);
        };

        let profile_dir = borrow_global_mut<UserProfileDirectory>(module_addr());
        if (smart_table::contains(&profile_dir.profiles, user_address)) {
            let profile = smart_table::borrow_mut(&mut profile_dir.profiles, user_address);

            if (ordered_map::contains(&profile.channel_identities, &channel)) {
                let user_ids = ordered_map::borrow_mut(&mut profile.channel_identities, &channel);
                if (!vector::contains(user_ids, &channel_user_id)) {
                    vector::push_back(user_ids, channel_user_id);
                };
            } else {
                let user_ids = vector::empty<vector<u8>>();
                vector::push_back(&mut user_ids, channel_user_id);
                ordered_map::add(&mut profile.channel_identities, channel, user_ids);
            };
        };

        event::emit(UserSyncedEvent {
            owner: user_address,
            primary_vault: user_primary_vault_address,
            temp_vault: temp_vault_address,
            channel,
            channel_user_id,
            synced_at_seconds: timestamp::now_seconds(),
        })
    }

    public entry fun unsync_user(
        service_signer: &signer,
        user_address: address,
        channel: vector<u8>,
        channel_user_id: vector<u8>
    ) acquires Config, VaultDirectory, SocialDirectory, UserProfileDirectory {
        
        assert_service_signer(signer::address_of(service_signer));
        
        let config = borrow_global<Config>(module_addr());
        assert!(!config.paused, E_PAUSED);
        
        // Verify user is registered
        let vault_directory = borrow_global<VaultDirectory>(module_addr());
        assert!(
            smart_table::contains(&vault_directory.owner_to_primary_vault, user_address),
            E_NOT_REGISTERED
        );
        let user_primary_vault = *smart_table::borrow(&vault_directory.owner_to_primary_vault, user_address);
        
        // Check if route exists and belongs to this user
        let social_directory = borrow_global_mut<SocialDirectory>(module_addr());
        let social_key = SocialKey { channel, user_id: channel_user_id };
        
        if (smart_table::contains(&social_directory.social_routes, social_key)) {
            let route = smart_table::borrow(&social_directory.social_routes, social_key);
            
            // Only allow unsyncing if route is linked to this user's primary vault
            assert!(
                route.status == ROUTE_STATUS_LINKED && route.target_vault == user_primary_vault,
                E_UNAUTHORIZED
            );
            
            // Remove the route
            smart_table::remove(&mut social_directory.social_routes, social_key);
        };
        
        // Update user profile - remove this channel_user_id
        let profile_dir = borrow_global_mut<UserProfileDirectory>(module_addr());
        if (smart_table::contains(&profile_dir.profiles, user_address)) {
            let profile = smart_table::borrow_mut(&mut profile_dir.profiles, user_address);
            
            if (ordered_map::contains(&profile.channel_identities, &channel)) {
                let user_ids = ordered_map::borrow_mut(&mut profile.channel_identities, &channel);
                let (found, index) = vector::index_of(user_ids, &channel_user_id);
                if (found) {
                    vector::remove(user_ids, index);
                    
                    // If no more user_ids for this channel, remove the channel entry
                    if (vector::is_empty(user_ids)) {
                        ordered_map::remove(&mut profile.channel_identities, &channel);
                    };
                };
            };
        };
        
        event::emit(UserUnsyncedEvent {
            owner: user_address,
            primary_vault: user_primary_vault,
            channel,
            channel_user_id,
            unsynced_at_seconds: timestamp::now_seconds(),
        })
    }

    // AptosCoin transfer - no generic type needed
    public entry fun process_transfer(
        service_signer: &signer,
        from_channel: vector<u8>,
        from_user_id: vector<u8>,
        to_channel: vector<u8>,
        to_user_id: vector<u8>,
        amount: u64
    ) acquires Config, VaultDirectory, SocialDirectory, VaultCapabilityRegistry, VaultCapabilityTemp, AptSendSigner {
        
        assert_service_signer(signer::address_of(service_signer));

        let config = borrow_global<Config>(module_addr());
        assert!(!config.paused, E_PAUSED);

        let from_social_key = SocialKey { channel: from_channel, user_id: from_user_id };
        let social_directory = borrow_global<SocialDirectory>(module_addr());
        assert!(smart_table::contains(&social_directory.social_routes, from_social_key), E_NOT_REGISTERED);
        let from_route = smart_table::borrow(&social_directory.social_routes, from_social_key);
        let sender_vault = from_route.target_vault;

        assert!(coin::balance<AptosCoin>(sender_vault) >= amount, E_INSUFFICIENT_BALANCE);

        let vault_directory = borrow_global<VaultDirectory>(module_addr());
        let sender_owner = if (smart_table::contains(&vault_directory.vault_to_owner, sender_vault)) {
            *smart_table::borrow(&vault_directory.vault_to_owner, sender_vault)
        } else {
            @0x0
        };

        // Calculate fee and net amount
        let (fee_amount, net_amount) = calculate_fee_and_net_amount(amount, config);

        let recipient_vault = get_or_create_social_route_and_vault(to_channel, to_user_id);

        transfer_apt_from_vault(sender_vault, recipient_vault, net_amount);

        // Transfer fee to fee receiver (if fee > 0)
        if (fee_amount > 0) {
            transfer_apt_from_vault(sender_vault, config.fee_receiver, fee_amount);
        };

        event::emit(TransferEvent {
            from_owner: sender_owner, 
            from_vault: sender_vault, 
            to_vault_or_address: recipient_vault, 
            amount,
            net_amount,
            fee: fee_amount,
            context_channel: from_channel,
            context_external_id: from_user_id,
            executed_at_seconds: timestamp::now_seconds(),
        })
    }

    public entry fun transfer_within_channel(
        service_signer: &signer,
        channel: vector<u8>,
        from_user_id: vector<u8>,
        to_user_id: vector<u8>,
        amount: u64
    ) acquires Config, VaultDirectory, SocialDirectory, VaultCapabilityRegistry, VaultCapabilityTemp, AptSendSigner {
        process_transfer(
            service_signer,
            channel,
            from_user_id,
            channel,
            to_user_id,
            amount
        );
    }

    public entry fun process_fa_transfer(
        service_signer: &signer,
        from_channel: vector<u8>,
        from_user_id: vector<u8>,
        to_channel: vector<u8>,
        to_user_id: vector<u8>,
        fa_metadata: Object<Metadata>,
        amount: u64
    ) acquires Config, VaultDirectory, SocialDirectory, VaultCapabilityRegistry, VaultCapabilityTemp, AptSendSigner {
        
        assert_service_signer(signer::address_of(service_signer));

        let config = borrow_global<Config>(module_addr());
        assert!(!config.paused, E_PAUSED);

        assert_fa_supported(fa_metadata, config);

        let from_social_key = SocialKey { channel: from_channel, user_id: from_user_id };
        let social_directory = borrow_global<SocialDirectory>(module_addr());
        assert!(smart_table::contains(&social_directory.social_routes, from_social_key), E_NOT_REGISTERED);
        let from_route = smart_table::borrow(&social_directory.social_routes, from_social_key);
        let sender_vault = from_route.target_vault;

        // Check if primary store exists and has sufficient balance
        if (!primary_fungible_store::primary_store_exists(sender_vault, fa_metadata)) {
            abort E_INSUFFICIENT_BALANCE
        };
        
        let sender_store = primary_fungible_store::primary_store(sender_vault, fa_metadata);
        assert!(fungible_asset::balance(sender_store) >= amount, E_INSUFFICIENT_BALANCE);

        let vault_directory = borrow_global<VaultDirectory>(module_addr());
        let sender_owner = if (smart_table::contains(&vault_directory.vault_to_owner, sender_vault)) {
            *smart_table::borrow(&vault_directory.vault_to_owner, sender_vault)
        } else {
            @0x0
        };

        // Calculate fee and net amount
        let (fee_amount, net_amount) = calculate_fee_and_net_amount(amount, config);

        let recipient_vault = get_or_create_social_route_and_vault_for_fa(to_channel, to_user_id, fa_metadata);

        // Ensure recipient can receive this FA
        if (!primary_fungible_store::primary_store_exists(recipient_vault, fa_metadata)) {
            primary_fungible_store::ensure_primary_store_exists(recipient_vault, fa_metadata);
        };

        transfer_fa_from_vault(sender_vault, recipient_vault, fa_metadata, net_amount);
        
        // Transfer fee to fee receiver (if fee > 0)
        if (fee_amount > 0) {
            // Ensure fee_receiver can receive this FA
            if (!primary_fungible_store::primary_store_exists(config.fee_receiver, fa_metadata)) {
                primary_fungible_store::ensure_primary_store_exists(config.fee_receiver, fa_metadata);
            };
            transfer_fa_from_vault(sender_vault, config.fee_receiver, fa_metadata, fee_amount);
        };
        
        event::emit(FATransferEvent {
            from_owner: sender_owner, 
            from_vault: sender_vault, 
            to_vault_or_address: recipient_vault, 
            amount,
            net_amount,
            fee: fee_amount,
            fa_metadata,
            context_channel: from_channel,
            context_external_id: from_user_id,
            executed_at_seconds: timestamp::now_seconds(),
        })
    }

    public entry fun transfer_fa_within_channel(
        service_signer: &signer,
        channel: vector<u8>,
        from_user_id: vector<u8>,
        to_user_id: vector<u8>,
        fa_metadata: Object<Metadata>,
        amount: u64
    ) acquires Config, VaultDirectory, SocialDirectory, VaultCapabilityRegistry, VaultCapabilityTemp, AptSendSigner {
        process_fa_transfer(
            service_signer,
            channel,
            from_user_id,
            channel,
            to_user_id,
            fa_metadata,
            amount
        );
    }

    // ======================== Public Write functions ========================

    public entry fun deposit_to_primary_vault(
        user_signer: &signer,
        amount: u64
    ) acquires VaultDirectory {
        let owner = signer::address_of(user_signer);
        let primary_vault = get_primary_vault_for_owner(owner);
        coin::transfer<AptosCoin>(user_signer, primary_vault, amount);
    }

    public entry fun withdraw_from_primary_vault(
        user_signer: &signer,
        to_address: address,
        amount: u64
    ) acquires VaultDirectory, VaultCapabilityTemp, VaultCapabilityRegistry {
        let owner = signer::address_of(user_signer);
        let primary_vault = get_primary_vault_for_owner(owner);
        transfer_apt_from_vault(primary_vault, to_address, amount);
    }

    public entry fun deposit_fa_to_primary_vault(
        user_signer: &signer,
        fa_metadata: Object<Metadata>,
        amount: u64
    ) acquires VaultDirectory {
        let owner = signer::address_of(user_signer);
        let primary_vault = get_primary_vault_for_owner(owner);
        primary_fungible_store::transfer(user_signer, fa_metadata, primary_vault, amount);
    }

    public entry fun withdraw_fa_from_primary_vault(
        user_signer: &signer,
        fa_metadata: Object<Metadata>,
        to_address: address,
        amount: u64
    ) acquires VaultDirectory, VaultCapabilityTemp, VaultCapabilityRegistry {
        let owner = signer::address_of(user_signer);
        let primary_vault = get_primary_vault_for_owner(owner);
        transfer_fa_from_vault(primary_vault, to_address, fa_metadata, amount);
    }

    public entry fun send_from_primary_vault(
        user_signer: &signer,
        to_channel: vector<u8>,
        to_user_id: vector<u8>,
        amount: u64
    ) acquires Config, VaultDirectory, SocialDirectory, VaultCapabilityRegistry, VaultCapabilityTemp, AptSendSigner {
        
        let config = borrow_global<Config>(module_addr());
        assert!(!config.paused, E_PAUSED);
        
        let owner = signer::address_of(user_signer);
        let vault_directory = borrow_global<VaultDirectory>(module_addr());
        assert!(
            smart_table::contains(&vault_directory.owner_to_primary_vault, owner),
            E_NOT_REGISTERED
        );
        
        let sender_vault = *smart_table::borrow(&vault_directory.owner_to_primary_vault, owner);
        assert!(coin::balance<AptosCoin>(sender_vault) >= amount, E_INSUFFICIENT_BALANCE);
        
        // Calculate fee and net amount
        let (fee_amount, net_amount) = calculate_fee_and_net_amount(amount, config);
        
        let recipient_vault = get_or_create_social_route_and_vault(to_channel, to_user_id);
        
        transfer_apt_from_vault(sender_vault, recipient_vault, net_amount);
        
        // Transfer fee to fee receiver (if fee > 0)
        if (fee_amount > 0) {
            transfer_apt_from_vault(sender_vault, config.fee_receiver, fee_amount);
        };
        
        event::emit(TransferEvent {
            from_owner: owner, 
            from_vault: sender_vault, 
            to_vault_or_address: recipient_vault, 
            amount,
            net_amount,
            fee: fee_amount,
            context_channel: to_channel,
            context_external_id: to_user_id,
            executed_at_seconds: timestamp::now_seconds(),
        })
    }

    public entry fun send_fa_from_primary_vault(
        user_signer: &signer,
        to_channel: vector<u8>,
        to_user_id: vector<u8>,
        fa_metadata: Object<Metadata>,
        amount: u64
    ) acquires Config, VaultDirectory, SocialDirectory, VaultCapabilityRegistry, VaultCapabilityTemp, AptSendSigner {
        
        let config = borrow_global<Config>(module_addr());
        assert!(!config.paused, E_PAUSED);
        assert_fa_supported(fa_metadata, config);
        
        let owner = signer::address_of(user_signer);
        let vault_directory = borrow_global<VaultDirectory>(module_addr());
        assert!(
            smart_table::contains(&vault_directory.owner_to_primary_vault, owner),
            E_NOT_REGISTERED
        );
        
        let sender_vault = *smart_table::borrow(&vault_directory.owner_to_primary_vault, owner);

        // Check if primary store exists and has sufficient balance
        if (!primary_fungible_store::primary_store_exists(sender_vault, fa_metadata)) {
            abort E_INSUFFICIENT_BALANCE
        };
        
        let sender_store = primary_fungible_store::primary_store(sender_vault, fa_metadata);
        assert!(fungible_asset::balance(sender_store) >= amount, E_INSUFFICIENT_BALANCE);
        
        let (fee_amount, net_amount) = calculate_fee_and_net_amount(amount, config);
        
        let recipient_vault = get_or_create_social_route_and_vault_for_fa(to_channel, to_user_id, fa_metadata);
        
        if (!primary_fungible_store::primary_store_exists(recipient_vault, fa_metadata)) {
            primary_fungible_store::ensure_primary_store_exists(recipient_vault, fa_metadata);
        };
        
        transfer_fa_from_vault(sender_vault, recipient_vault, fa_metadata, net_amount);
        
        if (fee_amount > 0) {
            if (!primary_fungible_store::primary_store_exists(config.fee_receiver, fa_metadata)) {
                primary_fungible_store::ensure_primary_store_exists(config.fee_receiver, fa_metadata);
            };
            transfer_fa_from_vault(sender_vault, config.fee_receiver, fa_metadata, fee_amount);
        };
        
        event::emit(FATransferEvent {
            from_owner: owner, 
            from_vault: sender_vault, 
            to_vault_or_address: recipient_vault, 
            amount,
            net_amount,
            fee: fee_amount,
            fa_metadata,
            context_channel: to_channel,
            context_external_id: to_user_id,
            executed_at_seconds: timestamp::now_seconds(),
        })
    }

    // ======================== Read (View) functions ========================

    #[view]
    public fun get_fee_config(): (u64, address) acquires Config {
        let config = borrow_global<Config>(module_addr());
        (config.fee, config.fee_receiver)
    }

    #[view]
    public fun calculate_transfer_amounts(amount: u64): (u64, u64) acquires Config {
        let config = borrow_global<Config>(module_addr());
        calculate_fee_and_net_amount(amount, config)
    }

    #[view]
    public fun get_primary_vault_for_owner(owner: address): address acquires VaultDirectory {
        let vault_directory = borrow_global<VaultDirectory>(module_addr());
        assert!(smart_table::contains(&vault_directory.owner_to_primary_vault, owner), E_NOT_REGISTERED);
        *smart_table::borrow(&vault_directory.owner_to_primary_vault, owner)
    }

    #[view]
    public fun get_vault_apt_balance(vault_address: address): u64 {
        coin::balance<AptosCoin>(vault_address)
    }

    #[view]
    public fun get_vault_fa_balance(vault_address: address, fa_metadata: Object<Metadata>): u64 {
        if (!primary_fungible_store::primary_store_exists(vault_address, fa_metadata)) {
            return 0
        };
        let store = primary_fungible_store::primary_store(vault_address, fa_metadata);
        fungible_asset::balance(store)
    }

    #[view]
    public fun get_social_route(channel: vector<u8>, user_id: vector<u8>): Route acquires SocialDirectory {
        let social_directory = borrow_global<SocialDirectory>(module_addr());
        let social_key = SocialKey { channel, user_id };
        *smart_table::borrow(&social_directory.social_routes, social_key)
    }

    #[view]
    public fun get_route_target_vault(channel: vector<u8>, user_id: vector<u8>): address acquires SocialDirectory {
        let route = get_social_route(channel, user_id);
        route.target_vault
    }

    #[view]
    public fun get_route_status(channel: vector<u8>, user_id: vector<u8>): u8 acquires SocialDirectory {
        let route = get_social_route(channel, user_id);
        route.status
    }

    #[view]
    public fun route_exists(channel: vector<u8>, user_id: vector<u8>): bool acquires SocialDirectory {
        let social_directory = borrow_global<SocialDirectory>(module_addr());
        let social_key = SocialKey { channel, user_id };
        smart_table::contains(&social_directory.social_routes, social_key)
    }

    #[view]
    public fun get_user_profile(owner: address): UserProfile acquires UserProfileDirectory {
        let profile_dir = borrow_global<UserProfileDirectory>(module_addr());
        *smart_table::borrow(&profile_dir.profiles, owner)
    }

    #[view]
    public fun get_user_channel_ids(owner: address, channel: vector<u8>): option::Option<vector<vector<u8>>> 
        acquires UserProfileDirectory {
        let profile_dir = borrow_global<UserProfileDirectory>(module_addr());
        if (!smart_table::contains(&profile_dir.profiles, owner)) {
            return option::none()
        };
        let profile = smart_table::borrow(&profile_dir.profiles, owner);
        if (ordered_map::contains(&profile.channel_identities, &channel)) {
            option::some(*ordered_map::borrow(&profile.channel_identities, &channel))
        } else {
            option::none()
        }
    }

    // ======================== Helper functions ========================

    inline fun module_addr(): address { @aptsend_addr }

    fun get_aptsend_signer_address(): address {
        object::create_object_address(&@aptsend_addr, APP_OBJECT_SEED)
    }

    fun get_aptsend_signer(aptsend_signer_address: address): signer acquires AptSendSigner {
        object::generate_signer_for_extending(&borrow_global<AptSendSigner>(aptsend_signer_address).extend_ref)
    }

    fun assert_service_signer(signer_address: address) acquires Config {
        let config = borrow_global<Config>(module_addr());
        assert!(signer_address == config.service_signer, E_UNAUTHORIZED);
    }

    fun assert_fa_supported(fa_metadata: Object<Metadata>, config: &Config) {
        assert!(vector::contains(&config.supported_fas, &fa_metadata), E_UNSUPPORTED_FA);
    }

    fun calculate_fee_and_net_amount(gross_amount: u64, config: &Config): (u64, u64) {
        if (config.fee == 0) {
            return (0, gross_amount)
        };
        
        let fee = (gross_amount * config.fee) / 10000;
        let net_amount = gross_amount - fee;
        
        (fee, net_amount)
    }

    fun upsert_social_route_to_primary(
        social_directory: &mut SocialDirectory,
        social_key: SocialKey,
        channel: vector<u8>,
        external_id: vector<u8>,
        primary_vault: address
    ) {
        let new_route = Route {
            target_vault: primary_vault,
            status: ROUTE_STATUS_LINKED,
            channel,
            created_at_seconds: timestamp::now_seconds(),
        };
        smart_table::upsert(&mut social_directory.social_routes, social_key, new_route);

        event::emit(RouteLinkedEvent {
            channel,
            external_id,
            target_vault: primary_vault,
            linked_at_seconds: timestamp::now_seconds(),
        })
    }

    fun get_or_create_social_route_and_vault(
        channel: vector<u8>,
        external_id: vector<u8>
    ): address acquires SocialDirectory, AptSendSigner {
        let social_directory = borrow_global_mut<SocialDirectory>(module_addr());
        let social_key = SocialKey { channel, user_id: external_id };

        if (smart_table::contains(&social_directory.social_routes, social_key)) {
            let route = smart_table::borrow(&social_directory.social_routes, social_key);
            route.target_vault
        } else {
            let temp_vault = create_temp_vault(channel, external_id);
            let route = Route {
                target_vault: temp_vault,
                status: ROUTE_STATUS_TEMP,
                channel,
                created_at_seconds: timestamp::now_seconds(),
            };
            smart_table::add(&mut social_directory.social_routes, social_key, route);
            
            event::emit(TempVaultCreatedEvent {
                channel,
                external_id,
                temp_vault,
                created_at_seconds: timestamp::now_seconds(),
            });
            
            temp_vault
        }
    }

    fun get_or_create_social_route_and_vault_for_fa(
        channel: vector<u8>,
        external_id: vector<u8>,
        fa_metadata: Object<Metadata>
    ): address acquires SocialDirectory, AptSendSigner {
        let social_directory = borrow_global_mut<SocialDirectory>(module_addr());
        let social_key = SocialKey { channel, user_id: external_id };

        if (smart_table::contains(&social_directory.social_routes, social_key)) {
            let route = smart_table::borrow(&social_directory.social_routes, social_key);
            route.target_vault
        } else {
            let temp_vault = create_temp_vault_for_fa(channel, external_id, fa_metadata);
            let route = Route {
                target_vault: temp_vault,
                status: ROUTE_STATUS_TEMP,
                channel,
                created_at_seconds: timestamp::now_seconds(),
            };
            smart_table::add(&mut social_directory.social_routes, social_key, route);
            
            event::emit(TempVaultCreatedEvent {
                channel,
                external_id,
                temp_vault,
                created_at_seconds: timestamp::now_seconds(),
            });
            
            temp_vault
        }
    }

    fun create_primary_vault_for_user(
        user_address: address
    ): address acquires VaultCapabilityRegistry, AptSendSigner {
        
        let aptsend_signer_address = get_aptsend_signer_address();
        let aptsend_signer = get_aptsend_signer(aptsend_signer_address);
        
        let seed = bcs::to_bytes(&user_address);
        vector::append(&mut seed, b"_primary");
        vector::append(&mut seed, bcs::to_bytes(&timestamp::now_microseconds()));
        
        let (vault_signer, vault_signer_capability) = account::create_resource_account(&aptsend_signer, seed);
        let vault_address = signer::address_of(&vault_signer);
        
        if (!coin::is_account_registered<AptosCoin>(vault_address)) {
            coin::register<AptosCoin>(&vault_signer);
        };
        
        let capability_registry = borrow_global_mut<VaultCapabilityRegistry>(module_addr());
        table::add(&mut capability_registry.capabilities, vault_address, vault_signer_capability);
        
        vault_address
    }

    fun create_temp_vault(
        channel: vector<u8>,
        external_id: vector<u8>
    ): address acquires AptSendSigner {
        let aptsend_signer_address = get_aptsend_signer_address();
        let aptsend_signer = get_aptsend_signer(aptsend_signer_address);
        
        let seed = build_temp_seed(channel, external_id);
        vector::append(&mut seed, bcs::to_bytes(&timestamp::now_microseconds()));
        
        let (vault_signer, vault_signer_capability) = account::create_resource_account(&aptsend_signer, seed);
        let vault_address = signer::address_of(&vault_signer);
        
        if (!coin::is_account_registered<AptosCoin>(vault_address)) {
            coin::register<AptosCoin>(&vault_signer);
        };
        
        move_to(&vault_signer, VaultCapabilityTemp {
            capability: vault_signer_capability
        });
        
        vault_address
    }

    fun create_temp_vault_for_fa(
        channel: vector<u8>,
        external_id: vector<u8>,
        fa_metadata: Object<Metadata>
    ): address acquires AptSendSigner {
        let aptsend_signer_address = get_aptsend_signer_address();
        let aptsend_signer = get_aptsend_signer(aptsend_signer_address);
        
        let seed = build_temp_seed(channel, external_id);
        vector::append(&mut seed, bcs::to_bytes(&timestamp::now_microseconds()));
        
        let (vault_signer, vault_signer_capability) = account::create_resource_account(&aptsend_signer, seed);
        let vault_address = signer::address_of(&vault_signer);
        
        primary_fungible_store::ensure_primary_store_exists(vault_address, fa_metadata);
        
        move_to(&vault_signer, VaultCapabilityTemp {
            capability: vault_signer_capability
        });
        
        vault_address
    }

    fun get_vault_signer(vault_address: address): signer 
        acquires VaultCapabilityRegistry, VaultCapabilityTemp {
        
        let capability_registry = borrow_global<VaultCapabilityRegistry>(module_addr());
        if (table::contains(&capability_registry.capabilities, vault_address)) {
            let vault_capability = table::borrow(&capability_registry.capabilities, vault_address);
            return account::create_signer_with_capability(vault_capability)
        };
        
        assert!(exists<VaultCapabilityTemp>(vault_address), E_CAPABILITY_NOT_FOUND);
        let temp_capability = borrow_global<VaultCapabilityTemp>(vault_address);
        account::create_signer_with_capability(&temp_capability.capability)
    }

    fun sweep_all_from_vault(from_vault: address, to_vault: address) 
        acquires VaultCapabilityRegistry, VaultCapabilityTemp, Config {
        
        let config = borrow_global<Config>(module_addr());
        let vault_signer = get_vault_signer(from_vault);
        
        // Sweep APT
        let apt_balance = coin::balance<AptosCoin>(from_vault);
        if (apt_balance > 0) {
            coin::transfer<AptosCoin>(&vault_signer, to_vault, apt_balance);
            event::emit(VaultSweptEvent {
                from_vault, 
                to_vault, 
                amount_apt: apt_balance, 
                swept_at_seconds: timestamp::now_seconds() 
            });
        };
        
        // Sweep all supported FAs
        let fa_count = vector::length(&config.supported_fas);
        let i = 0;
        while (i < fa_count) {
            let fa_metadata = *vector::borrow(&config.supported_fas, i);
            
            let from_store = primary_fungible_store::primary_store(from_vault, fa_metadata);
            let fa_balance = fungible_asset::balance(from_store);
            
            if (fa_balance > 0) {
                primary_fungible_store::transfer(&vault_signer, fa_metadata, to_vault, fa_balance);
            };
            
            i = i + 1;
        };
    }

    fun transfer_apt_from_vault(from_vault: address, to_address: address, amount: u64)
        acquires VaultCapabilityRegistry, VaultCapabilityTemp {
        
        let vault_signer = get_vault_signer(from_vault);
        coin::transfer<AptosCoin>(&vault_signer, to_address, amount);
    }

    fun transfer_fa_from_vault(
        from_vault: address, 
        to_address: address, 
        fa_metadata: Object<Metadata>,
        amount: u64
    ) acquires VaultCapabilityRegistry, VaultCapabilityTemp {
        
        let vault_signer = get_vault_signer(from_vault);
        primary_fungible_store::transfer(&vault_signer, fa_metadata, to_address, amount);
    }

    fun build_temp_seed(channel: vector<u8>, external_id: vector<u8>): vector<u8> {
        let seed = b"aptsend:temp:";
        vector::append(&mut seed, channel);
        vector::append(&mut seed, b":");
        vector::append(&mut seed, external_id);
        seed
    }

    // ======================== Unit Tests ========================

    #[test_only]
    public fun init_module_for_test(sender: &signer) {
        init_module(sender);
    }

    #[test_only]
    public fun get_user_profile_owner(owner: address): address acquires UserProfileDirectory {
        let profile_directory = borrow_global<UserProfileDirectory>(module_addr());
        let profile = smart_table::borrow(&profile_directory.profiles, owner);
        profile.owner  
    }

}