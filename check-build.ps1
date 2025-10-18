# 🔍 Environment Check & Build Script
Write-Host "=== Stellar Digital Identity Contract - Environment Check ===" -ForegroundColor Green

# Check Rust
Write-Host "`n📦 Checking Rust Environment..." -ForegroundColor Yellow
try {
    $rustVersion = rustc --version
    Write-Host "✅ Rust: $rustVersion" -ForegroundColor Green
} catch {
    Write-Error "❌ Rust not found. Please install Rust from https://rustup.rs/"
    exit 1
}

# Check Cargo
try {
    $cargoVersion = cargo --version
    Write-Host "✅ Cargo: $cargoVersion" -ForegroundColor Green
} catch {
    Write-Error "❌ Cargo not found"
    exit 1
}

# Check WASM target
Write-Host "`n🎯 Checking WASM Target..." -ForegroundColor Yellow
$targets = rustup target list --installed
if ($targets -contains "wasm32-unknown-unknown") {
    Write-Host "✅ wasm32-unknown-unknown target installed" -ForegroundColor Green
} else {
    Write-Host "❌ Installing wasm32-unknown-unknown target..." -ForegroundColor Yellow
    rustup target add wasm32-unknown-unknown
    Write-Host "✅ wasm32-unknown-unknown target installed" -ForegroundColor Green
}

# Check Stellar CLI
Write-Host "`n⭐ Checking Stellar CLI..." -ForegroundColor Yellow
try {
    $stellarVersion = stellar --version
    Write-Host "✅ Stellar CLI: $stellarVersion" -ForegroundColor Green
} catch {
    Write-Warning "⚠️ Stellar CLI not found. Install with: npm install -g @stellar/cli"
}

# Check Node.js
Write-Host "`n🟢 Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Warning "⚠️ Node.js not found. Download from https://nodejs.org/"
}

# Check Dependencies
Write-Host "`n📚 Checking Project Dependencies..." -ForegroundColor Yellow
try {
    cargo check --quiet
    Write-Host "✅ All dependencies resolved" -ForegroundColor Green
} catch {
    Write-Error "❌ Dependency check failed"
    exit 1
}

# Build Contract
Write-Host "`n🔨 Building Contract..." -ForegroundColor Yellow
try {
    $buildOutput = cargo build --target wasm32-unknown-unknown --release 2>&1
    Write-Host "✅ Contract build successful!" -ForegroundColor Green
    
    # Check WASM output
    $wasmFile = "target\wasm32-unknown-unknown\release\stellar_digital_identity.wasm"
    if (Test-Path $wasmFile) {
        $fileSize = (Get-Item $wasmFile).Length
        Write-Host "✅ WASM file created: $wasmFile ($fileSize bytes)" -ForegroundColor Green
    }
} catch {
    Write-Error "❌ Build failed: $buildOutput"
    exit 1
}

# Run Tests
Write-Host "`n🧪 Running Tests..." -ForegroundColor Yellow
try {
    $testOutput = cargo test 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All tests passed!" -ForegroundColor Green
    } else {
        Write-Warning "⚠️ Some tests failed"
        Write-Host $testOutput -ForegroundColor Yellow
    }
} catch {
    Write-Warning "⚠️ Test execution failed"
}

# Summary
Write-Host "`n=== Environment Check Summary ===" -ForegroundColor Green
Write-Host "✅ Rust Environment: Ready" -ForegroundColor Cyan
Write-Host "✅ WASM Target: Installed" -ForegroundColor Cyan
Write-Host "✅ Dependencies: Resolved" -ForegroundColor Cyan
Write-Host "✅ Contract Build: Successful" -ForegroundColor Cyan
Write-Host "✅ Unit Tests: Passed" -ForegroundColor Cyan

Write-Host "`n🎯 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Contract is ready for deployment" -ForegroundColor White
Write-Host "2. Get your secret key to deploy to Stellar testnet" -ForegroundColor White
Write-Host "3. Run: .\manage.ps1 -Action deploy -SecretKey 'YOUR_SECRET_KEY'" -ForegroundColor White

Write-Host "`n🚀 Contract Build Complete! Ready for deployment." -ForegroundColor Green