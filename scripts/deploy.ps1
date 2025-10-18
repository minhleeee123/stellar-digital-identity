# Stellar Digital Identity Smart Contract - Deploy Script
# Cần cài đặt Stellar CLI trước khi chạy script này

param(
    [Parameter(Mandatory=$false)]
    [string]$Network = "testnet",
    
    [Parameter(Mandatory=$false)]
    [string]$SecretKey = "",
    
    [Parameter(Mandatory=$false)]
    [string]$RpcUrl = "https://soroban-testnet.stellar.org"
)

Write-Host "=== Stellar Digital Identity Contract Deployment ===" -ForegroundColor Green
Write-Host "Network: $Network" -ForegroundColor Yellow
Write-Host "RPC URL: $RpcUrl" -ForegroundColor Yellow

# Kiểm tra Stellar CLI
try {
    $stellarVersion = stellar --version
    Write-Host "Stellar CLI version: $stellarVersion" -ForegroundColor Green
} catch {
    Write-Error "Stellar CLI not found. Please install Stellar CLI first:"
    Write-Host "npm install -g @stellar/cli" -ForegroundColor Yellow
    exit 1
}

# Tạo file .env nếu chưa có
$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    @"
# Stellar Digital Identity Contract Environment Variables
NETWORK=$Network
RPC_URL=$RpcUrl
SECRET_KEY=
CONTRACT_ADDRESS=
ADMIN_ADDRESS=GBDFELLLKS7YWPP3FLSIYIGCC2XBJRKEFCM5GTEN4TIFBI6SDV63YYRZ
"@ | Out-File -FilePath $envFile -Encoding UTF8
}

# Đọc biến môi trường từ .env
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
}

# Sử dụng secret key từ parameter hoặc environment
if ([string]::IsNullOrEmpty($SecretKey)) {
    $SecretKey = $env:SECRET_KEY
}

if ([string]::IsNullOrEmpty($SecretKey)) {
    # Sử dụng địa chỉ admin đã được định sẵn
    $PublicKey = "GBDFELLLKS7YWPP3FLSIYIGCC2XBJRKEFCM5GTEN4TIFBI6SDV63YYRZ"
    
    Write-Host "Using predefined admin address:" -ForegroundColor Green
    Write-Host "Public Key: $PublicKey" -ForegroundColor Cyan
    Write-Host "Note: You need to provide your secret key for deployment" -ForegroundColor Yellow
    
    # Cập nhật .env file
    (Get-Content $envFile) -replace '^ADMIN_ADDRESS=.*', "ADMIN_ADDRESS=$PublicKey" | Set-Content $envFile
    
    # Yêu cầu secret key
    Write-Warning "SECRET_KEY not provided. Please set it in .env file or provide as parameter."
    Write-Host "Example: .\deploy.ps1 -SecretKey 'YOUR_SECRET_KEY_HERE'" -ForegroundColor Yellow
    exit 1
} else {
    $PublicKey = "GBDFELLLKS7YWPP3FLSIYIGCC2XBJRKEFCM5GTEN4TIFBI6SDV63YYRZ"
    
    # Tạo keypair từ secret key
    try {
        stellar keys add alice --secret-key $SecretKey --network $Network
        Write-Host "Using provided secret key" -ForegroundColor Green
        Write-Host "Public Key: $PublicKey" -ForegroundColor Cyan
    } catch {
        Write-Error "Invalid secret key provided"
        exit 1
    }
}

Write-Host "`n=== Funding Account ===" -ForegroundColor Green
if ($Network -eq "testnet") {
    Write-Host "Funding account with Friendbot..." -ForegroundColor Yellow
    try {
        stellar keys fund alice --network $Network
        Write-Host "Account funded successfully!" -ForegroundColor Green
    } catch {
        Write-Warning "Failed to fund account. Please fund manually: $PublicKey"
    }
} else {
    Write-Warning "Manual funding required for $Network network"
    Write-Host "Account address: $PublicKey" -ForegroundColor Cyan
}

Write-Host "`n=== Building Contract ===" -ForegroundColor Green
try {
    cargo build --target wasm32-unknown-unknown --release
    Write-Host "Contract built successfully!" -ForegroundColor Green
} catch {
    Write-Error "Failed to build contract. Please check your Rust installation and dependencies."
    exit 1
}

Write-Host "`n=== Deploying Contract ===" -ForegroundColor Green
try {
    $contractPath = "target/wasm32-unknown-unknown/release/stellar_digital_identity.wasm"
    
    $deployOutput = stellar contract deploy `
        --wasm $contractPath `
        --source alice `
        --network $Network `
        --rpc-url $RpcUrl
    
    $contractAddress = $deployOutput.Trim()
    Write-Host "Contract deployed successfully!" -ForegroundColor Green
    Write-Host "Contract Address: $contractAddress" -ForegroundColor Cyan
    
    # Cập nhật .env file với contract address
    (Get-Content $envFile) -replace '^CONTRACT_ADDRESS=.*', "CONTRACT_ADDRESS=$contractAddress" | Set-Content $envFile
    
} catch {
    Write-Error "Failed to deploy contract: $_"
    exit 1
}

Write-Host "`n=== Initializing Contract ===" -ForegroundColor Green
try {
    $initOutput = stellar contract invoke `
        --id $contractAddress `
        --source alice `
        --network $Network `
        --rpc-url $RpcUrl `
        -- initialize `
        --admin $PublicKey
    
    Write-Host "Contract initialized successfully!" -ForegroundColor Green
    Write-Host $initOutput -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to initialize contract: $_"
    exit 1
}

Write-Host "`n=== Deployment Summary ===" -ForegroundColor Green
Write-Host "Contract Address: $contractAddress" -ForegroundColor Cyan
Write-Host "Admin Address: $PublicKey" -ForegroundColor Cyan
Write-Host "Network: $Network" -ForegroundColor Cyan
Write-Host "RPC URL: $RpcUrl" -ForegroundColor Cyan

Write-Host "`n=== Next Steps ===" -ForegroundColor Yellow
Write-Host "1. Save the contract address and admin address"
Write-Host "2. Run test script: .\scripts\test.ps1"
Write-Host "3. Use the contract in your applications"

# Tạo contract info file
$contractInfo = @{
    contractAddress = $contractAddress
    adminAddress = $PublicKey
    network = $Network
    rpcUrl = $RpcUrl
    deployedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
} | ConvertTo-Json -Depth 2

$contractInfo | Out-File -FilePath "contract-info.json" -Encoding UTF8
Write-Host "`nContract information saved to contract-info.json" -ForegroundColor Green