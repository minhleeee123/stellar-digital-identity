import React, { useState, useEffect } from 'react';
import { contractService } from '../services/contractService';
import { VERIFICATION_LEVELS } from '../config';

function Dashboard({ wallet, showAlert }) {
  const [stats, setStats] = useState({
    totalIdentities: 0,
    adminAddress: '',
  });
  const [userIdentities, setUserIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [identitiesLoading, setIdentitiesLoading] = useState(false);

  useEffect(() => {
    loadStats();
    loadUserIdentities();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [total, admin] = await Promise.all([
        contractService.getTotalIdentities(wallet.publicKey),
        contractService.getAdmin()
      ]);
      
      console.log('Stats loaded - Total identities:', total, 'Admin:', admin);
      
      setStats({
        totalIdentities: total,
        adminAddress: admin
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      showAlert('Lỗi tải dữ liệu: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUserIdentities = async () => {
    setIdentitiesLoading(true);
    try {
      const identities = await contractService.getIdentitiesByOwner(wallet.keypair);
      console.log('User identities loaded:', identities);
      setUserIdentities(identities);
    } catch (error) {
      console.error('Error loading user identities:', error);
      showAlert('Lỗi tải danh sách danh tính: ' + error.message, 'error');
    } finally {
      setIdentitiesLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">
          <div className="spinner"></div>
          <p className="mt-2">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  const refreshAll = async () => {
    await Promise.all([loadStats(), loadUserIdentities()]);
    showAlert('✅ Đã cập nhật dữ liệu!', 'success');
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>📊 Tổng quan Hệ thống</h1>
        <button 
          onClick={refreshAll}
          className="btn btn-primary"
          disabled={loading || identitiesLoading}
        >
          {(loading || identitiesLoading) ? '⏳ Đang tải...' : '🔄 Làm mới tất cả'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-label">Tổng số Danh tính (Hệ thống)</div>
          <div className="stat-value">{stats.totalIdentities}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-label">Danh tính của bạn</div>
          <div className="stat-value">{userIdentities.length}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🔐</div>
          <div className="stat-label">Địa chỉ của bạn</div>
          <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', marginTop: '0.5rem', wordBreak: 'break-all' }}>
            {wallet.publicKey}
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">⚙️</div>
          <div className="stat-label">Contract Admin</div>
          <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', marginTop: '0.5rem', wordBreak: 'break-all' }}>
            {stats.adminAddress || 'N/A'}
          </div>
        </div>
      </div>

      {/* User Identities List */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📋 Danh sách Danh tính của bạn</h2>
          <button 
            onClick={loadUserIdentities}
            className="btn btn-outline-primary btn-sm"
            disabled={identitiesLoading}
          >
            {identitiesLoading ? '⏳ Đang tải...' : '🔄 Làm mới'}
          </button>
        </div>

        {identitiesLoading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p className="mt-2">Đang tải danh sách danh tính...</p>
          </div>
        ) : userIdentities.length > 0 ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {userIdentities.map((identity, index) => (
              <div key={identity.identity_id || index} style={{
                padding: '1.5rem',
                background: 'var(--gray-50)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--gray-200)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                      {identity.identity_id}
                    </h3>
                    {identity.error ? (
                      <span className="badge badge-danger">{identity.error}</span>
                    ) : (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {identity.full_name} • {identity.email}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {!identity.error && (
                      <>
                        <span className={`badge ${identity.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {identity.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}
                        </span>
                        
                        {VERIFICATION_LEVELS[identity.verification_level] ? (
                          <span className={`badge badge-${VERIFICATION_LEVELS[identity.verification_level].color}`}>
                            {VERIFICATION_LEVELS[identity.verification_level].label}
                          </span>
                        ) : (
                          <span className="badge badge-secondary">Level {identity.verification_level || 0}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                {!identity.error && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <div>
                      <strong>Tạo:</strong> {identity.created_at ? new Date(identity.created_at * 1000).toLocaleDateString('vi-VN') : 'N/A'}
                    </div>
                    <div>
                      <strong>Cập nhật:</strong> {identity.updated_at ? new Date(identity.updated_at * 1000).toLocaleDateString('vi-VN') : 'N/A'}
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <strong>Document Hash:</strong> 
                      <code style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                        {identity.document_hash ? `${identity.document_hash.substring(0, 16)}...` : 'N/A'}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <h3 className="empty-state-title">Chưa có danh tính nào</h3>
            <p>Bạn chưa tạo danh tính nào. Hãy đi tới tab "Đăng ký Danh tính" để tạo danh tính đầu tiên của bạn.</p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📖 Hướng dẫn sử dụng</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div style={{ padding: '1.5rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--primary)' }}>
              1️⃣ Đăng ký Danh tính
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Tạo danh tính số mới bằng cách cung cấp thông tin cá nhân và tài liệu xác minh.
            </p>
          </div>
          
          <div style={{ padding: '1.5rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--success)' }}>
              2️⃣ Quản lý Danh tính
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Xem, cập nhật hoặc vô hiệu hóa các danh tính bạn đã đăng ký.
            </p>
          </div>
          
          <div style={{ padding: '1.5rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--warning)' }}>
              3️⃣ Phân quyền Truy cập
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Cấp hoặc thu hồi quyền truy cập danh tính cho các địa chỉ khác.
            </p>
          </div>
          
          <div style={{ padding: '1.5rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--secondary)' }}>
              4️⃣ Xác minh (Admin)
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Admin có thể xác minh và nâng cấp mức độ tin cậy cho các danh tính.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">ℹ️ Thông tin Contract</h2>
        </div>
        
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
            <strong>Network:</strong>
            <span className="badge badge-info">Stellar Testnet</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', alignItems: 'center' }}>
            <strong>Contract ID:</strong>
            <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>CAQSVF6OR3MHSDFLTSKG3IX7XL2UJGKKRATSF3CWWNGIFZ2A4JFGROMV</code>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
            <strong>Trạng thái:</strong>
            <span className="badge badge-success">Đang hoạt động</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
