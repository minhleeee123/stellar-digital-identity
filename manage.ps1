# Stellar Digital Identity Contract - Comprehensive Management Script
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("build", "deploy", "test", "full")]
    [string]$Action,
    
    [Parameter(Mandatory=$false)]
    [string]$SecretKey = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Network = "testnet"
)

$AdminAddress = "GBDFELLLKS7YWPP3FLSIYIGCC2XBJRKEFCM5GTEN4TIFBI6SDV63YYRZ"

Write-Host "=== Stellar Digital Identity Contract Manager ===" -ForegroundColor Green
Write-Host "Action: $Action" -ForegroundColor Yellow
Write-Host "Admin Address: $AdminAddress" -ForegroundColor Cyan
Write-Host "Network: $Network" -ForegroundColor Yellow

switch ($Action) {
    "build" {
        Write-Host "`n=== Building Contract ===" -ForegroundColor Green
        try {
            cargo build --target wasm32-unknown-unknown --release
            Write-Host "✅ Build completed successfully!" -ForegroundColor Green
        } catch {
            Write-Error "❌ Build failed: $_"
            exit 1
        }
    }
    
    "deploy" {
        if ([string]::IsNullOrEmpty($SecretKey)) {
            Write-Error "❌ Secret key is required for deployment"
            Write-Host "Usage: .\manage.ps1 -Action deploy -SecretKey 'YOUR_SECRET_KEY'" -ForegroundColor Yellow
            exit 1
        }
        
        Write-Host "`n=== Building Contract ===" -ForegroundColor Green
        cargo build --target wasm32-unknown-unknown --release
        
        Write-Host "`n=== Deploying Contract ===" -ForegroundColor Green
        & ".\scripts\deploy.ps1" -SecretKey $SecretKey -Network $Network
    }
    
    "test" {
        Write-Host "`n=== Testing Contract ===" -ForegroundColor Green
        & ".\scripts\test.ps1" -Network $Network
    }
    
    "full" {
        if ([string]::IsNullOrEmpty($SecretKey)) {
            Write-Error "❌ Secret key is required for full deployment"
            Write-Host "Usage: .\manage.ps1 -Action full -SecretKey 'YOUR_SECRET_KEY'" -ForegroundColor Yellow
            exit 1
        }
        
        Write-Host "`n=== Full Build, Deploy & Test ===" -ForegroundColor Green
        
        # Build
        Write-Host "`n1. Building Contract..." -ForegroundColor Yellow
        cargo build --target wasm32-unknown-unknown --release
        
        # Deploy  
        Write-Host "`n2. Deploying Contract..." -ForegroundColor Yellow
        & ".\scripts\deploy.ps1" -SecretKey $SecretKey -Network $Network
        
        # Test
        Write-Host "`n3. Testing Contract..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5  # Wait for deployment to complete
        & ".\scripts\test.ps1" -Network $Network
        
        Write-Host "`n🎉 Full deployment and testing completed!" -ForegroundColor Green
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Green
Write-Host "✅ Action '$Action' completed successfully!" -ForegroundColor Cyan
Write-Host "📊 Your admin address: $AdminAddress" -ForegroundColor Cyan

if ($Action -eq "deploy" -or $Action -eq "full") {
    Write-Host "`n📝 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Check the contract-info.json file for contract address"
    Write-Host "2. Update your .env file with the contract address"
    Write-Host "3. Use the test script to verify functionality"
    Write-Host "4. Start using your digital identity smart contract!"
}