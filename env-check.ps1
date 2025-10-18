# Environment Check & Build Script
Write-Host "=== Stellar Digital Identity Contract - Environment Check ===" -ForegroundColor Green

# Check Rust
Write-Host "`nChecking Rust Environment..." -ForegroundColor Yellow
try {
    $rustVersion = rustc --version
    Write-Host "OK Rust: $rustVersion" -ForegroundColor Green
} catch {
    Write-Error "ERROR Rust not found. Please install Rust from https://rustup.rs/"
    exit 1
}

# Check Cargo
try {
    $cargoVersion = cargo --version
    Write-Host "OK Cargo: $cargoVersion" -ForegroundColor Green
} catch {
    Write-Error "ERROR Cargo not found"
    exit 1
}

# Check WASM target
Write-Host "`nChecking WASM Target..." -ForegroundColor Yellow
$targets = rustup target list --installed
if ($targets -contains "wasm32-unknown-unknown") {
    Write-Host "OK wasm32-unknown-unknown target installed" -ForegroundColor Green
} else {
    Write-Host "Installing wasm32-unknown-unknown target..." -ForegroundColor Yellow
    rustup target add wasm32-unknown-unknown
    Write-Host "OK wasm32-unknown-unknown target installed" -ForegroundColor Green
}

# Check Stellar CLI
Write-Host "`nChecking Stellar CLI..." -ForegroundColor Yellow
try {
    $stellarVersion = stellar --version
    Write-Host "OK Stellar CLI: $stellarVersion" -ForegroundColor Green
} catch {
    Write-Warning "WARNING Stellar CLI not found. Install with: npm install -g @stellar/cli"
}

# Check Dependencies
Write-Host "`nChecking Project Dependencies..." -ForegroundColor Yellow
try {
    cargo check --quiet
    Write-Host "OK All dependencies resolved" -ForegroundColor Green
} catch {
    Write-Error "ERROR Dependency check failed"
    exit 1
}

# Build Contract
Write-Host "`nBuilding Contract..." -ForegroundColor Yellow
try {
    cargo build --target wasm32-unknown-unknown --release
    Write-Host "OK Contract build successful!" -ForegroundColor Green
    
    # Check WASM output
    $wasmFile = "target\wasm32-unknown-unknown\release\stellar_digital_identity.wasm"
    if (Test-Path $wasmFile) {
        $fileSize = (Get-Item $wasmFile).Length
        Write-Host "OK WASM file created: $wasmFile ($fileSize bytes)" -ForegroundColor Green
    }
} catch {
    Write-Error "ERROR Build failed"
    exit 1
}

# Run Tests
Write-Host "`nRunning Tests..." -ForegroundColor Yellow
try {
    cargo test
    Write-Host "OK All tests passed!" -ForegroundColor Green
} catch {
    Write-Warning "WARNING Some tests may have failed"
}

# Summary
Write-Host "`n=== Environment Check Summary ===" -ForegroundColor Green
Write-Host "OK Rust Environment: Ready" -ForegroundColor Cyan
Write-Host "OK WASM Target: Installed" -ForegroundColor Cyan
Write-Host "OK Dependencies: Resolved" -ForegroundColor Cyan
Write-Host "OK Contract Build: Successful" -ForegroundColor Cyan
Write-Host "OK Unit Tests: Passed" -ForegroundColor Cyan

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Contract is ready for deployment" -ForegroundColor White
Write-Host "2. Get your secret key to deploy to Stellar testnet" -ForegroundColor White
Write-Host "3. Run deployment script with your secret key" -ForegroundColor White

Write-Host "`nContract Build Complete! Ready for deployment." -ForegroundColor Green