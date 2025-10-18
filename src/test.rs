#[cfg(test)]
mod test {
    use crate::DigitalIdentityContract;
    use soroban_sdk::{testutils::Address as _, Address, Bytes, Env, String};

    #[test]
    fn test_basic_functionality() {
        let env = Env::default();
        env.mock_all_auths();

        // Generate test addresses
        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        
        // Register the contract and get the contract address
        let contract_address = env.register_contract(None, DigitalIdentityContract);

        // Create a client for the contract - Soroban automatically generates this
        let client = crate::DigitalIdentityContractClient::new(&env, &contract_address);

        // Initialize contract
        client.initialize(&admin);
        
        // Test basic functions
        assert_eq!(client.get_admin(), admin);
        assert_eq!(client.get_total_identities(), 0);

        // Create test data
        let identity_id = String::from_str(&env, "test_user_123");
        let full_name = String::from_str(&env, "Test User");
        let email = String::from_str(&env, "test@example.com");
        let document_hash = Bytes::from_array(&env, &[1, 2, 3, 4, 5, 6, 7, 8]);

        // Register identity
        let register_result = client.register_identity(
            &identity_id,
            &user,
            &full_name,
            &email,
            &document_hash,
        );

        assert!(register_result);
        assert_eq!(client.get_total_identities(), 1);

        // Get identity data
        let identity_data = client.get_identity(&identity_id, &user);
        
        assert!(identity_data.is_some());
        let data = identity_data.unwrap();
        assert_eq!(data.owner, user);
        assert_eq!(data.full_name, full_name);
        assert_eq!(data.verification_level, 0);
        assert!(data.is_active);

        // Test verification by admin
        let verify_result = client.verify_identity(&identity_id, &2);
        assert!(verify_result);

        // Check verification level updated
        let updated_identity = client.get_identity(&identity_id, &user).unwrap();
        assert_eq!(updated_identity.verification_level, 2);

        // Test access control
        let other_user = Address::generate(&env);
        
        // Other user should not have access initially
        let no_access = client.get_identity(&identity_id, &other_user);
        assert!(no_access.is_none());

        // Grant access
        let grant_result = client.grant_access(&identity_id, &other_user, &1, &3600);
        assert!(grant_result);

        // Now other user should have access
        let with_access = client.get_identity(&identity_id, &other_user);
        assert!(with_access.is_some());

        // Check access permission
        let permission = client.check_access(&identity_id, &other_user);
        assert!(permission.is_some());
        assert_eq!(permission.unwrap().permission_type, 1);
    }
}