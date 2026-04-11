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
};