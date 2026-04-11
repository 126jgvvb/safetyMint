import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import firebaseService from '../services/firebase';
import sessionService from '../services/session';

const AppContext = createContext();

const initialPackages = [
  {
    id: 1,
    name: 'Starter Loan',
    interestRate: 5,
    cycle: 'monthly',
    minAmount: 1000,
    maxAmount: 10000,
    subcontractor: 'QuickFinance Ltd',
    status: 'active',
    currentAmount: 5000,
    monthlyPayout: [1000, 1500, 2000, 1500],
  },
  {
    id: 2,
    name: 'Business Loan',
    interestRate: 8,
    cycle: 'monthly',
    minAmount: 10000,
    maxAmount: 50000,
    subcontractor: 'Enterprise Solutions',
    status: 'active',
    currentAmount: 25000,
    monthlyPayout: [8000, 9000, 8000],
  },
  {
    id: 3,
    name: 'Premium Loan',
    interestRate: 12,
    cycle: 'monthly',
    minAmount: 50000,
    maxAmount: 200000,
    subcontractor: 'Capital Partners',
    status: 'frozen',
    currentAmount: 80000,
    monthlyPayout: [20000, 25000, 35000],
  }
];

const initialWallet = {
  main: 50000,
  interest: 2500,
};

const initialTransactions = [
  {
    id: 1,
    memberName: 'John Smith',
    phoneNumber: '+1234567890',
    groupName: 'Group Alpha',
    amountPaid: 5000,
    date: '2026-03-01',
    interestRate: 5,
    amountToReturn: 5250,
    dateOfReturn: '2026-04-01',
    status: 'paid',
  },
  {
    id: 2,
    memberName: 'Sarah Johnson',
    phoneNumber: '+1234567891',
    groupName: 'Group Beta',
    amountPaid: 10000,
    date: '2026-03-15',
    interestRate: 8,
    amountToReturn: 10800,
    dateOfReturn: '2026-04-15',
    status: 'pending',
  },
  {
    id: 3,
    memberName: 'Mike Brown',
    phoneNumber: '+1234567892',
    groupName: 'Group Alpha',
    amountPaid: 7500,
    date: '2026-02-20',
    interestRate: 5,
    amountToReturn: 7875,
    dateOfReturn: '2026-03-20',
    status: 'overdue',
  }
];

