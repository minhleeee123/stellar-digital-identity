#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, Bytes, log, symbol_short};

// Cấu trúc dữ liệu cho thông tin danh tính
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct IdentityData {
    pub owner: Address,          // Địa chỉ sở hữu danh tính
    pub full_name: String,       // Tên đầy đủ
    pub email: String,           // Email
    pub document_hash: Bytes,    // Hash của tài liệu xác minh
    pub verification_level: u32, // Mức độ xác minh (0-3)
    pub is_active: bool,         // Trạng thái hoạt động
    pub created_at: u64,         // Thời gian tạo
    pub updated_at: u64,         // Thời gian cập nhật
}

// Cấu trúc cho quyền truy cập
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AccessPermission {
    pub granted_to: Address,     // Địa chỉ được cấp quyền
    pub permission_type: u32,    // Loại quyền (1: read, 2: verify, 3: full)
    pub expires_at: u64,         // Thời gian hết hạn
    pub is_active: bool,         // Trạng thái hoạt động
}

// Cấu trúc cho lời mời xác minh
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VerificationRequest {
    pub requester: Address,      // Người yêu cầu xác minh
    pub identity_id: String,     // ID danh tính cần xác minh
    pub verification_type: u32,  // Loại xác minh
    pub status: u32,             // Trạng thái (0: pending, 1: approved, 2: rejected)
    pub requested_at: u64,       // Thời gian yêu cầu
}

// Enum cho các loại sự kiện (Simplified for Soroban compatibility)
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EventType {
    IdentityCreated,
    IdentityUpdated,
    VerificationLevelChanged,
    AccessGranted,
    AccessRevoked,
}

// Storage keys
#[contracttype]
pub enum DataKey {
    Identity(String),              // identity_id -> IdentityData
    Access(String, Address),       // (identity_id, address) -> AccessPermission
    VerificationReq(String),       // request_id -> VerificationRequest
    Admin,                         // Admin address
    TotalIdentities,               // Tổng số danh tính
    IdentityByOwner(Address),      // owner -> Vec<String> (identity_ids)
}

#[contract]
pub struct DigitalIdentityContract;

#[contractimpl]
impl DigitalIdentityContract {
    
