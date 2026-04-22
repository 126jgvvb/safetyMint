const SESSION_CONFIG = {
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
  WARNING_BEFORE: 5 * 60 * 1000, // 5 minutes warning before timeout
  EXTENDED_SESSION: 60 * 60 * 1000, // 1 hour for "Remember Me"
  STORAGE_PREFIX: 'sm_',
  IDLE_TIMEOUT: 15 * 60 * 1000, // 15 minutes of inactivity marks as idle
  TRACKING_INTERVAL: 30 * 1000, // Track active time every 30 seconds
};

const API_BASE = 'http://localhost:3001/api';

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
    
    // Tracking metrics
    this.pageViews = 0;
    this.userActions = 0;
    this.activeTime = 0; // milliseconds
    this.idleTime = 0; // milliseconds
    this.trackingInterval = null;
    this.idleCheckInterval = null;
    this.currentPage = null;
    this.isIdle = false;
    this.sessionMetrics = {
      pagesVisited: [],
      actions: [],
      timestamps: [],
    };
  }

  init(rememberMe = false) {
    this.rememberMe = rememberMe;
    this.startSession();
    this.setupActivityListeners();
    this.setupTracking();
    this.checkExistingSession();
  }

  startSession() {
    this.sessionStartTime = Date.now();
    this.isActive = true;
    this.lastActivity = Date.now();
    this.resetTimers();
    this.startTracking();
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
      
      // Save current metrics
      const metricsData = {
        pageViews: this.pageViews,
        userActions: this.userActions,
        activeTime: this.activeTime,
        idleTime: this.idleTime,
        sessionMetrics: this.sessionMetrics,
      };
      sessionStorageWrapper.set('sessionMetrics', metricsData);
      
      this.notifyListeners('session_extended', { 
        timestamp: Date.now(),
        metrics: this.getSessionMetrics() 
      });
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
    // Remove any existing listeners first to prevent duplicates
    this.removeActivityListeners();

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    this.activityHandler = () => {
      if (this.isActive) {
        this.lastActivity = Date.now();
        if (this.isIdle) {
          this.isIdle = false;
          this.notifyListeners('user_active', { timestamp: Date.now() });
        }
      }
    };

    events.forEach(event => {
      window.addEventListener(event, this.activityHandler, { passive: true });
    });
  }

  setupTracking() {
    // Clear any existing intervals first to prevent duplicates
    this.stopTracking();

    // Track active time every interval
    this.trackingInterval = setInterval(() => {
      if (this.isActive && !this.isIdle) {
        this.activeTime += SESSION_CONFIG.TRACKING_INTERVAL;
        this.sessionMetrics.timestamps.push({
          timestamp: Date.now(),
          type: 'active',
          duration: SESSION_CONFIG.TRACKING_INTERVAL,
        });
      } else if (this.isIdle) {
        this.idleTime += SESSION_CONFIG.TRACKING_INTERVAL;
      }
    }, SESSION_CONFIG.TRACKING_INTERVAL);

    // Persist metrics every minute
    this.metricsPersistInterval = setInterval(() => {
      this.persistMetrics();
    }, 60 * 1000);

    // Check for idle status every 30 seconds
    this.idleCheckInterval = setInterval(() => {
      this.checkIdleStatus();
    }, 30 * 1000);

    // Track page view on route changes (if using React Router)
    this.setupRouterTracking();
  }

  startTracking() {
    this.isIdle = false;
  }

  stopTracking() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }
    if (this.metricsPersistInterval) {
      clearInterval(this.metricsPersistInterval);
      this.metricsPersistInterval = null;
    }
    if (this.routerObserver) {
      this.routerObserver.disconnect();
      this.routerObserver = null;
    }
  }

  checkIdleStatus() {
    if (!this.isActive) return;
    
    const timeSinceActivity = Date.now() - this.lastActivity;
    if (timeSinceActivity >= SESSION_CONFIG.IDLE_TIMEOUT && !this.isIdle) {
      this.isIdle = true;
      this.notifyListeners('user_idle', { 
        idleTime: timeSinceActivity,
        timestamp: Date.now() 
      });
    }
  }

  trackPageView(page) {
    if (!this.isActive) return;
    
    this.pageViews++;
    const pageVisit = {
      page,
      timestamp: Date.now(),
      referrer: document.referrer || 'direct',
    };
    this.sessionMetrics.pagesVisited.push(pageVisit);
    this.notifyListeners('page_view', pageVisit);
  }

  trackAction(action, data = {}) {
    if (!this.isActive) return;
    
    this.userActions++;
    const actionEvent = {
      action,
      data,
      timestamp: Date.now(),
    };
    this.sessionMetrics.actions.push(actionEvent);
    this.notifyListeners('user_action', actionEvent);
  }

  setupRouterTracking() {
    // Listen to React Router navigation if available
    if (typeof window !== 'undefined' && window.location) {
      let currentPath = window.location.pathname;
      this.trackPageView(currentPath);
      
      // Use MutationObserver to detect route changes in SPA
      const observer = new MutationObserver(() => {
        const newPath = window.location.pathname;
        if (newPath !== currentPath) {
          currentPath = newPath;
          this.trackPageView(currentPath);
        }
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
      this.routerObserver = observer;
    }
  }

  removeActivityListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    if (this.activityHandler) {
      events.forEach(event => {
        window.removeEventListener(event, this.activityHandler);
      });
    }
  }

  stopAllTracking() {
    this.stopTracking();
    if (this.routerObserver) {
      this.routerObserver.disconnect();
    }
  }

  endSession() {
    this.clearTimers();
    this.stopAllTracking();
    this.isActive = false;
    const sessionData = this.prepareSessionEndData('timeout');
    this.sendSessionMetrics(sessionData);
    sessionStorageWrapper.clear();
    localStorageWrapper.remove('authToken', true);
    localStorageWrapper.remove('userData', true);
    localStorageWrapper.remove('sessionInfo', true);
    this.notifyListeners('session_ended', { reason: 'timeout', metrics: sessionData });
  }

  destroySession() {
    this.clearTimers();
    this.stopAllTracking();
    this.isActive = false;
    const sessionData = this.prepareSessionEndData('logout');
    this.sendSessionMetrics(sessionData);
    sessionStorageWrapper.clear();
    localStorageWrapper.remove('authToken', true);
    localStorageWrapper.remove('userData', true);
    localStorageWrapper.remove('sessionInfo', true);
    this.notifyListeners('session_ended', { reason: 'logout', metrics: sessionData });
  }

  checkExistingSession() {
    const token = sessionStorageWrapper.get('authToken');
    const userData = sessionStorageWrapper.get('userData');
    const sessionInfo = sessionStorageWrapper.get('sessionInfo');
    const savedMetrics = sessionStorageWrapper.get('sessionMetrics');

    if (token && userData && sessionInfo) {
      const elapsed = Date.now() - (sessionInfo.startTime || 0);
      const timeout = this.rememberMe ? SESSION_CONFIG.EXTENDED_SESSION : SESSION_CONFIG.SESSION_TIMEOUT;

      if (elapsed < timeout) {
        // Restore tracking state
        if (savedMetrics) {
          this.pageViews = savedMetrics.pageViews || 0;
          this.userActions = savedMetrics.userActions || 0;
          this.activeTime = savedMetrics.activeTime || 0;
          this.idleTime = savedMetrics.idleTime || 0;
          this.sessionMetrics = savedMetrics.sessionMetrics || this.sessionMetrics;
        }
        this.sessionStartTime = sessionInfo.startTime || Date.now() - elapsed;
        this.isActive = true;
        this.lastActivity = Date.now();
        this.startTracking();
        this.setupTracking(); // Restart tracking intervals
        this.resetTimers();
        this.notifyListeners('session_restored', { userData, elapsed, metrics: this.getSessionMetrics() });
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

    const metricsData = {
      pageViews: this.pageViews,
      userActions: this.userActions,
      activeTime: this.activeTime,
      idleTime: this.idleTime,
      sessionMetrics: this.sessionMetrics,
    };

    localStorageWrapper.set('sessionInfo', sessionInfo, rememberMe);
    sessionStorageWrapper.set('sessionInfo', sessionInfo);
    sessionStorageWrapper.set('sessionMetrics', metricsData);

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
      metrics: this.getSessionMetrics(),
    };
  }

  getRemainingTime() {
    if (!this.sessionStartTime || !this.isActive) return 0;
    const timeout = this.rememberMe ? SESSION_CONFIG.EXTENDED_SESSION : SESSION_CONFIG.SESSION_TIMEOUT;
    const elapsed = Date.now() - this.sessionStartTime;
    return Math.max(0, timeout - elapsed);
  }

  persistMetrics() {
    const metricsData = {
      pageViews: this.pageViews,
      userActions: this.userActions,
      activeTime: this.activeTime,
      idleTime: this.idleTime,
      sessionMetrics: this.sessionMetrics,
    };
    sessionStorageWrapper.set('sessionMetrics', metricsData);
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

  prepareSessionEndData(reason) {
    const sessionInfo = sessionStorageWrapper.get('sessionInfo') || {};
    const now = Date.now();
    
    return {
      sessionId: sessionInfo.userId || 'unknown',
      startTime: this.sessionStartTime,
      endTime: now,
      duration: now - this.sessionStartTime,
      activeTime: this.activeTime,
      idleTime: this.idleTime,
      pageViews: this.pageViews,
      userActions: this.userActions,
      pagesVisited: this.sessionMetrics.pagesVisited,
      reason,
      rememberMe: this.rememberMe,
      userAgent: navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
    };
  }

  async sendSessionMetrics(metrics) {
    try {
      const token = sessionStorageWrapper.get('authToken');
      if (!token) {
        console.log('No auth token, skipping session metrics send');
        return;
      }
      
      const response = await fetch(`${API_BASE}/analytics/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(metrics),
      });
      
      if (!response.ok) {
        console.warn('Failed to send session metrics:', response.status, await response.text());
      } else {
        console.log('Session metrics sent successfully');
      }
    } catch (error) {
      console.error('Error sending session metrics:', error);
    }
  }

  getSessionMetrics() {
    return {
      pageViews: this.pageViews,
      userActions: this.userActions,
      activeTime: this.activeTime,
      idleTime: this.idleTime,
      sessionDuration: this.sessionStartTime ? Date.now() - this.sessionStartTime : 0,
      pagesVisited: this.sessionMetrics.pagesVisited.map(p => p.page),
      actions: this.sessionMetrics.actions.map(a => a.action),
    };
  }

  getTrackingSummary() {
    const session = this.getSession();
    return {
      ...session,
      metrics: this.getSessionMetrics(),
    };
  }

  trackCustomEvent(eventName, properties = {}) {
    this.trackAction('custom_event', { eventName, ...properties });
  }
}

export const sessionService = new SessionService();
export { SESSION_CONFIG };
export default sessionService;