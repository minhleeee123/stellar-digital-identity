# 🌟 Stellar Digital Identity Smart Contract

A smart contract for managing digital identities on the Stellar network, enabling users to register, verify, and manage identity access in a secure and decentralized manner.

## 🚀 Deployment Information

**Contract deployed on Stellar Testnet:**

- **Contract ID**: `CAQSVF6OR3MHSDFLTSKG3IX7XL2UJGKKRATSF3CWWNGIFZ2A4JFGROMV`
- **Network**: Stellar Testnet
- **Admin Address**: `GCM4I6FEUSZAQG7IUMBCXRXQ63JJPGCQ56PLT3Y5RHZBPUL5CKXRBLV7`
- **Deployment Date**: November 9, 2025
- **Explorer**: [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAQSVF6OR3MHSDFLTSKG3IX7XL2UJGKKRATSF3CWWNGIFZ2A4JFGROMV)

### Quick Test Commands

```bash
# View contract on testnet
stellar contract invoke \
    --id CAQSVF6OR3MHSDFLTSKG3IX7XL2UJGKKRATSF3CWWNGIFZ2A4JFGROMV \
    --source alice \
    --network testnet \
    -- get_admin

# Check total identities
stellar contract invoke \
    --id CAQSVF6OR3MHSDFLTSKG3IX7XL2UJGKKRATSF3CWWNGIFZ2A4JFGROMV \
    --source alice \
    --network testnet \
    -- get_total_identities
```

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture and Data Structures](#-architecture-and-data-structures)
- [Core Features](#-core-features)
- [Detailed Code Analysis](#-detailed-code-analysis)
- [Installation and Requirements](#️-installation-and-requirements)
- [Build Instructions](#-build-instructions)
- [Deployment Guide](#-deployment-guide)
- [Testing Guide](#-testing-guide)
- [Usage Examples](#-usage-examples)
- [API Reference](#-api-reference)
- [Security](#-security)

## 🎯 Overview

**Stellar Digital Identity** is a smart contract built on Soroban (Stellar smart contract platform) for managing digital identities. This contract provides:

- **Identity Registration**: Users can create and manage their digital identities
- **Identity Verification**: Multi-level verification system (0-3) by admin
- **Access Management**: Grant and revoke access permissions to others
- **Data Security**: Uses hashing for storing verification documents
- **Audit Trail**: Tracks all changes with timestamps

## 🏗 Architecture and Data Structures

### Main Data Structures

#### 1. IdentityData
```rust
pub struct IdentityData {
    pub owner: Address,          // Identity owner address
    pub full_name: String,       // Full name
    pub email: String,           // Email
    pub document_hash: Bytes,    // Hash of verification document
    pub verification_level: u32, // Verification level (0-3)
    pub is_active: bool,         // Active status
    pub created_at: u64,         // Creation timestamp
    pub updated_at: u64,         // Last update timestamp
}
```

**Purpose**: Stores basic information of a digital identity, including personal information, verification level, and metadata.

#### 2. AccessPermission
```rust
pub struct AccessPermission {
    pub granted_to: Address,     // Address granted access
    pub permission_type: u32,    // Permission type (1: read, 2: verify, 3: full)
    pub expires_at: u64,         // Expiration timestamp
    pub is_active: bool,         // Active status
}
```

**Purpose**: Manages access permissions, allowing owners to share identity information with third parties with time limits.

#### 3. VerificationRequest
```rust
pub struct VerificationRequest {
    pub requester: Address,      // Verification requester
    pub identity_id: String,     // Identity ID to verify
    pub verification_type: u32,  // Verification type
    pub status: u32,             // Status (0: pending, 1: approved, 2: rejected)
    pub requested_at: u64,       // Request timestamp
}
```

**Purpose**: Manages verification requests from third parties.

#### 4. DataKey (Storage Keys)
```rust
pub enum DataKey {
    Identity(String),              // identity_id -> IdentityData
    Access(String, Address),       // (identity_id, address) -> AccessPermission
    VerificationReq(String),       // request_id -> VerificationRequest
    Admin,                         // Admin address
    TotalIdentities,               // Total identities count
    IdentityByOwner(Address),      // owner -> Vec<String> (identity_ids)
}
```

**Purpose**: Defines keys for storing data in Stellar storage, optimizing data retrieval and organization.

## ⚡ Core Features

### 1. **Identity Management**
- Register new identity with basic information
- Update identity information
- Deactivate/Activate identity

### 2. **Verification System**
- 4 verification levels (0: unverified → 3: highest verification)
- Only admin can perform verification
- Track verification history

### 3. **Access Management**
- Grant time-limited access permissions
- 3 permission types: read (1), verify (2), full (3)
- Revoke access permissions

### 4. **Security and Control**
- Owner authentication for all operations
- Document hashing for privacy protection
- Event logging for audit trail

## 🔍 Detailed Code Analysis

### Initialize Function
```rust
pub fn initialize(env: Env, admin: Address) {
    admin.require_auth();  // Authenticate admin
    
    env.storage().instance().set(&DataKey::Admin, &admin);
    env.storage().instance().set(&DataKey::TotalIdentities, &0u32);
    
    log!(&env, "Digital Identity Contract initialized with admin: {}", admin);
}
```

**Purpose**: Initialize contract with designated admin and set up initial storage.

**Security**: Requires admin authentication before initialization.

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
    owner.require_auth();  // Only owner can register

    // Check if identity_id already exists
    if env.storage().persistent().has(&DataKey::Identity(identity_id.clone())) {
        return false;
    }

    let current_time = env.ledger().timestamp();
    
    let identity_data = IdentityData {
        owner: owner.clone(),
        full_name,
        email,
        document_hash,
        verification_level: 0, // Start unverified
        is_active: true,
        created_at: current_time,
        updated_at: current_time,
    };

    // Store and update indices
    env.storage().persistent().set(&DataKey::Identity(identity_id.clone()), &identity_data);
    // ... update owner indices and counters
}
```

**Purpose**: Register new identity with duplicate checking and automatic metadata creation.

**Business Logic**: 
- Check for duplicate ID
- Automatically set verification_level = 0
- Update indices for efficient querying

### Access Control Functions
```rust
pub fn grant_access(
    env: Env,
    identity_id: String,
    granted_to: Address,
    permission_type: u32,
    duration_seconds: u64,
) -> bool {
    let identity_data: IdentityData = // ... get identity data
    
    identity_data.owner.require_auth(); // Only owner can grant access
    
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

**Purpose**: Grant time-limited and categorized access permissions.

**Security**: 
- Only owner can grant permissions
- Validate permission type
- Automatic expiration based on time

### Get Identity with Access Control
```rust
pub fn get_identity(env: Env, identity_id: String, requester: Address) -> Option<IdentityData> {
    requester.require_auth();

    let identity_data: IdentityData = // ... get data
    
    // Owner has full access
    if identity_data.owner == requester {
        return Some(identity_data);
    }

    // Check granted permissions
    if let Some(permission) = env.storage()
        .persistent()
        .get::<DataKey, AccessPermission>(&DataKey::Access(identity_id.clone(), requester)) {
        
        let current_time = env.ledger().timestamp();
        if permission.is_active && current_time <= permission.expires_at {
            return Some(identity_data);
        }
    }

    None // No access
}
```

**Purpose**: Retrieve identity information with strict access control.

**Security Logic**:
- Owner always has access
- Check valid and unexpired permissions
- Return None if no access

## 🛠️ Installation and Requirements

### System Requirements
- **Rust**: version 1.70+
- **Stellar CLI**: version 23.1+
- **Target**: wasm32-unknown-unknown
- **Dependencies**: soroban-sdk 21.7.7

### Install Rust and Stellar CLI

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install Stellar CLI
cargo install --locked stellar-cli

# Install target wasm32-unknown-unknown
rustup target add wasm32-unknown-unknown
```

### Clone and Setup Project

```bash
# Clone project (or download)
git clone https://github.com/minhleeee123/stellar-digital-identity
cd stellar-digital-identity

# Check dependencies
cargo check
```

## 🔧 Build Instructions

### Step 1: Check Environment
```bash
# Check Rust version
rustc --version

# Check Stellar CLI
stellar --version

# Check target wasm32-unknown-unknown
rustup target list --installed | grep wasm32-unknown-unknown
```

### Step 2: Build Contract
```bash
# Build with cargo
cargo build --target wasm32-unknown-unknown --release

# Or use Stellar CLI
stellar contract build
```

### Step 3: Verify Build Result
```bash
# WASM file will be created at:
ls -la target/wasm32-unknown-unknown/release/stellar_digital_identity.wasm

# Check file size (should be < 64KB for optimal deployment)
du -h target/wasm32-unknown-unknown/release/stellar_digital_identity.wasm
```

## 🚀 Deployment Guide

### Step 1: Create and Fund Account

```bash
# Generate new key pair
stellar keys generate alice --network testnet

# Get public address
stellar keys address alice

# Fund account on testnet
stellar keys fund alice --network testnet

# Or fund with curl if SSL error
curl "https://friendbot.stellar.org/?addr=$(stellar keys address alice)"
```

### Step 2: Deploy Contract

```bash
# Deploy contract to testnet
stellar contract deploy \
    --source alice \
    --network testnet \
    --wasm target/wasm32-unknown-unknown/release/stellar_digital_identity.wasm

# Save CONTRACT_ID from output
export CONTRACT_ID="<CONTRACT_ID_FROM_OUTPUT>"
```

### Step 3: Initialize Contract

```bash
# Initialize with alice as admin
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    -- initialize --admin $(stellar keys address alice)
```

### Step 4: Verify Deployment

```bash
# Check admin
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    -- get_admin

# Check total identities (should be 0)
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    -- get_total_identities
```

## 🧪 Testing Guide

### Basic Tests

#### 1. Test Identity Registration
```bash
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    -- register_identity \
    --identity_id "user001" \
    --owner $(stellar keys address alice) \
    --full_name "Alice Johnson" \
    --email "alice@example.com" \
    --document_hash "d1e2f3a4b5c6789abcd1e2f3a4b5c6789abcd1e2f3a4b5c6789abcd1e2f3a4"
```

#### 2. Test Get Identity Information
```bash
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    -- get_identity \
    --identity_id "user001" \
    --requester $(stellar keys address alice)
```

#### 3. Test Verify Identity (admin only)
```bash
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    -- verify_identity \
    --identity_id "user001" \
    --verification_level 2
```

### Access Management Tests

#### 1. Create Second User
```bash
# Create user bob
stellar keys generate bob --network testnet
stellar keys fund bob --network testnet
```

#### 2. Grant Access
```bash
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    -- grant_access \
    --identity_id "user001" \
    --granted_to $(stellar keys address bob) \
    --permission_type 1 \
    --duration_seconds 3600
```

#### 3. Test Access from Another User
```bash
stellar contract invoke \
    --source bob \
    --network testnet \
    --id $CONTRACT_ID \
    -- get_identity \
    --identity_id "user001" \
    --requester $(stellar keys address bob)
```

#### 4. Revoke Access
```bash
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    -- revoke_access \
    --identity_id "user001" \
    --revoked_from $(stellar keys address bob)
```

### Advanced Test Cases

#### Test Multiple Identities
```bash
# Register multiple identities for same owner
for i in {002..005}; do
    stellar contract invoke \
        --source alice \
        --network testnet \
        --id $CONTRACT_ID \
        -- register_identity \
        --identity_id "user$i" \
        --owner $(stellar keys address alice) \
        --full_name "User $i" \
        --email "user$i@example.com" \
        --document_hash "hash${i}000000000000000000000000000000000000000000000000000000"
done

# Get owner's identity list
stellar contract invoke \
    --source alice \
    --network testnet \
    --id $CONTRACT_ID \
    -- get_identities_by_owner \
    --owner $(stellar keys address alice)
```

## 💡 Usage Examples

### Scenario 1: Register Personal Identity

```bash
# Alice registers identity
stellar contract invoke --source alice --network testnet --id $CONTRACT_ID \
-- register_identity \
--identity_id "alice_personal" \
--owner $(stellar keys address alice) \
--full_name "Alice Smith" \
--email "alice.smith@email.com" \
--document_hash "abc123def456abc123def456abc123def456abc123def456abc123def456abc1"

# Admin verifies Alice's identity
stellar contract invoke --source alice --network testnet --id $CONTRACT_ID \
-- verify_identity \
--identity_id "alice_personal" \
--verification_level 3
```

### Scenario 2: Share Information with Service

```bash
# Alice grants read permission to banking service (bob)
stellar contract invoke --source alice --network testnet --id $CONTRACT_ID \
-- grant_access \
--identity_id "alice_personal" \
--granted_to $(stellar keys address bob) \
--permission_type 1 \
--duration_seconds 86400  # 24 hours

# Banking service accesses information
stellar contract invoke --source bob --network testnet --id $CONTRACT_ID \
-- get_identity \
--identity_id "alice_personal" \
--requester $(stellar keys address bob)

# Alice revokes access after transaction completion
stellar contract invoke --source alice --network testnet --id $CONTRACT_ID \
-- revoke_access \
--identity_id "alice_personal" \
--revoked_from $(stellar keys address bob)
```

### Scenario 3: Update Information

```bash
# Alice updates email
stellar contract invoke --source alice --network testnet --id $CONTRACT_ID \
-- update_identity \
--identity_id "alice_personal" \
--full_name "Alice Smith" \
--email "alice.new@email.com" \
--document_hash "new_document_hash_000000000000000000000000000000000000000000000"
```

## 📚 API Reference

### Core Functions

| Function | Parameters | Return | Description |
|----------|------------|--------|-------------|
| `initialize` | `admin: Address` | `void` | Initialize contract with admin |
| `register_identity` | `identity_id, owner, full_name, email, document_hash` | `bool` | Register new identity |
| `update_identity` | `identity_id, full_name, email, document_hash` | `bool` | Update identity information |
| `get_identity` | `identity_id, requester` | `Option<IdentityData>` | Get identity information |

### Access Management

| Function | Parameters | Return | Description |
|----------|------------|--------|-------------|
| `grant_access` | `identity_id, granted_to, permission_type, duration_seconds` | `bool` | Grant access permission |
| `revoke_access` | `identity_id, revoked_from` | `bool` | Revoke access permission |
| `check_access` | `identity_id, requester` | `Option<AccessPermission>` | Check access permission |

### Admin Functions

| Function | Parameters | Return | Description |
|----------|------------|--------|-------------|
| `verify_identity` | `identity_id, verification_level` | `bool` | Verify identity (admin only) |
| `get_admin` | - | `Address` | Get admin address |

### Utility Functions

| Function | Parameters | Return | Description |
|----------|------------|--------|-------------|
| `get_identities_by_owner` | `owner` | `Vec<String>` | Get owner's identity list |
| `deactivate_identity` | `identity_id` | `bool` | Deactivate identity |
| `activate_identity` | `identity_id` | `bool` | Activate identity |
| `get_total_identities` | - | `u32` | Get total identities count |

### Permission Types

| Type | Value | Description |
|------|-------|-------------|
| `READ` | 1 | Read basic information only |
| `VERIFY` | 2 | Read + verify validity |
| `FULL` | 3 | Full access (except update) |

### Verification Levels

| Level | Description |
|-------|-------------|
| 0 | Unverified |
| 1 | Basic verification |
| 2 | Standard verification |
| 3 | Highest verification |

## 🔒 Security

### Implemented Security Measures

1. **Authentication & Authorization**
   - All functions require `require_auth()`
   - Only owner can modify their identity
   - Separate admin role for verification

2. **Access Control**
   - Time-limited permission system
   - Categorized access permissions (read, verify, full)
   - Automatic permission expiration

3. **Data Protection**
   - Store document hash instead of raw data
   - Timestamps for audit trail
   - Event logging for monitoring

4. **Input Validation**
   - Validate permission_type (1-3)
   - Validate verification_level (0-3)
   - Check duplicate IDs

### Best Practices

1. **Secure Key Management**
   ```bash
   # Don't commit private keys to git
   # Use environment variables
   export STELLAR_PRIVATE_KEY="S..."
   ```

2. **Monitoring and Logging**
   ```bash
   # Monitor events from contract
   stellar events --start-ledger <ledger> --id $CONTRACT_ID
   ```

3. **Backup and Recovery**
   ```bash
   # Backup contract information
   echo "CONTRACT_ID=$CONTRACT_ID" > .env
   echo "ADMIN_ADDRESS=$(stellar keys address alice)" >> .env
   ```

## 📈 Roadmap and Development

### Potential Features

1. **Multi-signature support** - Require multiple signatures for admin actions
2. **Identity recovery** - Recovery mechanism when private key is lost
3. **Reputation system** - Trust rating system based on verification
4. **Integration hooks** - Webhooks for external systems
5. **Batch operations** - Process multiple identities simultaneously

### Mainnet Deployment

```bash
# When ready to deploy to mainnet
stellar contract deploy \
    --source <production-account> \
    --network mainnet \
    --wasm target/wasm32-unknown-unknown/release/stellar_digital_identity.wasm
```

---

## 📄 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

All contributions are welcome! Please create an issue or pull request.

## 📞 Support

- **GitHub Issues**: [Create new issue](https://github.com/minhleeee123/stellar-digital-identity/issues)
- **Documentation**: Soroban documentation at [developers.stellar.org](https://developers.stellar.org)
- **Community**: Stellar Discord and Stellar Stack Exchange

---

*Built with ❤️ on Stellar Network*
