# Stellar Digital Identity Smart Contract - Test Script

param(
    [Parameter(Mandatory=$false)]
    [string]$Network = "testnet",
    
    [Parameter(Mandatory=$false)]
    [string]$RpcUrl = "https://soroban-testnet.stellar.org"
)

Write-Host "=== Stellar Digital Identity Contract Testing ===" -ForegroundColor Green

# Đọc contract info
$contractInfoFile = "contract-info.json"
if (-not (Test-Path $contractInfoFile)) {
    Write-Error "Contract info file not found. Please deploy the contract first using deploy.ps1"
    exit 1
}

$contractInfo = Get-Content $contractInfoFile | ConvertFrom-Json
$contractAddress = $contractInfo.contractAddress
$adminAddress = "GBDFELLLKS7YWPP3FLSIYIGCC2XBJRKEFCM5GTEN4TIFBI6SDV63YYRZ"  # Sử dụng địa chỉ cố định

Write-Host "Contract Address: $contractAddress" -ForegroundColor Cyan
Write-Host "Admin Address: $adminAddress" -ForegroundColor Cyan
Write-Host "Network: $Network" -ForegroundColor Yellow

# Tạo test user keypair
Write-Host "`n=== Creating Test User ===" -ForegroundColor Green
$testUserExists = $false
try {
    stellar keys show testuser --public-key | Out-Null
    $testUserExists = $true
    Write-Host "Test user already exists" -ForegroundColor Yellow
} catch {
    Write-Host "Generating test user keypair..." -ForegroundColor Yellow
}

if (-not $testUserExists) {
    stellar keys generate testuser --network $Network
}

$testUserPublic = stellar keys show testuser --public-key
Write-Host "Test User Address: $testUserPublic" -ForegroundColor Cyan

# Fund test user
if ($Network -eq "testnet") {
    Write-Host "Funding test user..." -ForegroundColor Yellow
    try {
        stellar keys fund testuser --network $Network
        Write-Host "Test user funded successfully!" -ForegroundColor Green
    } catch {
        Write-Warning "Failed to fund test user"
    }
}

Write-Host "`n=== Running Contract Tests ===" -ForegroundColor Green

