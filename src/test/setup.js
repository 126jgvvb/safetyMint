import '@testing-library/jest-dom';

global.fetch = vi.fn();
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockSessionService = {
  checkRememberMe: vi.fn().mockReturnValue(false),
  init: vi.fn(),
  destroySession: vi.fn(),
  getSession: vi.fn().mockReturnValue({ token: null, userData: null }),
  isAuthenticated: vi.fn().mockReturnValue(false),
};

vi.mock('../services/session', () => ({
  default: mockSessionService,
}));

vi.mock('../services/firebase', () => ({
  default: {
    initialize: vi.fn().mockResolvedValue(undefined),
    onAuthStateChanged: vi.fn((callback) => { callback(null); return vi.fn(); }),
    loginWithEmail: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn().mockResolvedValue({ success: true }),
    registerWithEmail: vi.fn(),
  }
}));

vi.mock('../utils/api', () => ({
  api: {
    getPackages: vi.fn().mockRejectedValue(new Error('API not available')),
    getWallet: vi.fn().mockRejectedValue(new Error('API not available')),
    getTransactions: vi.fn().mockRejectedValue(new Error('API not available')),
    getWalletTransactions: vi.fn().mockRejectedValue(new Error('API not available')),
    login: vi.fn().mockResolvedValue({ success: true }),
    logout: vi.fn().mockResolvedValue({ success: true }),
    signup: vi.fn(),
    updateUser: vi.fn(),
    createPackage: vi.fn(),
    updatePackage: vi.fn(),
    deletePackage: vi.fn(),
    toggleFreezePackage: vi.fn(),
    depositToWallet: vi.fn(),
    withdrawFromWallet: vi.fn(),
    allocateToPackage: vi.fn(),
    processPayment: vi.fn(),
    processReserveDeduction: vi.fn(),
    getPlatformWallet: vi.fn(),
    getAnalytics: vi.fn().mockResolvedValue(null),
  }
}));

global.sessionService = mockSessionService;