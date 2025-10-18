import React, { useState, useEffect } from 'react';
import { contractService } from '../services/contractService';

function Dashboard({ wallet, showAlert }) {
  const [stats, setStats] = useState({
    totalIdentities: 0,
    adminAddress: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [total, admin] = await Promise.all([
        contractService.getTotalIdentities(),
        contractService.getAdmin()
      ]);
      
      setStats({
        totalIdentities: total,
        adminAddress: admin
      });
    } catch (error) {
      showAlert('Lỗi tải dữ liệu: ' + error.message, 'error');
    } finally {
      setLoading(false);
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

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-label">Tổng số Danh tính</div>
          <div className="stat-value">{stats.totalIdentities}</div>
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
            {stats.adminAddress}
          </div>
        </div>
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
            <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>CA6WCALSJ4HHQW56G6AI55CAG76KF6SCPMH3DQURNPXQVWRY4TINTFBC</code>
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