# Test 1: Get admin address
Write-Host "`n--- Test 1: Get Admin Address ---" -ForegroundColor Yellow
try {
    $adminResult = stellar contract invoke `
        --id $contractAddress `
        --source alice `
        --network $Network `
        --rpc-url $RpcUrl `
        -- get_admin
    
    Write-Host "Admin Address: $adminResult" -ForegroundColor Green
} catch {
    Write-Error "Failed to get admin address: $_"
}

# Test 2: Get total identities (should be 0 initially)
Write-Host "`n--- Test 2: Get Total Identities ---" -ForegroundColor Yellow
try {
    $totalResult = stellar contract invoke `
        --id $contractAddress `
        --source alice `
        --network $Network `
        --rpc-url $RpcUrl `
        -- get_total_identities
    
    Write-Host "Total Identities: $totalResult" -ForegroundColor Green
} catch {
    Write-Error "Failed to get total identities: $_"
}

# Test 3: Register new identity
Write-Host "`n--- Test 3: Register New Identity ---" -ForegroundColor Yellow
$identityId = "user_$(Get-Random)"
$fullName = "Nguyen Van Test"
$email = "test@example.com"
$documentHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

try {
    $registerResult = stellar contract invoke `
        --id $contractAddress `
        --source testuser `
        --network $Network `
        --rpc-url $RpcUrl `
        -- register_identity `
        --identity_id $identityId `
        --owner $testUserPublic `
        --full_name $fullName `
        --email $email `
        --document_hash $documentHash
    
    Write-Host "Registration Result: $registerResult" -ForegroundColor Green
    Write-Host "Identity ID: $identityId" -ForegroundColor Cyan
} catch {
    Write-Error "Failed to register identity: $_"
}

# Test 4: Get identity information
Write-Host "`n--- Test 4: Get Identity Information ---" -ForegroundColor Yellow
try {
    $identityResult = stellar contract invoke `
        --id $contractAddress `
        --source testuser `
        --network $Network `
        --rpc-url $RpcUrl `
        -- get_identity `
        --identity_id $identityId `
        --requester $testUserPublic
    
    Write-Host "Identity Data: $identityResult" -ForegroundColor Green
} catch {
    Write-Error "Failed to get identity: $_"
}

# Test 5: Update total identities count
Write-Host "`n--- Test 5: Check Updated Total Identities ---" -ForegroundColor Yellow
try {
    $newTotalResult = stellar contract invoke `
        --id $contractAddress `
        --source alice `
        --network $Network `
        --rpc-url $RpcUrl `
        -- get_total_identities
    
    Write-Host "Updated Total Identities: $newTotalResult" -ForegroundColor Green
} catch {
    Write-Error "Failed to get updated total identities: $_"
}

# Test 6: Create another test user for access control test
Write-Host "`n--- Test 6: Access Control Test ---" -ForegroundColor Yellow
$otherUserExists = $false
try {
    stellar keys show otheruser --public-key | Out-Null
    $otherUserExists = $true
} catch {
    Write-Host "Generating other test user keypair..." -ForegroundColor Yellow
}

if (-not $otherUserExists) {
    stellar keys generate otheruser --network $Network
    if ($Network -eq "testnet") {
        stellar keys fund otheruser --network $Network
    }
}

$otherUserPublic = stellar keys show otheruser --public-key
Write-Host "Other User Address: $otherUserPublic" -ForegroundColor Cyan

# Test access without permission (should fail)
Write-Host "`nTesting access without permission..." -ForegroundColor Yellow
try {
    $unauthorizedResult = stellar contract invoke `
        --id $contractAddress `
        --source otheruser `
        --network $Network `
        --rpc-url $RpcUrl `
        -- get_identity `
        --identity_id $identityId `
        --requester $otherUserPublic
    
    Write-Host "Unauthorized Access Result: $unauthorizedResult" -ForegroundColor Red
} catch {
    Write-Host "Access denied as expected (good!)" -ForegroundColor Green
}

# Test 7: Grant access permission
Write-Host "`n--- Test 7: Grant Access Permission ---" -ForegroundColor Yellow
try {
    $grantResult = stellar contract invoke `
        --id $contractAddress `
        --source testuser `
        --network $Network `
        --rpc-url $RpcUrl `
        -- grant_access `
        --identity_id $identityId `
        --granted_to $otherUserPublic `
        --permission_type 1 `
        --duration_seconds 3600
    
    Write-Host "Grant Access Result: $grantResult" -ForegroundColor Green
} catch {
    Write-Error "Failed to grant access: $_"
}

# Test access with permission (should succeed)
Write-Host "`nTesting access with permission..." -ForegroundColor Yellow
try {
    $authorizedResult = stellar contract invoke `
        --id $contractAddress `
        --source otheruser `
        --network $Network `
        --rpc-url $RpcUrl `
        -- get_identity `
        --identity_id $identityId `
        --requester $otherUserPublic
    
    Write-Host "Authorized Access Result: $authorizedResult" -ForegroundColor Green
} catch {
    Write-Error "Failed to access with permission: $_"
}

# Test 8: Admin verification
Write-Host "`n--- Test 8: Admin Verification ---" -ForegroundColor Yellow
try {
    $verifyResult = stellar contract invoke `
        --id $contractAddress `
        --source alice `
        --network $Network `
        --rpc-url $RpcUrl `
        -- verify_identity `
        --identity_id $identityId `
        --verification_level 2
    
    Write-Host "Verification Result: $verifyResult" -ForegroundColor Green
} catch {
    Write-Error "Failed to verify identity: $_"
}

# Test 9: Check verification level
Write-Host "`n--- Test 9: Check Verification Level ---" -ForegroundColor Yellow
try {
    $verifiedIdentityResult = stellar contract invoke `
        --id $contractAddress `
        --source testuser `
        --network $Network `
        --rpc-url $RpcUrl `
        -- get_identity `
        --identity_id $identityId `
        --requester $testUserPublic
    
    Write-Host "Verified Identity Data: $verifiedIdentityResult" -ForegroundColor Green
} catch {
    Write-Error "Failed to get verified identity: $_"
}

# Test 10: Update identity information
Write-Host "`n--- Test 10: Update Identity Information ---" -ForegroundColor Yellow
$newFullName = "Nguyen Van Updated"
$newEmail = "updated@example.com"
$newDocumentHash = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"

try {
    $updateResult = stellar contract invoke `
        --id $contractAddress `
        --source testuser `
        --network $Network `
        --rpc-url $RpcUrl `
        -- update_identity `
        --identity_id $identityId `
        --full_name $newFullName `
        --email $newEmail `
        --document_hash $newDocumentHash
    
    Write-Host "Update Result: $updateResult" -ForegroundColor Green
} catch {
    Write-Error "Failed to update identity: $_"
}

Write-Host "`n=== Test Summary ===" -ForegroundColor Green
Write-Host "Contract Address: $contractAddress" -ForegroundColor Cyan
Write-Host "Test Identity ID: $identityId" -ForegroundColor Cyan
Write-Host "Test User: $testUserPublic" -ForegroundColor Cyan
Write-Host "Other User: $otherUserPublic" -ForegroundColor Cyan

Write-Host "`nAll tests completed! Check the results above for any errors." -ForegroundColor Yellow
Write-Host "You can now use this contract in your applications." -ForegroundColor Green