    /// Khởi tạo contract với admin
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TotalIdentities, &0u32);
        
        log!(&env, "Digital Identity Contract initialized with admin: {}", admin);
    }

    /// Đăng ký danh tính mới
    pub fn register_identity(
        env: Env,
        identity_id: String,
        owner: Address,
        full_name: String,
        email: String,
        document_hash: Bytes,
    ) -> bool {
        owner.require_auth();

        // Kiểm tra identity_id đã tồn tại chưa
        if env.storage().persistent().has(&DataKey::Identity(identity_id.clone())) {
            return false;
        }

        let current_time = env.ledger().timestamp();
        
        let identity_data = IdentityData {
            owner: owner.clone(),
            full_name,
            email,
            document_hash,
            verification_level: 0, // Bắt đầu với mức 0 (chưa xác minh)
            is_active: true,
            created_at: current_time,
            updated_at: current_time,
        };

        // Lưu dữ liệu danh tính
        env.storage().persistent().set(&DataKey::Identity(identity_id.clone()), &identity_data);
        
        // Cập nhật danh sách identity của owner
        let mut owner_identities: Vec<String> = env.storage()
            .persistent()
            .get(&DataKey::IdentityByOwner(owner.clone()))
            .unwrap_or(Vec::new(&env));
        
        owner_identities.push_back(identity_id.clone());
        env.storage().persistent().set(&DataKey::IdentityByOwner(owner.clone()), &owner_identities);

        // Tăng tổng số danh tính
        let total: u32 = env.storage().instance().get(&DataKey::TotalIdentities).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalIdentities, &(total + 1));

        // Phát sự kiện
        env.events().publish((symbol_short!("ID_CREATE"), identity_id.clone()), owner.clone());

        log!(&env, "Identity registered: {} for owner: {}", identity_id, owner);
        true
    }

    /// Cập nhật thông tin danh tính
    pub fn update_identity(
        env: Env,
        identity_id: String,
        full_name: String,
        email: String,
        document_hash: Bytes,
    ) -> bool {
        let mut identity_data: IdentityData = match env.storage()
            .persistent()
            .get(&DataKey::Identity(identity_id.clone())) {
            Some(data) => data,
            None => return false,
        };

        // Chỉ owner mới có thể cập nhật
        identity_data.owner.require_auth();

        identity_data.full_name = full_name;
        identity_data.email = email;
        identity_data.document_hash = document_hash;
        identity_data.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Identity(identity_id.clone()), &identity_data);

        // Phát sự kiện
        env.events().publish((symbol_short!("ID_UPDATE"), identity_id.clone()), identity_data.owner.clone());

        log!(&env, "Identity updated: {}", identity_id);
        true
    }

    /// Cấp quyền truy cập cho địa chỉ khác
    pub fn grant_access(
        env: Env,
        identity_id: String,
        granted_to: Address,
        permission_type: u32,
        duration_seconds: u64,
    ) -> bool {
        let identity_data: IdentityData = match env.storage()
            .persistent()
            .get(&DataKey::Identity(identity_id.clone())) {
            Some(data) => data,
            None => return false,
        };

        // Chỉ owner mới có thể cấp quyền
        identity_data.owner.require_auth();

        // Kiểm tra permission_type hợp lệ (1: read, 2: verify, 3: full)
        if permission_type == 0 || permission_type > 3 {
            return false;
        }

        let current_time = env.ledger().timestamp();
        let expires_at = current_time + duration_seconds;

        let permission = AccessPermission {
            granted_to: granted_to.clone(),
            permission_type,
            expires_at,
            is_active: true,
        };

        env.storage().persistent().set(
            &DataKey::Access(identity_id.clone(), granted_to.clone()),
            &permission
        );

        // Phát sự kiện
        env.events().publish((symbol_short!("ACCESS_OK"), identity_id.clone()), (granted_to.clone(), permission_type));

        log!(&env, "Access granted for identity: {} to: {}", identity_id, granted_to);
        true
    }

    /// Thu hồi quyền truy cập
    pub fn revoke_access(
        env: Env,
        identity_id: String,
        revoked_from: Address,
    ) -> bool {
        let identity_data: IdentityData = match env.storage()
            .persistent()
            .get(&DataKey::Identity(identity_id.clone())) {
            Some(data) => data,
            None => return false,
        };

        // Chỉ owner mới có thể thu hồi quyền
        identity_data.owner.require_auth();

        env.storage().persistent().remove(&DataKey::Access(identity_id.clone(), revoked_from.clone()));

        // Phát sự kiện
        env.events().publish((symbol_short!("ACCESS_RV"), identity_id.clone()), revoked_from.clone());

        log!(&env, "Access revoked for identity: {} from: {}", identity_id, revoked_from);
        true
    }

    /// Xác minh danh tính (chỉ admin)
    pub fn verify_identity(
        env: Env,
        identity_id: String,
        verification_level: u32,
    ) -> bool {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut identity_data: IdentityData = match env.storage()
            .persistent()
            .get(&DataKey::Identity(identity_id.clone())) {
            Some(data) => data,
            None => return false,
        };

        // Kiểm tra verification_level hợp lệ (0-3)
        if verification_level > 3 {
            return false;
        }

        let old_level = identity_data.verification_level;
        identity_data.verification_level = verification_level;
        identity_data.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Identity(identity_id.clone()), &identity_data);

        // Phát sự kiện
        env.events().publish((symbol_short!("VERIFIED"), identity_id.clone()), (old_level, verification_level));

        log!(&env, "Identity verified: {} level: {}", identity_id, verification_level);
        true
    }

    /// Lấy thông tin danh tính (với kiểm tra quyền)
    pub fn get_identity(env: Env, identity_id: String, requester: Address) -> Option<IdentityData> {
        requester.require_auth();

        let identity_data: IdentityData = match env.storage()
            .persistent()
            .get(&DataKey::Identity(identity_id.clone())) {
            Some(data) => data,
            None => return None,
        };

        // Kiểm tra quyền truy cập
        if identity_data.owner == requester {
            // Owner có quyền full
            return Some(identity_data);
        }

        // Kiểm tra quyền được cấp
        if let Some(permission) = env.storage()
            .persistent()
            .get::<DataKey, AccessPermission>(&DataKey::Access(identity_id.clone(), requester)) {
            
            let current_time = env.ledger().timestamp();
            if permission.is_active && current_time <= permission.expires_at {
                return Some(identity_data);
            }
        }

        None
    }

    /// Kiểm tra quyền truy cập
    pub fn check_access(
        env: Env,
        identity_id: String,
        requester: Address,
    ) -> Option<AccessPermission> {
        let current_time = env.ledger().timestamp();
        
        if let Some(permission) = env.storage()
            .persistent()
            .get::<DataKey, AccessPermission>(&DataKey::Access(identity_id, requester)) {
            
            if permission.is_active && current_time <= permission.expires_at {
                return Some(permission);
            }
        }
        
        None
    }

    /// Lấy danh sách identity của một owner
    pub fn get_identities_by_owner(env: Env, owner: Address) -> Vec<String> {
        owner.require_auth();
        
        env.storage()
            .persistent()
            .get(&DataKey::IdentityByOwner(owner))
            .unwrap_or(Vec::new(&env))
    }

    /// Vô hiệu hóa danh tính
    pub fn deactivate_identity(env: Env, identity_id: String) -> bool {
        let mut identity_data: IdentityData = match env.storage()
            .persistent()
            .get(&DataKey::Identity(identity_id.clone())) {
            Some(data) => data,
            None => return false,
        };

        // Chỉ owner hoặc admin mới có thể vô hiệu hóa
        // Kiểm tra xem requester có phải owner hoặc admin không
        // Trong thực tế, bạn cần implement logic để xác định ai đang gọi hàm này
        identity_data.owner.require_auth();

        identity_data.is_active = false;
        identity_data.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Identity(identity_id.clone()), &identity_data);

        log!(&env, "Identity deactivated: {}", identity_id);
        true
    }

    /// Lấy tổng số danh tính
    pub fn get_total_identities(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TotalIdentities).unwrap_or(0)
    }

    /// Lấy địa chỉ admin
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }
}