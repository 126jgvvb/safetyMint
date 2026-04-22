import { sessionService } from '../services/session';

const API_BASE = 'http://localhost:3001/api';

const getAuthHeaders = () => {
  const session = sessionService.getSession();
  const token = session?.token || localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 401) {
      sessionService.destroySession();
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
};

export const api = {
  // Session management
  getSession: () => {
    return sessionService.getSession();
  },

  isAuthenticated: () => {
    return sessionService.isAuthenticated();
  },

  getCurrentUser: () => {
    return sessionService.getSession().userData;
  },

  // Packages
  getPackages: async () => {
    const response = await fetch(`${API_BASE}/packages`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createPackage: async (data) => {
    const response = await fetch(`${API_BASE}/packages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updatePackage: async (id, data) => {
    const response = await fetch(`${API_BASE}/packages/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deletePackage: async (id) => {
    const response = await fetch(`${API_BASE}/packages/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  toggleFreezePackage: async (id) => {
    const response = await fetch(`${API_BASE}/packages/${id}/toggle-freeze`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  allocateToPackage: async (id, amount) => {
    const response = await fetch(`${API_BASE}/packages/${id}/allocate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount }),
    });
    return handleResponse(response);
  },

  // Transactions
  getTransactions: async () => {
    const response = await fetch(`${API_BASE}/transactions`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getPayouts: async () => {
    const response = await fetch(`${API_BASE}/transactions/payouts`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getPayoutsByPackage: async (packageId) => {
    const response = await fetch(`${API_BASE}/transactions/payouts/package/${packageId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getPayoutById: async (id) => {
    const response = await fetch(`${API_BASE}/transactions/payouts/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createTransaction: async (data) => {
    const response = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  processPayment: async (id) => {
    const response = await fetch(`${API_BASE}/transactions/${id}/process-payment`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  processReserveDeduction: async (id) => {
    const response = await fetch(`${API_BASE}/transactions/${id}/process-reserve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Wallet
  getWallet: async () => {
    const response = await fetch(`${API_BASE}/wallet`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getPlatformWallet: async () => {
    const response = await fetch(`${API_BASE}/wallet/platform`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getWalletTransactions: async () => {
    const response = await fetch(`${API_BASE}/wallet/transactions`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  depositToWallet: async (amount, description, walletType = 'main') => {
    const response = await fetch(`${API_BASE}/wallet/deposit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount, description, walletType }),
    });
    return handleResponse(response);
  },

  withdrawFromWallet: async (amount, description, walletType = 'main') => {
    const response = await fetch(`${API_BASE}/wallet/withdraw`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount, description, walletType }),
    });
    return handleResponse(response);
  },

  withdrawToPhone: async (amount, description, phoneNumber, provider = 'MTN', walletType = 'main') => {
    const response = await fetch(`${API_BASE}/wallet/withdraw/phone`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount, description, phoneNumber, provider, walletType }),
    });
    return handleResponse(response);
  },

  // User
  getUser: async () => {
    const response = await fetch(`${API_BASE}/user`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  updateUser: async (data) => {
    const response = await fetch(`${API_BASE}/user/update`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  signup: async (data) => {
    const response = await fetch(`${API_BASE}/user/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Auth endpoints
  login: async (credentials, rememberMe = false) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    const result = await handleResponse(response);
    if (result.success && result.token) {
      sessionService.saveSession(result.token, result.user, rememberMe);
      sessionService.init(rememberMe);
    }
    return result;
  },

  logout: async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      sessionService.destroySession();
      return await handleResponse(response);
    } catch (error) {
      console.error('Logout error:', error);
      sessionService.destroySession();
      return { success: true };
    }
  },

  // Dashboard
  getDashboardStats: async () => {
    const response = await fetch(`${API_BASE}/dashboard/stats`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getDashboardPackages: async () => {
    const response = await fetch(`${API_BASE}/dashboard/packages`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getRecentTransactions: async (limit = 10) => {
    const response = await fetch(`${API_BASE}/dashboard/transactions/recent`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Groups
  getGroups: async () => {
    const response = await fetch(`${API_BASE}/groups`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Countdown
  getCountdowns: async () => {
    const response = await fetch(`${API_BASE}/countdown`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getCountdown: async (transactionId) => {
    const response = await fetch(`${API_BASE}/countdown/${transactionId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  startCountdown: async (transactionId, dueDate) => {
    const response = await fetch(`${API_BASE}/countdown`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ transactionId, dueDate }),
    });
    return handleResponse(response);
  },

  // Collections
  getCollections: async () => {
    const response = await fetch(`${API_BASE}/collections`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getCollectionHistory: async () => {
    const response = await fetch(`${API_BASE}/collections/history`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getCollection: async (id) => {
    const response = await fetch(`${API_BASE}/collections/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  initiateCollection: async (transactionId, groupId) => {
    const response = await fetch(`${API_BASE}/collections`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ transactionId, groupId }),
    });
    return handleResponse(response);
  },

  processCollection: async (id) => {
    const response = await fetch(`${API_BASE}/collections/${id}/process`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  abortCollection: async (id, reason) => {
    const response = await fetch(`${API_BASE}/collections/${id}/abort`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ collectionId: id, reason }),
    });
    return handleResponse(response);
  },

  // Payment Requests
  getPaymentRequests: async () => {
    const response = await fetch(`${API_BASE}/payment-requests`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getPendingRequests: async () => {
    const response = await fetch(`${API_BASE}/payment-requests/pending`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getPaymentConfig: async () => {
    const response = await fetch(`${API_BASE}/payment-requests/config`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  toggleAutoDisbursement: async (enabled) => {
    const response = await fetch(`${API_BASE}/payment-requests/toggle-auto`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ enabled }),
    });
    return handleResponse(response);
  },

  sendPaymentRequest: async (data) => {
    const response = await fetch(`${API_BASE}/payment-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  approvePaymentRequest: async (id) => {
    const response = await fetch(`${API_BASE}/payment-requests/${id}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  rejectPaymentRequest: async (id, reason) => {
    try {
      const response = await fetch(`${API_BASE}/payment-requests/${id}/decline`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to reject payment request:', error);
      return null;
    }
  },

  // Wallet Integration (IoTec)
  getWalletIntegrationBalance: async () => {
    const response = await fetch(`${API_BASE}/wallet-integration/balance`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getPlatformWalletInfo: async () => {
    const response = await fetch(`${API_BASE}/wallet-integration/platform`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getIoTecBalance: async () => {
    const response = await fetch(`${API_BASE}/wallet-integration/iotec-balance`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  withdrawWithIoTec: async (amount, description, phoneNumber, provider = 'MTN') => {
    const response = await fetch(`${API_BASE}/wallet-integration/withdraw/mobile`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount, description, phoneNumber, provider }),
    });
    return handleResponse(response);
  },

  collectWithIoTec: async (amount, phoneNumber, provider, description) => {
    const response = await fetch(`${API_BASE}/wallet-integration/collect`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount, phoneNumber, provider, description }),
    });
    return handleResponse(response);
  },

  disburseWithIoTec: async (amount, phoneNumber, provider, description) => {
    const response = await fetch(`${API_BASE}/wallet-integration/disburse`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount, phoneNumber, provider, description }),
    });
    return handleResponse(response);
  },

  getIoTecTransactions: async () => {
    const response = await fetch(`${API_BASE}/wallet-integration/iotec/transactions`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Analytics
  getAnalytics: async () => {
    try {
      const response = await fetch(`${API_BASE}/analytics`, {
        headers: getAuthHeaders()
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      return null;
    }
  },

  getMonthlyPerformance: async (year) => {
    try {
      const url = year 
        ? `${API_BASE}/analytics/monthly-performance?year=${year}`
        : `${API_BASE}/analytics/monthly-performance`;
      const response = await fetch(url, {
        headers: getAuthHeaders()
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch monthly performance:', error);
      return null;
    }
  },

  getPackageStats: async () => {
    try {
      const response = await fetch(`${API_BASE}/analytics/package-stats`, {
        headers: getAuthHeaders()
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch package stats:', error);
      return null;
    }
  },

  getPackagePerformance: async () => {
    try {
      const response = await fetch(`${API_BASE}/analytics/package-performance`, {
        headers: getAuthHeaders()
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch package performance:', error);
      return null;
    }
  },

  getPackageDetails: async () => {
    try {
      const response = await fetch(`${API_BASE}/analytics/package-details`, {
        headers: getAuthHeaders()
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch package details:', error);
      return null;
    }
  },

  // Interest Growth / Returns
  getInterestRecords: async () => {
    try {
      const response = await fetch(`${API_BASE}/interest-growth`, {
        headers: getAuthHeaders()
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch interest records:', error);
      return null;
    }
  },

  getInterestStats: async () => {
    try {
      const response = await fetch(`${API_BASE}/interest-growth/stats`, {
        headers: getAuthHeaders()
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch interest stats:', error);
      return null;
    }
  },

  // Collections
  getCollections: async () => {
    try {
      const response = await fetch(`${API_BASE}/collections`, {
        headers: getAuthHeaders()
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      return [];
    }
  },

  getOverdueCollections: async () => {
    try {
      const response = await fetch(`${API_BASE}/collections/overdue`, {
        headers: getAuthHeaders()
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch overdue collections:', error);
      return [];
    }
  },

  initiateCollection: async (data) => {
    try {
      const response = await fetch(`${API_BASE}/collections`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to initiate collection:', error);
      return null;
    }
  },

  processCollection: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/collections/${id}/process`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to process collection:', error);
      return null;
    }
  },

  abortCollection: async (id, reason) => {
    try {
      const response = await fetch(`${API_BASE}/collections/${id}/abort`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to abort collection:', error);
      return null;
    }
  },

  // Notifications
  getNotifications: async () => {
    try {
      const response = await fetch(`${API_BASE}/notifications`, {
        headers: getAuthHeaders()
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }
  },

  markNotificationRead: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to mark notification read:', error);
      return null;
    }
  },

  markAllNotificationsRead: async () => {
    try {
      const response = await fetch(`${API_BASE}/notifications/mark-all-read`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to mark all notifications read:', error);
      return null;
    }
  },

  deleteNotification: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/notifications/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      return null;
    }
  },

  clearAllNotifications: async () => {
    try {
      const response = await fetch(`${API_BASE}/notifications/clear-all`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      return null;
    }
  },

  // Payouts
  getPayouts: async () => {
    try {
      const response = await fetch(`${API_BASE}/transactions/payouts`, {
        headers: getAuthHeaders()
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
      return [];
    }
  },

  getPayoutsByPackage: async (packageId) => {
    try {
      const response = await fetch(`${API_BASE}/transactions/payouts/package/${packageId}`, {
        headers: getAuthHeaders()
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to fetch package payouts:', error);
      return [];
    }
  },

  // Auth Recovery
  recoverEmail: async (phone) => {
    try {
      const response = await fetch(`${API_BASE}/auth/recover-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Failed to recover email:', error);
      return { success: false, message: 'Failed to recover email' };
    }
  },
};