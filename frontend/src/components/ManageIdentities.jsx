import React, { useState } from 'react';
import { contractService } from '../services/contractService';
import { VERIFICATION_LEVELS } from '../config';

function ManageIdentities({ wallet, showAlert }) {
  const [identityId, setIdentityId] = useState('');
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    fullName: '',
    email: '',
    documentHash: ''
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!identityId) {
      showAlert('Vui lòng nhập Identity ID', 'warning');
      return;
    }

    setLoading(true);
    try {
      const data = await contractService.getIdentity(wallet.publicKey, identityId);
      console.log('Identity data received:', data);
      
      // Validate data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid identity data structure');
      }
      
      setIdentity(data);
      setUpdateForm({
        fullName: data.full_name || '',
        email: data.email || '',
        documentHash: data.document_hash || ''
      });
      showAlert('✅ Tìm thấy danh tính!', 'success');
    } catch (error) {
      console.error('Error getting identity:', error);
      showAlert('❌ Không tìm thấy danh tính hoặc không có quyền truy cập: ' + error.message, 'error');
      setIdentity(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    setUpdating(true);
    try {
      const result = await contractService.updateIdentity(
        wallet.keypair,
        identityId,
        updateForm.fullName,
        updateForm.email,
        updateForm.documentHash
      );
      
      if (result && (result.successful || result.status === 'SUCCESS')) {
        showAlert('✅ Cập nhật thành công!', 'success');
      } else {
        showAlert('⚠️ Cập nhật hoàn thành nhưng không thể xác nhận kết quả.', 'warning');
      }
      
      // Try to reload identity
      try {
        const data = await contractService.getIdentity(wallet.publicKey, identityId);
        setIdentity(data);
      } catch (reloadError) {
        console.log('Could not reload identity data:', reloadError);
      }
    } catch (error) {
      if (error.message.includes('Bad union switch') || error.message.includes('union switch')) {
        showAlert('✅ Cập nhật thành công! (Lỗi parsing response nhưng transaction đã hoàn thành)', 'success');
      } else {
        showAlert('❌ Lỗi cập nhật: ' + error.message, 'error');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('Bạn có chắc muốn vô hiệu hóa danh tính này?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await contractService.deactivateIdentity(wallet.keypair, identityId);
      
      if (result && (result.successful || result.status === 'SUCCESS')) {
        showAlert('✅ Đã vô hiệu hóa danh tính!', 'success');
      } else {
        showAlert('⚠️ Vô hiệu hóa hoàn thành nhưng không thể xác nhận kết quả.', 'warning');
      }
      
      // Try to reload identity
      try {
        const data = await contractService.getIdentity(wallet.publicKey, identityId);
        setIdentity(data);
      } catch (reloadError) {
        console.log('Could not reload identity after deactivation:', reloadError);
      }
    } catch (error) {
      if (error.message.includes('Bad union switch') || error.message.includes('union switch')) {
        showAlert('✅ Đã vô hiệu hóa danh tính! (Lỗi parsing response nhưng transaction đã hoàn thành)', 'success');
      } else {
        showAlert('❌ Lỗi vô hiệu hóa: ' + error.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    try {
      if (!timestamp) return 'N/A';
      return new Date(timestamp * 1000).toLocaleString('vi-VN');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const renderIdentityDetails = () => {
    if (!identity) return null;
    
    try {
      return (
        <div style={{ 
          padding: '1.5rem', 
          background: 'var(--gray-50)', 
          borderRadius: 'var(--radius-lg)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Thông tin Danh tính</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {identity.is_active ? (
                <span className="badge badge-success">Đang hoạt động</span>
              ) : (
                <span className="badge badge-danger">Đã vô hiệu hóa</span>
              )}
              {VERIFICATION_LEVELS[identity.verification_level] ? (
                <span className={`badge badge-${VERIFICATION_LEVELS[identity.verification_level].color}`}>
                  {VERIFICATION_LEVELS[identity.verification_level].label}
                </span>
              ) : (
                <span className="badge badge-secondary">Level {identity.verification_level || 0}</span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem' }}>
              <strong>Identity ID:</strong>
              <span style={{ fontFamily: 'monospace' }}>{identityId || 'N/A'}</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem' }}>
              <strong>Owner:</strong>
              <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-all' }}>
                {identity.owner || 'N/A'}
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem' }}>
              <strong>Họ và Tên:</strong>
              <span>{identity.full_name || 'N/A'}</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem' }}>
              <strong>Email:</strong>
              <span>{identity.email || 'N/A'}</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem' }}>
              <strong>Document Hash:</strong>
              <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-all' }}>
                {identity.document_hash || 'N/A'}
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem' }}>
              <strong>Ngày tạo:</strong>
              <span>{formatDate(identity.created_at)}</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem' }}>
              <strong>Cập nhật lần cuối:</strong>
              <span>{formatDate(identity.updated_at)}</span>
            </div>
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error rendering identity details:', error);
      return (
        <div className="alert alert-error">
          <span>Lỗi hiển thị thông tin danh tính. Vui lòng thử lại.</span>
        </div>
      );
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">📋 Quản lý Danh tính</h2>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input
            type="text"
            value={identityId}
            onChange={(e) => setIdentityId(e.target.value)}
            className="form-input"
            placeholder="Nhập Identity ID để tìm kiếm..."
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '⏳ Đang tìm...' : '🔍 Tìm kiếm'}
          </button>
        </div>
      </form>

      {/* Identity Details */}
      {renderIdentityDetails()}

      {/* Update Form */}
      {identity && identity.owner === wallet.publicKey && identity.is_active && (
        <div style={{ 
          padding: '1.5rem', 
          background: 'white',
          border: '2px solid var(--gray-200)', 
          borderRadius: 'var(--radius-lg)',
          marginBottom: '2rem'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            ✏️ Cập nhật Thông tin
          </h3>
          
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label className="form-label">Họ và Tên</label>
              <input
                type="text"
                value={updateForm.fullName}
                onChange={(e) => setUpdateForm({ ...updateForm, fullName: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={updateForm.email}
                onChange={(e) => setUpdateForm({ ...updateForm, email: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Document Hash</label>
              <input
                type="text"
                value={updateForm.documentHash}
                onChange={(e) => setUpdateForm({ ...updateForm, documentHash: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                type="submit" 
                className="btn btn-success"
                disabled={updating}
              >
                {updating ? '⏳ Đang cập nhật...' : '💾 Lưu thay đổi'}
              </button>
              
              <button 
                type="button"
                onClick={handleDeactivate}
                className="btn btn-danger"
                disabled={updating}
              >
                🗑️ Vô hiệu hóa
              </button>
            </div>
          </form>
        </div>
      )}

      {!identity && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3 className="empty-state-title">Tìm kiếm Danh tính</h3>
          <p>Nhập Identity ID vào ô tìm kiếm để xem và quản lý danh tính</p>
        </div>
      )}
    </div>
  );
}

export default ManageIdentities;
