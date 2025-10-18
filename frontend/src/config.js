// Contract configuration
export const CONTRACT_ID = 'CA6WCALSJ4HHQW56G6AI55CAG76KF6SCPMH3DQURNPXQVWRY4TINTFBC';
export const NETWORK = 'TESTNET';
export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';
export const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

// Verification levels
export const VERIFICATION_LEVELS = {
  0: { label: 'Chưa xác minh', color: 'secondary' },
  1: { label: 'Cơ bản', color: 'info' },
  2: { label: 'Tiêu chuẩn', color: 'warning' },
  3: { label: 'Cao cấp', color: 'success' }
};

// Permission types
export const PERMISSION_TYPES = {
  1: 'Đọc',
  2: 'Xác minh',
  3: 'Toàn quyền'
};
