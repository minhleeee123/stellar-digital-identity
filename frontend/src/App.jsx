import React, { useState, useEffect } from 'react';
import './App.css';
import * as StellarSDK from '@stellar/stellar-sdk';
import { contractService } from './services/contractService';
import { VERIFICATION_LEVELS, PERMISSION_TYPES, CONTRACT_ID, HORIZON_URL } from './config';

// Components
import Dashboard from './components/Dashboard';
import RegisterIdentity from './components/RegisterIdentity';
import ManageIdentities from './components/ManageIdentities';
import GrantAccess from './components/GrantAccess';
import VerifyIdentity from './components/VerifyIdentity';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [wallet, setWallet] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);

  // Check if user is admin and load balance
  useEffect(() => {
    if (wallet) {
      checkAdmin();
      loadWalletBalance();
    }
  }, [wallet]);

  const checkAdmin = async () => {
    try {
      const adminAddress = await contractService.getAdmin();
      setIsAdmin(adminAddress === wallet.publicKey);
    } catch (error) {
      console.error('Error checking admin:', error);
    }
  };

  const loadWalletBalance = async () => {
    try {
      const server = new StellarSDK.Horizon.Server(HORIZON_URL);
      const account = await server.loadAccount(wallet.publicKey);
      
      const xlmBalance = account.balances.find(balance => balance.asset_type === 'native');
      setWalletBalance(xlmBalance ? parseFloat(xlmBalance.balance) : 0);
    } catch (error) {
      console.error('Error loading balance:', error);
      setWalletBalance(0);
      
      if (error.name === 'NotFoundError') {
        showAlert('⚠️ Tài khoản chưa được tạo trên network. Cần fund từ faucet!', 'warning');
      }
    }
  };

  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const connectWallet = async () => {
    try {
      // Generate or import keypair
      const secretKey = prompt('Nhập Secret Key của bạn (hoặc để trống để tạo ví mới):');
      
      let keypair;
      if (secretKey && secretKey.trim()) {
        keypair = StellarSDK.Keypair.fromSecret(secretKey.trim());
      } else {
        keypair = StellarSDK.Keypair.random();
        showAlert(`Ví mới đã được tạo! Secret Key: ${keypair.secret()}`, 'success');
        
        // Auto-fund new wallet from testnet faucet
        try {
          showAlert('Đang fund ví từ testnet faucet...', 'info');
          const response = await fetch(`https://friendbot.stellar.org?addr=${keypair.publicKey()}`);
          
          if (response.ok) {
            showAlert('✅ Đã fund ví thành công từ testnet!', 'success');
          } else {
            showAlert('⚠️ Không thể auto-fund. Vui lòng fund thủ công từ: https://laboratory.stellar.org/#account-creator', 'warning');
          }
        } catch (fundError) {
          showAlert('⚠️ Lỗi fund ví. Vui lòng fund thủ công từ Stellar Laboratory', 'warning');
        }
      }
      
      setWallet({
        publicKey: keypair.publicKey(),
        keypair: keypair
      });
      
      showAlert('Kết nối ví thành công!', 'success');
    } catch (error) {
      showAlert('Lỗi kết nối ví: ' + error.message, 'error');
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    setIsAdmin(false);
    setWalletBalance(null);
    showAlert('Đã ngắt kết nối ví', 'info');
  };

  const fundWallet = async () => {
    try {
      showAlert('Đang fund ví từ testnet faucet...', 'info');
      const response = await fetch(`https://friendbot.stellar.org?addr=${wallet.publicKey}`);
      
      if (response.ok) {
        showAlert('✅ Fund thành công!', 'success');
        // Reload balance
        setTimeout(() => loadWalletBalance(), 2000);
      } else {
        showAlert('❌ Lỗi fund. Thử lại sau', 'error');
      }
    } catch (error) {
      showAlert('❌ Lỗi kết nối faucet: ' + error.message, 'error');
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <div className="logo">🆔</div>
          <div>
            <h1>Stellar Digital Identity</h1>
            <p className="header-subtitle">Quản lý Danh tính Số An toàn & Phi tập trung</p>
          </div>
        </div>
        
        <div className="wallet-section">
          {wallet ? (
            <>
              <div style={{ textAlign: 'right' }}>
                <div className="wallet-address">
                  {wallet.publicKey.substring(0, 12)}...{wallet.publicKey.substring(wallet.publicKey.length - 8)}
                </div>
                {walletBalance !== null && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Balance: {walletBalance.toFixed(7)} XLM
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {isAdmin && <span className="badge badge-success">Admin</span>}
                {walletBalance === 0 && (
                  <button onClick={fundWallet} className="btn btn-warning btn-sm">
                    💰 Fund Ví
                  </button>
                )}
                <button onClick={disconnectWallet} className="btn btn-secondary btn-sm">
                  Ngắt kết nối
                </button>
              </div>
            </>
          ) : (
            <button onClick={connectWallet} className="btn btn-primary">
              🔐 Kết nối Ví
            </button>
          )}
        </div>
      </header>

      {/* Alert */}
      {alert && (
        <div className={`alert alert-${alert.type}`}>
          <span>{alert.message}</span>
        </div>
      )}

      {/* Navigation */}
      {wallet && (
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Tổng quan
          </button>
          <button
            className={`nav-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            ➕ Đăng ký Danh tính
          </button>
          <button
            className={`nav-tab ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}
          >
            📋 Quản lý Danh tính
          </button>
          <button
            className={`nav-tab ${activeTab === 'access' ? 'active' : ''}`}
            onClick={() => setActiveTab('access')}
          >
            🔑 Phân quyền
          </button>
          {isAdmin && (
            <button
              className={`nav-tab ${activeTab === 'verify' ? 'active' : ''}`}
              onClick={() => setActiveTab('verify')}
            >
              ✅ Xác minh (Admin)
            </button>
          )}
        </nav>
      )}

      {/* Content */}
      <main>
        {!wallet ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🔐</div>
              <h2 className="empty-state-title">Chào mừng đến với Stellar Digital Identity</h2>
              <p>Vui lòng kết nối ví để bắt đầu sử dụng hệ thống quản lý danh tính số</p>
              <p className="mt-2" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Contract ID: {CONTRACT_ID}
              </p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard wallet={wallet} showAlert={showAlert} />
            )}
            {activeTab === 'register' && (
              <RegisterIdentity wallet={wallet} showAlert={showAlert} />
            )}
            {activeTab === 'manage' && (
              <ManageIdentities wallet={wallet} showAlert={showAlert} />
            )}
            {activeTab === 'access' && (
              <GrantAccess wallet={wallet} showAlert={showAlert} />
            )}
            {activeTab === 'verify' && isAdmin && (
              <VerifyIdentity wallet={wallet} showAlert={showAlert} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
