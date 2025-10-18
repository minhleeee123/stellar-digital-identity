# Stellar Digital Identity Smart Contract Makefile

.PHONY: help build test deploy clean check clippy format install

# Default target
help:
	@echo "Stellar Digital Identity Smart Contract"
	@echo "Available commands:"
	@echo "  build     - Build the smart contract"
	@echo "  test      - Run Rust tests"
	@echo "  deploy    - Deploy contract to Stellar (Windows)"
	@echo "  test-contract - Test deployed contract (Windows)"
	@echo "  clean     - Clean build artifacts"
	@echo "  check     - Check code without building"
	@echo "  clippy    - Run Clippy linter"
	@echo "  format    - Format code"
	@echo "  install   - Install dependencies"

# Build the smart contract
build:
	cargo build --target wasm32-unknown-unknown --release

# Run Rust unit tests
test:
	cargo test

# Deploy contract (Windows PowerShell)
deploy:
	powershell -ExecutionPolicy Bypass -File ./scripts/deploy.ps1

# Test deployed contract (Windows PowerShell)
test-contract:
	powershell -ExecutionPolicy Bypass -File ./scripts/test.ps1

# Clean build artifacts
clean:
	cargo clean
	rm -f contract-info.json test-identity.json *.wasm

# Check code without building
check:
	cargo check

# Run Clippy linter
clippy:
	cargo clippy -- -D warnings

# Format code
format:
	cargo fmt

# Install dependencies
install:
	rustup target add wasm32-unknown-unknown
	npm install -g @stellar/cli

# Quick development cycle
dev: format clippy test build

# Production build
prod: clean format clippy test build

# Show contract information (Windows)
info:
	powershell -ExecutionPolicy Bypass -File ./scripts/utils.ps1 -Action info

# Show contract statistics (Windows)
stats:
	powershell -ExecutionPolicy Bypass -File ./scripts/utils.ps1 -Action stats