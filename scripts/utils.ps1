# Stellar Digital Identity Smart Contract - Utility Functions

param(
    [Parameter(Mandatory=$true)]
    [string]$Action,
    
    [Parameter(Mandatory=$false)]
    [string]$Network = "testnet",
    
    [Parameter(Mandatory=$false)]
    [string]$RpcUrl = "https://soroban-testnet.stellar.org"
)

# Đọc contract info
$contractInfoFile = "contract-info.json"
if (-not (Test-Path $contractInfoFile)) {
    Write-Error "Contract info file not found. Please deploy the contract first using deploy.ps1"
    exit 1
}

$contractInfo = Get-Content $contractInfoFile | ConvertFrom-Json
$contractAddress = $contractInfo.contractAddress

function Show-ContractInfo {
    Write-Host "=== Contract Information ===" -ForegroundColor Green
    Write-Host "Contract Address: $($contractInfo.contractAddress)" -ForegroundColor Cyan
    Write-Host "Admin Address: $($contractInfo.adminAddress)" -ForegroundColor Cyan
    Write-Host "Network: $($contractInfo.network)" -ForegroundColor Cyan
    Write-Host "RPC URL: $($contractInfo.rpcUrl)" -ForegroundColor Cyan
    Write-Host "Deployed At: $($contractInfo.deployedAt)" -ForegroundColor Cyan
}

function Get-ContractStats {
    Write-Host "=== Contract Statistics ===" -ForegroundColor Green
    
    try {
        $totalIdentities = stellar contract invoke `
            --id $contractAddress `
            --source alice `
            --network $Network `
            --rpc-url $RpcUrl `
            -- get_total_identities
        
        Write-Host "Total Identities: $totalIdentities" -ForegroundColor Yellow
        
        $admin = stellar contract invoke `
            --id $contractAddress `
            --source alice `
            --network $Network `
            --rpc-url $RpcUrl `
            -- get_admin
        
        Write-Host "Admin Address: $admin" -ForegroundColor Yellow
        
    } catch {
        Write-Error "Failed to get contract stats: $_"
    }
}

function Show-UserIdentities {
    param([string]$UserAddress)
    
    if ([string]::IsNullOrEmpty($UserAddress)) {
        $UserAddress = Read-Host "Enter user address"
    }
    
    Write-Host "=== User Identities ===" -ForegroundColor Green
    Write-Host "User Address: $UserAddress" -ForegroundColor Cyan
    
    try {
        # Tạo temporary key để query (nếu cần)
        $identities = stellar contract invoke `
            --id $contractAddress `
            --source alice `
            --network $Network `
            --rpc-url $RpcUrl `
            -- get_identities_by_owner `
            --owner $UserAddress
        
        Write-Host "Identities: $identities" -ForegroundColor Yellow
        
    } catch {
        Write-Error "Failed to get user identities: $_"
    }
}

function Register-TestIdentity {
    Write-Host "=== Register Test Identity ===" -ForegroundColor Green
    
    # Tạo random identity data
    $identityId = "test_$(Get-Random)"
    $fullName = "Test User $(Get-Random -Minimum 100 -Maximum 999)"
    $email = "testuser$(Get-Random)@example.com"
    $documentHash = -join ((1..64) | ForEach {'{0:X}' -f (Get-Random -Max 16)})
    
    # Sử dụng testuser nếu có, nếu không tạo mới
    try {
        $testUserPublic = stellar keys show testuser --public-key
    } catch {
        Write-Host "Creating test user..." -ForegroundColor Yellow
        stellar keys generate testuser --network $Network
        if ($Network -eq "testnet") {
            stellar keys fund testuser --network $Network
        }
        $testUserPublic = stellar keys show testuser --public-key
    }
    
    Write-Host "Identity ID: $identityId" -ForegroundColor Cyan
    Write-Host "Full Name: $fullName" -ForegroundColor Cyan
    Write-Host "Email: $email" -ForegroundColor Cyan
    Write-Host "User Address: $testUserPublic" -ForegroundColor Cyan
    
    try {
        $result = stellar contract invoke `
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
        
        Write-Host "Registration Result: $result" -ForegroundColor Green
        
        # Lưu test identity info
        $testIdentity = @{
            identityId = $identityId
            fullName = $fullName
            email = $email
            documentHash = $documentHash
            userAddress = $testUserPublic
            createdAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        } | ConvertTo-Json -Depth 2
        
        $testIdentity | Out-File -FilePath "test-identity.json" -Encoding UTF8
        Write-Host "Test identity info saved to test-identity.json" -ForegroundColor Yellow
        
    } catch {
        Write-Error "Failed to register test identity: $_"
    }
}

function Show-Help {
    Write-Host "=== Stellar Digital Identity Contract Utilities ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage: .\scripts\utils.ps1 -Action <action> [-Network <network>] [-RpcUrl <url>]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Available Actions:" -ForegroundColor Yellow
    Write-Host "  info          - Show contract information" -ForegroundColor Cyan
    Write-Host "  stats         - Show contract statistics" -ForegroundColor Cyan
    Write-Host "  user          - Show user identities" -ForegroundColor Cyan
    Write-Host "  register      - Register a test identity" -ForegroundColor Cyan
    Write-Host "  help          - Show this help" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\scripts\utils.ps1 -Action info" -ForegroundColor Cyan
    Write-Host "  .\scripts\utils.ps1 -Action stats" -ForegroundColor Cyan
    Write-Host "  .\scripts\utils.ps1 -Action register" -ForegroundColor Cyan
    Write-Host "  .\scripts\utils.ps1 -Action user" -ForegroundColor Cyan
}

# Main action dispatcher
switch ($Action.ToLower()) {
    "info" { Show-ContractInfo }
    "stats" { Get-ContractStats }
    "user" { Show-UserIdentities }
    "register" { Register-TestIdentity }
    "help" { Show-Help }
    default { 
        Write-Error "Unknown action: $Action"
        Show-Help
    }
}