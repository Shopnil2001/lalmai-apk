import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { authService } from '../services/authService';
import { UserProfile } from '../services/mockData';
import { auth, hasRealFirebase } from '../services/firebase';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasPermission: (permission: keyof NonNullable<UserProfile['permissions']>) => boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (nativeIdToken?: string) => Promise<void>;
  sendPhoneOTP: (phoneNumber: string, recaptchaVerifier: any) => Promise<any>;
  verifyPhoneOTP: (confirmationResult: any, code: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    phone: string;
    drivingLicense?: string;
    registrationNumber?: string;
    role?: UserProfile['role'];
    area?: string;
  }, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const authActionInProgress = useRef<boolean>(false);
  const isFirstLoad = useRef<boolean>(true);

  // Sync auth state on startup and handle transitions
  useEffect(() => {
    let unsubscribe: () => void = () => {};

    async function loadInitialSession() {
      try {
        const session = await authService.getCurrentSession();
        setUser(session);
      } catch (error) {
        console.error('Failed to load initial authentication session', error);
      } finally {
        // If in mock mode, initialization is complete.
        // In live Firebase mode, onAuthStateChanged callback will set isLoading to false.
        if (!hasRealFirebase) {
          setIsLoading(false);
        }
      }
    }

    // Load cached session fast
    loadInitialSession();

    // Set up real Firebase Auth state listener if enabled
    if (hasRealFirebase && auth) {
      const { onAuthStateChanged, signOut } = require('firebase/auth');
      const { doc, getDoc } = require('firebase/firestore');
      const { db } = require('../services/firebase');
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
        // If an authentication action is already processing, let it handle state changes.
        if (authActionInProgress.current) {
          return;
        }

        if (isFirstLoad.current) {
          setIsLoading(true);
        }

        if (firebaseUser) {
          try {
            // Fetch/Sync the Firestore user profile document
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              const profile = userDoc.data() as UserProfile;
              setUser(profile);
              await AsyncStorage.setItem('LRC_CURRENT_USER_SESSION', JSON.stringify(profile));
            } else {
              // No user profile in Firestore yet, reset user to null
              setUser(null);
              await AsyncStorage.removeItem('LRC_CURRENT_USER_SESSION');
              await signOut(auth);
            }
          } catch (error) {
            console.error('Error syncing user profile from Firestore:', error);
            setUser(null);
            try {
              await signOut(auth);
            } catch (signOutErr) {
              console.error('Failed to sign out after profile sync error:', signOutErr);
            }
          } finally {
            isFirstLoad.current = false;
            setIsLoading(false);
          }
        } else {
          // No user is authenticated in Firebase Auth. Clean up local session.
          setUser(null);
          await AsyncStorage.removeItem('LRC_CURRENT_USER_SESSION');
          isFirstLoad.current = false;
          setIsLoading(false);
        }
      });
    }

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    authActionInProgress.current = true;
    try {
      const profile = await authService.login(email, password);
      setUser(profile);
    } catch (error: any) {
      console.error('[AuthContext] login failed:', error?.code, error?.message);
      setUser(null);
      if (hasRealFirebase && auth) {
        try {
          const { signOut } = require('firebase/auth');
          await signOut(auth);
        } catch {}
      }
      throw error;
    } finally {
      // Small delay so the signOut-triggered onAuthStateChanged fires while
      // authActionInProgress is still true, preventing a page-unmount race.
      await new Promise(resolve => setTimeout(resolve, 100));
      authActionInProgress.current = false;
    }
  };

  const loginWithGoogle = async (nativeIdToken?: string) => {
    authActionInProgress.current = true;
    try {
      const profile = await authService.loginWithGoogle(nativeIdToken);
      setUser(profile);
    } catch (error: any) {
      console.error('[AuthContext] loginWithGoogle failed:', error?.code, error?.message);
      setUser(null);
      if (hasRealFirebase && auth) {
        try {
          const { signOut } = require('firebase/auth');
          await signOut(auth);
        } catch {}
      }
      throw error;
    } finally {
      await new Promise(resolve => setTimeout(resolve, 100));
      authActionInProgress.current = false;
    }
  };

  const sendPhoneOTP = async (phoneNumber: string, recaptchaVerifier: any) => {
    try {
      const result = await authService.sendPhoneOTP(phoneNumber, recaptchaVerifier);
      return result;
    } finally {
      // Nothing needed here
    }
  };

  const verifyPhoneOTP = async (confirmationResult: any, code: string) => {
    authActionInProgress.current = true;
    try {
      const profile = await authService.verifyPhoneOTP(confirmationResult, code);
      setUser(profile);
    } catch (error: any) {
      console.error('[AuthContext] verifyPhoneOTP failed:', error?.code, error?.message);
      setUser(null);
      if (hasRealFirebase && auth) {
        try {
          const { signOut } = require('firebase/auth');
          await signOut(auth);
        } catch {}
      }
      throw error;
    } finally {
      await new Promise(resolve => setTimeout(resolve, 100));
      authActionInProgress.current = false;
    }
  };

  const register = async (
    data: {
      name: string;
      email: string;
      phone: string;
      drivingLicense?: string;
      registrationNumber?: string;
      role?: UserProfile['role'];
      area?: string;
    },
    password: string
  ) => {
    authActionInProgress.current = true;
    try {
      const profile = await authService.register(data, password);
      setUser(profile);
    } catch (error: any) {
      console.error('[AuthContext] register failed:', error?.code, error?.message);
      setUser(null);
      if (hasRealFirebase && auth) {
        try {
          const { signOut } = require('firebase/auth');
          await signOut(auth);
        } catch {}
      }
      throw error;
    } finally {
      await new Promise(resolve => setTimeout(resolve, 100));
      authActionInProgress.current = false;
    }
  };

  const logout = async () => {
    authActionInProgress.current = true;
    try {
      await authService.logout();
      setUser(null);
    } finally {
      authActionInProgress.current = false;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No authenticated user session');
    try {
      const updated = await authService.updateProfile(user.uid, updates);
      setUser(updated);
    } catch (error) {
      console.error('Failed to update profile', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      if (hasRealFirebase && auth?.currentUser) {
        const { doc, getDoc } = require('firebase/firestore');
        const { db } = require('../services/firebase');
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const updated = userDoc.data() as UserProfile;
          setUser(updated);
          await AsyncStorage.setItem('LRC_CURRENT_USER_SESSION', JSON.stringify(updated));
          return;
        }
      }
      const session = await authService.getCurrentSession();
      setUser(session);
    } catch (error) {
      console.error('Failed to refresh user profile', error);
    }
  };

  // Roles calculation
  const isAdmin = user 
    ? ['Super Admin', 'Admin'].includes(user.role)
    : false;

  const isSuperAdmin = user?.role === 'Super Admin';

  const hasPermission = (permission: keyof NonNullable<UserProfile['permissions']>): boolean => {
    if (!user) return false;
    if (user.role === 'Super Admin') return true;
    if (user.role === 'Admin' && user.permissions) {
      return !!user.permissions[permission];
    }
    return false;
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isAdmin,
        isSuperAdmin,
        hasPermission,
        login,
        loginWithGoogle,
        sendPhoneOTP,
        verifyPhoneOTP,
        register,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