const initialWalletTransactions = [
  { id: 1, type: 'deposit', amount: 10000, date: '2026-03-01', description: 'Initial deposit', walletType: 'main' },
  { id: 2, type: 'deposit', amount: 5000, date: '2026-03-15', description: 'Top up', walletType: 'main' },
  { id: 3, type: 'withdraw', amount: 3000, date: '2026-03-20', description: 'Package funding - Starter Loan', walletType: 'main' },
  { id: 4, type: 'deposit', amount: 2500, date: '2026-04-01', description: 'Interest earned', walletType: 'interest' },
];

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [packages, setPackages] = useState(initialPackages);
  const [wallet, setWallet] = useState(initialWallet);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [walletTransactions, setWalletTransactions] = useState(initialWalletTransactions);
  const [loading, setLoading] = useState(true);
  const [useApi, setUseApi] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      // Initialize Firebase
      await firebaseService.initialize();

      // Check for existing session
      const rememberMe = sessionService.checkRememberMe();
      sessionService.init(rememberMe);

      // Set up Firebase auth state listener
      firebaseService.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            emailVerified: firebaseUser.emailVerified
          });
          setIsAuthenticated(true);

          // Try to load API data
          try {
            const [pkgData, walletData, txnData, walletTxnData] = await Promise.all([
              api.getPackages(),
              api.getWallet(),
              api.getTransactions(),
              api.getWalletTransactions(),
            ]);
            setPackages(pkgData);
            setWallet(walletData);
            setTransactions(txnData);
            setWalletTransactions(walletTxnData);
            setUseApi(true);
          } catch (error) {
            console.log('Using local placeholders - API not available');
            setPackages(initialPackages);
            setWallet(initialWallet);
            setTransactions(initialTransactions);
            setWalletTransactions(initialWalletTransactions);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setUseApi(false);
        }
      });

    } catch (error) {
      console.log('Firebase initialization failed, using local mode');
      setPackages(initialPackages);
      setWallet(initialWallet);
      setTransactions(initialTransactions);
      setWalletTransactions(initialWalletTransactions);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const updateUser = async (data) => {
    if (useApi) {
      try {
        const updated = await api.updateUser(data);
        setUser(updated);
      } catch (error) {
        console.error('Failed to update user:', error);
      }
    } else {
      setUser({ ...user, ...data });
    }
  };

  const addPackage = async (pkg) => {
    if (useApi) {
      try {
        const newPackage = await api.createPackage(pkg);
        setPackages([...packages, newPackage]);
      } catch (error) {
        console.error('Failed to create package:', error);
      }
    } else {
      setPackages([...packages, { ...pkg, id: Date.now(), status: 'active', currentAmount: 0, monthlyPayout: [] }]);
    }
  };

  const updatePackage = async (id, updates) => {
    if (useApi) {
      try {
        const updated = await api.updatePackage(id, updates);
        setPackages(packages.map(pkg => pkg.id === id ? updated : pkg));
      } catch (error) {
        console.error('Failed to update package:', error);
      }
    } else {
      setPackages(packages.map(pkg => pkg.id === id ? { ...pkg, ...updates } : pkg));
    }
  };

  const deletePackage = async (id) => {
    if (useApi) {
      try {
        await api.deletePackage(id);
        setPackages(packages.filter(pkg => pkg.id !== id));
      } catch (error) {
        console.error('Failed to delete package:', error);
      }
    } else {
      setPackages(packages.filter(pkg => pkg.id !== id));
    }
  };

  const toggleFreezePackage = async (id) => {
    if (useApi) {
      try {
        const updated = await api.toggleFreezePackage(id);
        setPackages(packages.map(pkg => pkg.id === id ? updated : pkg));
      } catch (error) {
        console.error('Failed to toggle freeze:', error);
      }
    } else {
      setPackages(packages.map(pkg => pkg.id === id ? { ...pkg, status: pkg.status === 'frozen' ? 'active' : 'frozen' } : pkg));
    }
  };

  const depositToWallet = async (amount, description, walletType = 'main') => {
    if (useApi) {
      try {
        const updated = await api.depositToWallet(amount, description, walletType);
        setWallet(updated);
        const txns = await api.getWalletTransactions();
        setWalletTransactions(txns);
      } catch (error) {
        console.error('Failed to deposit:', error);
      }
    } else {
      if (walletType === 'main') {
        setWallet({ ...wallet, main: wallet.main + amount });
      } else {
        setWallet({ ...wallet, interest: wallet.interest + amount });
      }
      setWalletTransactions([...walletTransactions, { id: Date.now(), type: 'deposit', amount, date: new Date().toISOString().split('T')[0], description, walletType }]);
    }
  };

  const withdrawFromWallet = async (amount, description, walletType = 'main') => {
    if (useApi) {
      try {
        const result = await api.withdrawFromWallet(amount, description, walletType);
        if (result) {
          setWallet(result);
          const txns = await api.getWalletTransactions();
          setWalletTransactions(txns);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to withdraw:', error);
        return false;
      }
    } else {
      if (walletType === 'main') {
        if (wallet.main >= amount) {
          setWallet({ ...wallet, main: wallet.main - amount });
          setWalletTransactions([...walletTransactions, { id: Date.now(), type: 'withdraw', amount, date: new Date().toISOString().split('T')[0], description, walletType }]);
          return true;
        }
      } else {
        if (wallet.interest >= amount) {
          setWallet({ ...wallet, interest: wallet.interest - amount });
          setWalletTransactions([...walletTransactions, { id: Date.now(), type: 'withdraw', amount, date: new Date().toISOString().split('T')[0], description, walletType }]);
          return true;
        }
      }
      return false;
    }
  };

  const allocateToPackage = async (packageId, amount, phoneNumber) => {
    if (useApi) {
      try {
        await api.allocateToPackage(packageId, amount);
        const [pkgData, walletData] = await Promise.all([api.getPackages(), api.getWallet()]);
        setPackages(pkgData);
        setWallet(walletData);
        const txns = await api.getWalletTransactions();
        setWalletTransactions(txns);
      } catch (error) {
        console.error('Failed to allocate:', error);
      }
    } else {
      if (withdrawFromWallet(amount, `Funding - ${packages.find(p => p.id === packageId)?.name}`, 'main')) {
        setPackages(packages.map(pkg => pkg.id === packageId ? { ...pkg, currentAmount: pkg.currentAmount + amount } : pkg));
      }
    }
  };

  const addTransaction = (txn) => {
    setTransactions([...transactions, { ...txn, id: Date.now() }]);
  };

  const processRepayment = async (txnId) => {
    if (useApi) {
      try {
        await api.processPayment(txnId);
        const [txnData, walletData] = await Promise.all([api.getTransactions(), api.getWallet()]);
        setTransactions(txnData);
        setWallet(walletData);
      } catch (error) {
        console.error('Failed to process payment:', error);
      }
    } else {
      const txn = transactions.find(t => t.id === txnId);
      if (txn) {
        const interest = txn.amountToReturn - txn.amountPaid;
        setWallet({ ...wallet, main: wallet.main + txn.amountToReturn, interest: wallet.interest + interest });
        setTransactions(transactions.map(t => t.id === txnId ? { ...t, status: 'paid' } : t));
      }
    }
  };

  const processReserveDeduction = async (txnId) => {
    if (useApi) {
      try {
        await api.processReserveDeduction(txnId);
        const [txnData, walletData] = await Promise.all([api.getTransactions(), api.getWallet()]);
        setTransactions(txnData);
        setWallet(walletData);
      } catch (error) {
        console.error('Failed to process reserve deduction:', error);
      }
    } else {
      const txn = transactions.find(t => t.id === txnId);
      if (txn) {
        setWallet({ ...wallet, main: wallet.main + txn.amountPaid });
        setTransactions(transactions.map(t => t.id === txnId ? { ...t, status: 'reserve_used' } : t));
      }
    }
  };

  const updateTransactionStatus = (id, status) => {
    setTransactions(transactions.map(t => t.id === id ? { ...t, status } : t));
  };

  const login = async (credentials, rememberMe = false) => {
    try {
      const result = await firebaseService.loginWithEmail(credentials.email, credentials.password);
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);

        // Try to sync with backend
        try {
          await api.login({ firebaseToken: result.user.uid }, rememberMe);
        } catch (backendError) {
          console.log('Backend login failed, continuing with Firebase auth');
        }

        return result;
      }
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async (rememberMe = false) => {
    try {
      const result = await firebaseService.loginWithGoogle();
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);

        // Try to sync with backend
        try {
          await api.login({ firebaseToken: result.user.uid }, rememberMe);
        } catch (backendError) {
          console.log('Backend login failed, continuing with Firebase auth');
        }

        return result;
      }
      return result;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseService.logout();
      await api.logout();
      setUser(null);
      setIsAuthenticated(false);
      sessionService.destroySession();
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      setUser(null);
      setIsAuthenticated(false);
      sessionService.destroySession();
    }
  };

  const signup = async (data) => {
    try {
      const result = await firebaseService.registerWithEmail(data.email, data.password, data.name, data.phone);
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);

        // Try to sync with backend
        try {
          const backendResult = await api.signup({
            ...data,
            firebaseUid: result.user.uid
          });
          setWallet(backendResult.wallet);
        } catch (backendError) {
          console.log('Backend signup failed, continuing with Firebase auth');
          setWallet({ main: 0, interest: 0 });
        }

        return result;
      }
      return result;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider value={{
      user, setUser, updateUser,
      isAuthenticated, login, loginWithGoogle, logout,
      theme, setTheme, toggleTheme,
      packages, addPackage, updatePackage, deletePackage, toggleFreezePackage,
      wallet, depositToWallet, withdrawFromWallet, allocateToPackage,
      transactions, addTransaction, processRepayment, processReserveDeduction,
      walletTransactions, loading, useApi, signup
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}