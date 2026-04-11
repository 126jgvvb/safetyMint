import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "your-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abc123",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XXXXXXXXXX"
};

class FirebaseService {
  constructor() {
    this.app = null;
    this.analytics = null;
    this.auth = null;
    this.db = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.app = initializeApp(firebaseConfig);
      this.analytics = getAnalytics(this.app);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this.isInitialized = true;
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  }

  async registerWithEmail(email, password, displayName, phoneNumber = null) {
    await this.initialize();

    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      if (displayName) {
        await updateProfile(user, { displayName });
      }

      await sendEmailVerification(user);

      await this.createUserProfile(user.uid, {
        email,
        displayName,
        phoneNumber,
        createdAt: serverTimestamp(),
        emailVerified: false,
        provider: 'email'
      });

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified
        },
        message: 'Registration successful. Please check your email to verify your account.'
      };
    } catch (error) {
      return this.handleAuthError(error);
    }
  }

  async loginWithEmail(email, password) {
    await this.initialize();

    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        await this.sendVerificationEmail();
        await signOut(this.auth);
        return {
          success: false,
          message: 'Please verify your email before logging in. A new verification email has been sent.'
        };
      }

      await this.updateUserLastLogin(user.uid);

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified
        },
        message: 'Login successful'
      };
    } catch (error) {
      return this.handleAuthError(error);
    }
  }

  async loginWithGoogle() {
    await this.initialize();

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;

      const profileResult = await this.getUserProfile(user.uid);

      if (profileResult.success) {
        await this.updateUserLastLogin(user.uid);
      } else {
        // Create profile for new Google user
        await this.createUserProfile(user.uid, {
          email: user.email,
          displayName: user.displayName,
          phoneNumber: null,
          createdAt: serverTimestamp(),
          emailVerified: user.emailVerified,
          provider: 'google'
        });
      }

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified
        },
        message: 'Google login successful'
      };
    } catch (error) {
      return this.handleAuthError(error);
    }
  }

  async logout() {
    await this.initialize();

    try {
      await signOut(this.auth);
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async resetPassword(email) {
    await this.initialize();

    try {
      await sendPasswordResetEmail(this.auth, email);
      return {
        success: true,
        message: 'Password reset email sent. Check your inbox.'
      };
    } catch (error) {
      return this.handleAuthError(error);
    }
  }

  async sendVerificationEmail() {
    await this.initialize();

    try {
      if (this.auth.currentUser) {
        await sendEmailVerification(this.auth.currentUser);
        return { success: true, message: 'Verification email sent' };
      }
      return { success: false, message: 'No user logged in' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async createUserProfile(uid, userData) {
    await this.initialize();

    try {
      await setDoc(doc(this.db, 'users', uid), {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error creating user profile:', error);
      return { success: false, message: error.message };
    }
  }

  async getUserProfile(uid) {
    await this.initialize();

    try {
      const docRef = doc(this.db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { success: true, data: docSnap.data() };
      }
      return { success: false, message: 'User profile not found' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updateUserProfile(uid, userData) {
    await this.initialize();

    try {
      const docRef = doc(this.db, 'users', uid);
      await updateDoc(docRef, {
        ...userData,
        updatedAt: serverTimestamp()
      });
      return { success: true, message: 'Profile updated successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async updateUserLastLogin(uid) {
    await this.initialize();

    try {
      const docRef = doc(this.db, 'users', uid);
      await updateDoc(docRef, {
        lastLoginAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  onAuthStateChanged(callback) {
    if (!this.auth) {
      return this.initialize().then(() => {
        return onAuthStateChanged(this.auth, callback);
      });
    } else {
      return onAuthStateChanged(this.auth, callback);
    }
  }

  getCurrentUser() {
    return this.auth?.currentUser || null;
  }

  isEmailVerified() {
    return this.auth?.currentUser?.emailVerified || false;
  }

  handleAuthError(error) {
    const errorCodes = {
      'auth/email-already-in-use': {
        success: false,
        message: 'This email is already registered. Please login or reset your password.'
      },
      'auth/invalid-email': {
        success: false,
        message: 'Invalid email address format.'
      },
      'auth/operation-not-allowed': {
        success: false,
        message: 'Operation not allowed. Please contact support.'
      },
      'auth/weak-password': {
        success: false,
        message: 'Password is too weak. Use at least 6 characters.'
      },
      'auth/user-disabled': {
        success: false,
        message: 'This account has been disabled. Contact support for help.'
      },
      'auth/user-not-found': {
        success: false,
        message: 'No account found with this email. Please register first.'
      },
      'auth/wrong-password': {
        success: false,
        message: 'Incorrect password. Please try again.'
      },
      'auth/invalid-credential': {
        success: false,
        message: 'Invalid login credentials. Please try again.'
      },
      'auth/too-many-requests': {
        success: false,
        message: 'Too many failed attempts. Please try again later or reset your password.'
      },
      'auth/network-request-failed': {
        success: false,
        message: 'Network error. Please check your internet connection.'
      }
    };

    return errorCodes[error.code] || {
      success: false,
      message: error.message || 'An error occurred. Please try again.'
    };
  }

  getAuthInstance() {
    return this.auth;
  }

  getDbInstance() {
    return this.db;
  }
}

export const firebaseService = new FirebaseService();
export default firebaseService;