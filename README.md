# 🌟 Stellar Digital Identity Smart Contract

Một smart contract quản lý danh tính số trên mạng Stellar, cho phép người dùng đăng ký, xác minh và quản lý quyền truy cập danh tính một cách an toàn và phi tập trung.

## 📋 Mục lục

- [Tổng quan](#-tổng-quan)
- [Kiến trúc và cấu trúc dữ liệu](#-kiến-trúc-và-cấu-trúc-dữ-liệu)
- [Chức năng chính](#-chức-năng-chính)
- [Phân tích code chi tiết](#-phân-tích-code-chi-tiết)
- [Cài đặt và yêu cầu](#️-cài-đặt-và-yêu-cầu)
- [Hướng dẫn build project](#-hướng-dẫn-build-project)
- [Hướng dẫn deploy contract](#-hướng-dẫn-deploy-contract)
- [Hướng dẫn test contract](#-hướng-dẫn-test-contract)
- [Ví dụ sử dụng](#-ví-dụ-sử-dụng)
- [API Reference](#-api-reference)
- [Bảo mật](#-bảo mật)

## 🎯 Tổng quan

**Stellar Digital Identity** là một smart contract được xây dựng trên Soroban (Stellar smart contract platform) để quản lý danh tính số. Contract này cung cấp:

- **Đăng ký danh tính**: Người dùng có thể tạo và quản lý danh tính số của mình
- **Xác minh danh tính**: Hệ thống xác minh đa cấp (0-3) bởi admin
- **Quản lý quyền truy cập**: Cấp phát và thu hồi quyền truy cập cho người khác
- **Bảo mật dữ liệu**: Sử dụng hash để lưu trữ tài liệu xác minh
- **Audit trail**: Theo dõi tất cả các thay đổi với timestamp

## 🏗 Kiến trúc và cấu trúc dữ liệu

### Cấu trúc dữ liệu chính

#### 1. IdentityData
```rust
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
```

**Chức năng**: Lưu trữ thông tin cơ bản của một danh tính số, bao gồm thông tin cá nhân, mức độ xác minh và metadata.

#### 2. AccessPermission
```rust
pub struct AccessPermission {
    pub granted_to: Address,     // Địa chỉ được cấp quyền
    pub permission_type: u32,    // Loại quyền (1: read, 2: verify, 3: full)
    pub expires_at: u64,         // Thời gian hết hạn
    pub is_active: bool,         // Trạng thái hoạt động
}
```

**Chức năng**: Quản lý quyền truy cập, cho phép owner chia sẻ thông tin danh tính với các bên thứ ba có thời hạn.

#### 3. VerificationRequest
```rust
pub struct VerificationRequest {
    pub requester: Address,      // Người yêu cầu xác minh
    pub identity_id: String,     // ID danh tính cần xác minh
    pub verification_type: u32,  // Loại xác minh
    pub status: u32,             // Trạng thái (0: pending, 1: approved, 2: rejected)
    pub requested_at: u64,       // Thời gian yêu cầu
}
```

**Chức năng**: Quản lý các yêu cầu xác minh danh tính từ các bên thứ ba.

#### 4. DataKey (Storage Keys)
```rust
pub enum DataKey {
    Identity(String),              // identity_id -> IdentityData
    Access(String, Address),       // (identity_id, address) -> AccessPermission
    VerificationReq(String),       // request_id -> VerificationRequest
    Admin,                         // Admin address
    TotalIdentities,               // Tổng số danh tính
    IdentityByOwner(Address),      // owner -> Vec<String> (identity_ids)
}
```

**Chức năng**: Định nghĩa các khóa để lưu trữ dữ liệu trong Stellar storage, tối ưu hóa việc truy xuất và tổ chức dữ liệu.

## ⚡ Chức năng chính

### 1. **Quản lý danh tính**
- Đăng ký danh tính mới với thông tin cơ bản
- Cập nhật thông tin danh tính
- Vô hiệu hóa danh tính

### 2. **Hệ thống xác minh**
- 4 mức độ xác minh (0: chưa xác minh → 3: xác minh cao nhất)
- Chỉ admin có thể thực hiện xác minh
- Theo dõi lịch sử xác minh

### 3. **Quản lý quyền truy cập**
- Cấp phát quyền truy cập có thời hạn
- 3 loại quyền: read (1), verify (2), full (3)
- Thu hồi quyền truy cập

### 4. **Bảo mật và kiểm soát**
- Xác thực owner cho mọi thao tác
- Hash tài liệu để bảo vệ privacy
- Event logging cho audit trail

## 🔍 Phân tích code chi tiết

### Initialize Function
```rust
pub fn initialize(env: Env, admin: Address) {
    admin.require_auth();  // Xác thực admin
    
    env.storage().instance().set(&DataKey::Admin, &admin);
    env.storage().instance().set(&DataKey::TotalIdentities, &0u32);
    
    log!(&env, "Digital Identity Contract initialized with admin: {}", admin);
}
```

**Mục đích**: Khởi tạo contract với admin được chỉ định và thiết lập storage ban đầu.

**Bảo mật**: Yêu cầu xác thực từ admin trước khi khởi tạo.

### Register Identity Function
```rust
pub fn register_identity(
    env: Env,
    identity_id: String,
    owner: Address,
    full_name: String,
    email: String,
    document_hash: Bytes,
) -> bool {
    owner.require_auth();  // Chỉ owner mới có thể đăng ký

    // Kiểm tra identity_id đã tồn tại
    if env.storage().persistent().has(&DataKey::Identity(identity_id.clone())) {
        return false;
    }

    let current_time = env.ledger().timestamp();
    
    let identity_data = IdentityData {
        owner: owner.clone(),
        full_name,
        email,
        document_hash,
        verification_level: 0, // Bắt đầu chưa xác minh
        is_active: true,
        created_at: current_time,
        updated_at: current_time,
    };

    // Lưu trữ và cập nhật indices
    env.storage().persistent().set(&DataKey::Identity(identity_id.clone()), &identity_data);
    // ... cập nhật owner indices và counters
}
```

**Mục đích**: Đăng ký danh tính mới với kiểm tra trùng lặp và tự động tạo metadata.

**Logic nghiệp vụ**: 
- Kiểm tra ID không trùng lặp
- Tự động set verification_level = 0
- Cập nhật indices để query hiệu quả

### Access Control Functions
```rust
pub fn grant_access(
    env: Env,
    identity_id: String,
    granted_to: Address,
    permission_type: u32,
    duration_seconds: u64,
) -> bool {
    let identity_data: IdentityData = // ... lấy identity data
    
    identity_data.owner.require_auth(); // Chỉ owner mới cấp quyền
    
    // Validate permission type (1-3)
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
}
```

**Mục đích**: Cấp phát quyền truy cập có thời hạn và phân loại quyền.

**Bảo mật**: 
- Chỉ owner mới có thể cấp quyền
- Validate permission type
- Tự động hết hạn theo thời gian

### Get Identity with Access Control
```rust
pub fn get_identity(env: Env, identity_id: String, requester: Address) -> Option<IdentityData> {
    requester.require_auth();

    let identity_data: IdentityData = // ... lấy data
    
    // Owner có quyền full access
    if identity_data.owner == requester {
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

    None // Không có quyền truy cập
}
```

**Mục đích**: Truy xuất thông tin danh tính với kiểm soát quyền truy cập nghiêm ngặt.

**Logic bảo mật**:
- Owner luôn có quyền truy cập
- Kiểm tra permission hợp lệ và chưa hết hạn
- Trả về None nếu không có quyền

## 🛠️ Cài đặt và yêu cầu

### Yêu cầu hệ thống
- **Rust**: phiên bản 1.70+
- **Stellar CLI**: phiên bản 23.1+
- **Target**: wasm32v1-none
- **Dependencies**: soroban-sdk 21.7.7

### Cài đặt Rust và Stellar CLI

```bash
# Cài đặt Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Cài đặt Stellar CLI
cargo install --locked stellar-cli

# Cài đặt target wasm32v1-none
rustup target add wasm32v1-none
```

### Clone và setup project

```bash
# Clone project (hoặc tải xuống)
git clone <repository-url>
cd stellar-digital-identity

# Kiểm tra dependencies
cargo check
```

## 🔧 Hướng dẫn build project

### Bước 1: Kiểm tra môi trường
```bash
# Kiểm tra Rust version
rustc --version

# Kiểm tra Stellar CLI
stellar --version

# Kiểm tra target wasm32v1-none
rustup target list --installed | grep wasm32v1-none
```

### Bước 2: Build contract
```bash
# Build với Stellar CLI (khuyến nghị)
stellar contract build

# Hoặc build với cargo (để debug)
cargo build --target wasm32v1-none --release
```

### Bước 3: Kiểm tra kết quả build
```bash
# File WASM sẽ được tạo tại:
ls -la target/wasm32v1-none/release/stellar_digital_identity.wasm

# Kiểm tra size file (nên < 64KB cho optimal deployment)
du -h target/wasm32v1-none/release/stellar_digital_identity.wasm
```

## 🚀 Hướng dẫn deploy contract

### Bước 1: Tạo và fund tài khoản

```bash
# Tạo key pair mới
stellar keys generate alice --network testnet

# Lấy địa chỉ public
stellar keys address alice

# Fund tài khoản trên testnet
stellar keys fund alice --network testnet

# Hoặc fund bằng curl nếu có lỗi SSL
curl "https://friendbot.stellar.org/?addr=$(stellar keys address alice)"
```

### Bước 2: Deploy contract

```bash
# Deploy contract lên testnet
stellar contract deploy \
    --source alice \
    --network testnet \
    --wasm target/wasm32v1-none/release/stellar_digital_identity.wasm

# Lưu lại CONTRACT_ID từ output
export CONTRACT_ID="<CONTRACT_ID_FROM_OUTPUT>"
```

### Bước 3: Initialize contract

```bash
# Initialize với alice làm admin
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    --send=yes \
    -- initialize --admin $(stellar keys address alice)
```

### Bước 4: Verify deployment

```bash
# Kiểm tra admin
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    -- get_admin

# Kiểm tra total identities (nên = 0)
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    -- get_total_identities
```

## 🧪 Hướng dẫn test contract

### Test cơ bản

#### 1. Test đăng ký identity
```bash
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    --send=yes \
    -- register_identity \
    --identity_id "user001" \
    --owner $(stellar keys address alice) \
    --full_name "Alice Johnson" \
    --email "alice@example.com" \
    --document_hash "d1e2f3a4b5c6789abc"
```

#### 2. Test lấy thông tin identity
```bash
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    -- get_identity \
    --identity_id "user001" \
    --requester $(stellar keys address alice)
```

#### 3. Test xác minh identity (admin only)
```bash
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    --send=yes \
    -- verify_identity \
    --identity_id "user001" \
    --verification_level 2
```

### Test quản lý quyền truy cập

#### 1. Tạo user thứ hai
```bash
# Tạo user bob
stellar keys generate bob --network testnet
stellar keys fund bob --network testnet
```

#### 2. Cấp quyền truy cập
```bash
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    --send=yes \
    -- grant_access \
    --identity_id "user001" \
    --granted_to $(stellar keys address bob) \
    --permission_type 1 \
    --duration_seconds 3600
```

#### 3. Test truy cập từ user khác
```bash
stellar contract invoke \
    --source bob \
    --network testnet \
    --id $CONTRACT_ID \
    -- get_identity \
    --identity_id "user001" \
    --requester $(stellar keys address bob)
```

#### 4. Thu hồi quyền truy cập
```bash
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    --send=yes \
    -- revoke_access \
    --identity_id "user001" \
    --revoked_from $(stellar keys address bob)
```

### Test cases nâng cao

#### Test multiple identities
```bash
# Đăng ký nhiều identity cho cùng một owner
for i in {002..005}; do
    stellar contract invoke \
        --source alice \
        --network testnet \
        --id $CONTRACT_ID \
        --send=yes \
        -- register_identity \
        --identity_id "user$i" \
        --owner $(stellar keys address alice) \
        --full_name "User $i" \
        --email "user$i@example.com" \
        --document_hash "hash$i"
done

# Lấy danh sách identity của owner
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    -- get_identities_by_owner \
    --owner $(stellar keys address alice)
```

## 💡 Ví dụ sử dụng

### Kịch bản 1: Đăng ký danh tính cá nhân

```bash
# Alice đăng ký danh tính
stellar contract invoke --source alice --network testnet --id $CONTRACT_ID --send=yes \
-- register_identity \
--identity_id "alice_personal" \
--owner $(stellar keys address alice) \
--full_name "Alice Smith" \
--email "alice.smith@email.com" \
--document_hash "sha256:abc123def456"

# Admin xác minh danh tính Alice
stellar contract invoke --source alice --network testnet --id $CONTRACT_ID --send=yes \
-- verify_identity \
--identity_id "alice_personal" \
--verification_level 3
```

### Kịch bản 2: Chia sẻ thông tin với dịch vụ

```bash
# Alice cấp quyền đọc cho dịch vụ banking (bob)
stellar contract invoke --source alice --network testnet --id $CONTRACT_ID --send=yes \
-- grant_access \
--identity_id "alice_personal" \
--granted_to $(stellar keys address bob) \
--permission_type 1 \
--duration_seconds 86400  # 24 giờ

# Dịch vụ banking truy cập thông tin
stellar contract invoke --source bob --network testnet --id $CONTRACT_ID \
-- get_identity \
--identity_id "alice_personal" \
--requester $(stellar keys address bob)

# Alice thu hồi quyền sau khi hoàn thành giao dịch
stellar contract invoke --source alice --network testnet --id $CONTRACT_ID --send=yes \
-- revoke_access \
--identity_id "alice_personal" \
--revoked_from $(stellar keys address bob)
```

### Kịch bản 3: Cập nhật thông tin

```bash
# Alice cập nhật email mới
stellar contract invoke --source alice --network testnet --id $CONTRACT_ID --send=yes \
-- update_identity \
--identity_id "alice_personal" \
--full_name "Alice Smith" \
--email "alice.new@email.com" \
--document_hash "sha256:new_document_hash"
```

## 📚 API Reference

### Core Functions

| Function | Parameters | Return | Description |
|----------|------------|--------|-------------|
| `initialize` | `admin: Address` | `void` | Khởi tạo contract với admin |
| `register_identity` | `identity_id, owner, full_name, email, document_hash` | `bool` | Đăng ký danh tính mới |
| `update_identity` | `identity_id, full_name, email, document_hash` | `bool` | Cập nhật thông tin danh tính |
| `get_identity` | `identity_id, requester` | `Option<IdentityData>` | Lấy thông tin danh tính |

### Access Management

| Function | Parameters | Return | Description |
|----------|------------|--------|-------------|
| `grant_access` | `identity_id, granted_to, permission_type, duration_seconds` | `bool` | Cấp quyền truy cập |
| `revoke_access` | `identity_id, revoked_from` | `bool` | Thu hồi quyền truy cập |
| `check_access` | `identity_id, requester` | `Option<AccessPermission>` | Kiểm tra quyền truy cập |

### Admin Functions

| Function | Parameters | Return | Description |
|----------|------------|--------|-------------|
| `verify_identity` | `identity_id, verification_level` | `bool` | Xác minh danh tính (admin only) |
| `get_admin` | - | `Address` | Lấy địa chỉ admin |

### Utility Functions

| Function | Parameters | Return | Description |
|----------|------------|--------|-------------|
| `get_identities_by_owner` | `owner` | `Vec<String>` | Lấy danh sách identity của owner |
| `deactivate_identity` | `identity_id` | `bool` | Vô hiệu hóa danh tính |
| `get_total_identities` | - | `u32` | Lấy tổng số danh tính |

### Permission Types

| Type | Value | Description |
|------|-------|-------------|
| `READ` | 1 | Chỉ đọc thông tin cơ bản |
| `VERIFY` | 2 | Đọc + xác minh tính hợp lệ |
| `FULL` | 3 | Toàn quyền (trừ cập nhật) |

### Verification Levels

| Level | Description |
|-------|-------------|
| 0 | Chưa xác minh |
| 1 | Xác minh cơ bản |
| 2 | Xác minh tiêu chuẩn |
| 3 | Xác minh cao nhất |

## 🔒 Bảo mật

### Các biện pháp bảo mật đã implement

1. **Authentication & Authorization**
   - Tất cả functions yêu cầu `require_auth()`
   - Chỉ owner mới có thể sửa đổi identity của mình
   - Admin role riêng biệt cho việc xác minh

2. **Access Control**
   - Hệ thống permission có thời hạn
   - Phân loại quyền truy cập (read, verify, full)
   - Tự động hết hạn permission

3. **Data Protection**
   - Lưu trữ document hash thay vì dữ liệu thô
   - Timestamp cho audit trail
   - Event logging cho monitoring

4. **Input Validation**
   - Kiểm tra permission_type hợp lệ (1-3)
   - Kiểm tra verification_level (0-3)
   - Kiểm tra ID trùng lặp

### Best practices khi sử dụng

1. **Quản lý keys an toàn**
   ```bash
   # Không commit private keys vào git
   # Sử dụng environment variables
   export STELLAR_PRIVATE_KEY="S..."
   ```

2. **Monitoring và logging**
   ```bash
   # Theo dõi events từ contract
   stellar events --start-ledger <ledger> --id $CONTRACT_ID
   ```

3. **Backup và recovery**
   ```bash
   # Backup thông tin contract
   echo "CONTRACT_ID=$CONTRACT_ID" > .env
   echo "ADMIN_ADDRESS=$(stellar keys address alice)" >> .env
   ```

## 📈 Roadmap và phát triển

### Tính năng có thể mở rộng

1. **Multi-signature support** - Yêu cầu nhiều chữ ký cho admin actions
2. **Identity recovery** - Cơ chế khôi phục identity khi mất private key
3. **Reputation system** - Hệ thống đánh giá uy tín dựa trên verification
4. **Integration hooks** - Webhook cho external systems
5. **Batch operations** - Xử lý nhiều identities cùng lúc

### Deployment lên Mainnet

```bash
# Khi sẵn sàng deploy lên mainnet
stellar contract deploy \
    --source <production-account> \
    --network mainnet \
    --wasm target/wasm32v1-none/release/stellar_digital_identity.wasm
```

---

## 📄 License

MIT License - Xem file LICENSE để biết chi tiết.

## 🤝 Contributing

Mọi đóng góp đều được hoan nghênh! Vui lòng tạo issue hoặc pull request.

## 📞 Hỗ trợ

- **GitHub Issues**: [Tạo issue mới](https://github.com/your-repo/issues)
- **Documentation**: Tài liệu Soroban tại [developers.stellar.org](https://developers.stellar.org)
- **Community**: Stellar Discord và Stellar Stack Exchange

---

*Được xây dựng với ❤️ trên Stellar Network*