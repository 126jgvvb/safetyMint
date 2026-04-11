const SESSION_CONFIG = {
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
  WARNING_BEFORE: 5 * 60 * 1000, // 5 minutes warning before timeout
  EXTENDED_SESSION: 60 * 60 * 1000, // 1 hour for "Remember Me"
  STORAGE_PREFIX: 'sm_',
};

const sessionStorageWrapper = {
  set: (key, value) => {
    try {
      const serialized = typeof value === 'object' ? JSON.stringify(value) : value;
      window.sessionStorage.setItem(SESSION_CONFIG.STORAGE_PREFIX + key, serialized);
      return true;
    } catch (error) {
      console.error('Session storage set error:', error);
      return false;
    }
  },

  get: (key) => {
    try {
      const item = window.sessionStorage.getItem(SESSION_CONFIG.STORAGE_PREFIX + key);
      if (!item) return null;
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    } catch (error) {
      console.error('Session storage get error:', error);
      return null;
    }
  },

  remove: (key) => {
    try {
      window.sessionStorage.removeItem(SESSION_CONFIG.STORAGE_PREFIX + key);
      return true;
    } catch (error) {
      console.error('Session storage remove error:', error);
      return false;
    }
  },

  clear: () => {
    try {
      const keys = Object.keys(window.sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(SESSION_CONFIG.STORAGE_PREFIX)) {
          window.sessionStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Session storage clear error:', error);
      return false;
    }
  }
};

const localStorageWrapper = {
  set: (key, value, remember = false) => {
    try {
      const serialized = typeof value === 'object' ? JSON.stringify(value) : value;
      if (remember) {
        window.localStorage.setItem(SESSION_CONFIG.STORAGE_PREFIX + key, serialized);
      }
      sessionStorageWrapper.set(key, value);
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  },

  get: (key) => {
    return sessionStorageWrapper.get(key);
  },

  remove: (key, rememberOnly = false) => {
    try {
      if (!rememberOnly) {
        sessionStorageWrapper.remove(key);
      }
      window.localStorage.removeItem(SESSION_CONFIG.STORAGE_PREFIX + key + '_remember');
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }
};

class SessionService {
  constructor() {
    this.sessionTimeout = null;
    this.warningTimeout = null;
    this.listeners = new Set();
    this.sessionStartTime = null;
    this.isActive = false;
    this.lastActivity = Date.now();
    this.rememberMe = false;
  }

  init(rememberMe = false) {
    this.rememberMe = rememberMe;
    this.startSession();
    this.setupActivityListeners();
    this.checkExistingSession();
  }

  startSession() {
    this.sessionStartTime = Date.now();
    this.isActive = true;
    this.lastActivity = Date.now();
    this.resetTimers();
    this.notifyListeners('session_started', { rememberMe: this.rememberMe });
  }

  resetTimers() {
    this.clearTimers();

    const timeout = this.rememberMe ? SESSION_CONFIG.EXTENDED_SESSION : SESSION_CONFIG.SESSION_TIMEOUT;

    this.warningTimeout = setTimeout(() => {
      this.notifyListeners('session_warning', {
        remainingTime: SESSION_CONFIG.WARNING_BEFORE,
        message: 'Your session will expire soon. Click to continue.'
      });
    }, timeout - SESSION_CONFIG.WARNING_BEFORE);

    this.sessionTimeout = setTimeout(() => {
      this.endSession();
    }, timeout);
  }

  extendSession() {
    if (this.isActive) {
      this.resetTimers();
      this.lastActivity = Date.now();
      this.notifyListeners('session_extended', { timestamp: Date.now() });
    }
  }

  clearTimers() {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }
  }

  setupActivityListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    this.activityHandler = () => {
      if (this.isActive) {
        this.lastActivity = Date.now();
      }
    };

    events.forEach(event => {
      window.addEventListener(event, this.activityHandler, { passive: true });
    });
  }

  removeActivityListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    if (this.activityHandler) {
      events.forEach(event => {
        window.removeEventListener(event, this.activityHandler);
      });
    }
  }

  endSession() {
    this.clearTimers();
    this.removeActivityListeners();
    this.isActive = false;
    sessionStorageWrapper.clear();
    localStorageWrapper.remove('authToken', true);
    localStorageWrapper.remove('userData', true);
    localStorageWrapper.remove('sessionInfo', true);
    this.notifyListeners('session_ended', { reason: 'timeout' });
  }

  destroySession() {
    this.clearTimers();
    this.removeActivityListeners();
    this.isActive = false;
    sessionStorageWrapper.clear();
    localStorageWrapper.remove('authToken', true);
    localStorageWrapper.remove('userData', true);
    localStorageWrapper.remove('sessionInfo', true);
    this.notifyListeners('session_ended', { reason: 'logout' });
  }

  checkExistingSession() {
    const token = sessionStorageWrapper.get('authToken');
    const userData = sessionStorageWrapper.get('userData');
    const sessionInfo = sessionStorageWrapper.get('sessionInfo');

    if (token && userData && sessionInfo) {
      const elapsed = Date.now() - (sessionInfo.startTime || 0);
      const timeout = this.rememberMe ? SESSION_CONFIG.EXTENDED_SESSION : SESSION_CONFIG.SESSION_TIMEOUT;

      if (elapsed < timeout) {
        this.notifyListeners('session_restored', { userData, elapsed });
        return true;
      } else {
        this.endSession();
      }
    }
    return false;
  }

  saveSession(token, userData, rememberMe = false) {
    const sessionInfo = {
      userId: userData.id || userData.uid,
      accountType: userData.accountType || 'user',
      startTime: Date.now(),
      lastActivity: Date.now(),
      rememberMe,
      expiresAt: Date.now() + (rememberMe ? SESSION_CONFIG.EXTENDED_SESSION : SESSION_CONFIG.SESSION_TIMEOUT),
    };

    localStorageWrapper.set('sessionInfo', sessionInfo, rememberMe);
    sessionStorageWrapper.set('sessionInfo', sessionInfo);

    if (token) {
      localStorageWrapper.set('authToken', token, rememberMe);
      sessionStorageWrapper.set('authToken', token);
    }

    if (userData) {
      localStorageWrapper.set('userData', userData, rememberMe);
      sessionStorageWrapper.set('userData', userData);
    }

    if (rememberMe) {
      localStorageWrapper.set('rememberMe', true, true);
    }
  }

  getSession() {
    return {
      token: sessionStorageWrapper.get('authToken'),
      userData: sessionStorageWrapper.get('userData'),
      sessionInfo: sessionStorageWrapper.get('sessionInfo'),
      isActive: this.isActive,
      elapsed: this.sessionStartTime ? Date.now() - this.sessionStartTime : 0,
      remaining: this.getRemainingTime(),
    };
  }

  getRemainingTime() {
    if (!this.sessionStartTime || !this.isActive) return 0;
    const timeout = this.rememberMe ? SESSION_CONFIG.EXTENDED_SESSION : SESSION_CONFIG.SESSION_TIMEOUT;
    const elapsed = Date.now() - this.sessionStartTime;
    return Math.max(0, timeout - elapsed);
  }

  isAuthenticated() {
    const token = sessionStorageWrapper.get('authToken');
    const userData = sessionStorageWrapper.get('userData');
    return !!(token && userData && this.isActive);
  }

  getUserRole() {
    const userData = sessionStorageWrapper.get('userData');
    return userData?.accountType || null;
  }

  hasFeature(feature) {
    const userData = sessionStorageWrapper.get('userData');
    return userData?.features?.includes(feature) || false;
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Session listener error:', error);
      }
    });
  }

  formatRemainingTime(ms) {
    if (ms <= 0) return '0:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  checkRememberMe() {
    try {
      return window.localStorage.getItem(SESSION_CONFIG.STORAGE_PREFIX + 'rememberMe') === 'true';
    } catch {
      return false;
    }
  }
}

export const sessionService = new SessionService();
export { SESSION_CONFIG };
export default sessionService;