import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPhoneNumber,
  ApplicationVerifier,
  ConfirmationResult,
  sendPasswordResetEmail,
  updatePassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, hasRealFirebase } from './firebase';
import { mockDB, UserProfile } from './mockData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseErrorMessage } from '../utils/firebaseErrors';

const CURRENT_USER_KEY = 'LRC_CURRENT_USER_SESSION';

const cleanPhoneNumber = (num: string): string => {
  return num.replace(/\D/g, '');
};

const comparePhoneNumbers = (phone1: string, phone2: string): boolean => {
  const p1 = cleanPhoneNumber(phone1);
  const p2 = cleanPhoneNumber(phone2);
  if (!p1 || !p2) return false;
  return p1.slice(-10) === p2.slice(-10);
};

export const authService = {
  // Get currently saved session (essential for app auto-login)
  getCurrentSession: async (): Promise<UserProfile | null> => {
    try {
      const data = await AsyncStorage.getItem(CURRENT_USER_KEY);
      if (!data) return null;

      const parsed = JSON.parse(data);

      if (hasRealFirebase && auth) {
        // CRITICAL: Cross-check cached UID against Firebase Auth's current user.
        // If Firebase has no active session, or the UIDs differ (e.g. someone else
        // was logged in on this device previously), clear the stale cache immediately.
        const currentUid = auth.currentUser?.uid ?? null;
        if (!currentUid || currentUid !== parsed.uid) {
          await AsyncStorage.removeItem(CURRENT_USER_KEY);
          return null;
        }
        // UIDs match — return cached profile fast; onAuthStateChanged will sync later.
        return parsed;
      } else {
        // Mock mode — sync with in-memory mock db
        const users = await mockDB.getUsers();
        const synced = users.find(u => u.uid === parsed.uid);
        if (synced) {
          await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(synced));
          return synced;
        }
        await AsyncStorage.removeItem(CURRENT_USER_KEY);
        return null;
      }
    } catch {
      return null;
    }
  },

  // Login with Email or Phone
  login: async (emailOrPhone: string, password: string): Promise<UserProfile> => {
    const input = emailOrPhone.trim();
    let email = input.toLowerCase();
    
    // Check if the input is a phone number (e.g. contains only digits/dashes/spaces/plus)
    const isPhone = /^\+?[0-9\s\-]+$/.test(input) && input.replace(/\D/g, '').length >= 8;
    
    if (hasRealFirebase && auth && db) {
      if (isPhone) {
        const cleanPhone = input.replace(/\D/g, '');
        if (!cleanPhone) {
          throw new Error('Invalid phone number format.');
        }
        const { doc, getDoc } = require('firebase/firestore');
        const mappingDoc = await getDoc(doc(db, 'phone_mappings', cleanPhone));
        
        if (!mappingDoc.exists()) {
          throw new Error('No account found with this phone number. Please contact your administrator.');
        }
        const mappingData = mappingDoc.data();
        if (!mappingData || !mappingData.email) {
          throw new Error('This account does not have an email address associated for login.');
        }
        email = mappingData.email.toLowerCase();
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        await signOut(auth);
        throw new Error('Your account was not found in our system. Please register as a new member or contact the administrator.');
      }
      
      const profile = userDoc.data() as UserProfile;
      if (profile.status === 'suspended') {
        await signOut(auth);
        throw new Error('Your account has been suspended. Please contact the association administrator.');
      }
      
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
      return profile;
    } else {
      // MOCK Auth
      const users = await mockDB.getUsers();
      let user: UserProfile | undefined;
      
      if (isPhone) {
        user = users.find(u => u.phone && comparePhoneNumbers(u.phone, input));
        if (!user) {
          throw new Error('Invalid phone number or password.');
        }
      } else {
        user = users.find(u => u.email && u.email.toLowerCase() === email);
        if (!user) {
          throw new Error('Invalid email or password.');
        }
      }
      
      if (user.status === 'suspended') {
        throw new Error('Your account has been suspended. Please contact admin.');
      }
      
      const expectedPassword = user.password || 'password';
      if (password !== expectedPassword && password !== '123456') {
        throw new Error('Invalid credentials.');
      }

      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      return user;
    }
  },

  // Google Login
  loginWithGoogle: async (nativeIdToken?: string): Promise<UserProfile> => {
    if (hasRealFirebase && auth) {
      let idToken = nativeIdToken;

      // If no token was passed, and we are NOT running in Expo Go (meaning standalone APK or dev client),
      // we trigger the native Google Sign-in flow.
      const Constants = require('expo-constants').default;
      const isExpoGo = Constants.appOwnership === 'expo';
      
      if (!idToken && !isExpoGo) {
        try {
          const { GoogleSignin } = require('@react-native-google-signin/google-signin');
          
          // Configure native sign-in using the Web Client ID (required by Firebase to verify tokens)
          GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'your-google-web-client-id.apps.googleusercontent.com',
            offlineAccess: true,
          });
          
          await GoogleSignin.hasPlayServices();
          try {
            // Sign out and revoke native access before sign-in to force account selection dialog
            await GoogleSignin.signOut();
            await GoogleSignin.revokeAccess();
          } catch (cleanErr) {
            // Safe to ignore if there is no active session
          }
          const signInResult = await GoogleSignin.signIn();
          
          // In newer versions of the google-signin SDK, tokens are inside the data object
          idToken = signInResult.data?.idToken || signInResult.idToken;
          
          if (!idToken) {
            throw new Error('Google native ID Token was not returned by the SDK.');
          }
        } catch (err: any) {
          console.error('Native Google Sign-in error:', err);
          throw new Error(`Google native Sign-in failed: ${err.message}`);
        }
      }

      if (!idToken) {
        if (isExpoGo) {
          throw new Error('Standard Google Login requires standalone builds. For Expo Go development, please configure Google Client IDs in your .env to run redirect mode.');
        } else {
          throw new Error('No Google credentials returned.');
        }
      }
      
      const userCredential = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));

      const uid = userCredential.user.uid;
      const userDocRef = doc(db!, 'users', uid);
      const userDoc = await getDoc(userDocRef);

      let profile: UserProfile;
      if (!userDoc.exists()) {
        // First-time Google sign-up: create a pending profile
        profile = {
          uid,
          name: userCredential.user.displayName || '',
          email: userCredential.user.email || '',
          phone: userCredential.user.phoneNumber || '',
          role: 'General Member',
          status: 'pending',
          photoUrl: userCredential.user.photoURL || null,
          joinedAt: Date.now(),
          authProvider: 'google',
          profileComplete: false,
        };
        await setDoc(userDocRef, profile);
      } else {
        profile = userDoc.data() as UserProfile;
        // Guard: if this account was registered via a different method, block login
        if (profile.authProvider && profile.authProvider !== 'google') {
          await signOut(auth);
          throw new Error(
            `This account was registered using ${profile.authProvider === 'email' ? 'email & password' : 'phone number'}. ` +
            `Please sign in using that method instead.`
          );
        }
      }

      if (profile.status === 'suspended') {
        throw new Error('Your account has been suspended. Please contact admin.');
      }

      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
      return profile;
    } else {
      // MOCK Google Login: Return a user with profileComplete: false to test the registration onboarding
      const mockGoogleUser: UserProfile = {
        uid: 'google_mock_user',
        name: 'Google Driver',
        email: 'driver.google@lrc.com',
        phone: '',
        role: 'General Member',
        status: 'pending',
        photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        joinedAt: Date.now(),
        authProvider: 'google',
        profileComplete: false,
      };
      await mockDB.saveUser(mockGoogleUser);
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(mockGoogleUser));
      return mockGoogleUser;
    }
  },

  // Send Phone OTP using BulkSMSBD custom API gateway
  sendPhoneOTP: async (phoneNumber: string, recaptchaVerifier?: any): Promise<any> => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      throw new Error('Please enter a valid phone number.');
    }
    
    // Standardize to 11 digits format for BD local carriers, e.g. 017XXXXXXXX
    const formattedPhone = cleanPhone.slice(-11);
    
    if (hasRealFirebase && db && auth) {
      // 1. Verify that user exists in database
      let userProfile: UserProfile | null = null;
      const { doc, getDoc, collection, query, getDocs } = require('firebase/firestore');
      const mappingDoc = await getDoc(doc(db, 'phone_mappings', formattedPhone));
      if (mappingDoc.exists()) {
        const uid = mappingDoc.data().uid;
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          userProfile = userDoc.data() as UserProfile;
        }
      } else {
        // Fallback: check users collection by formatting phone number
        const q = query(collection(db, 'users'));
        const snapshot = await getDocs(q);
        const found = snapshot.docs.find((doc: any) => {
          const u = doc.data();
          return u.phone && u.phone.replace(/\D/g, '').slice(-11) === formattedPhone;
        });
        if (found) {
          userProfile = found.data() as UserProfile;
        }
      }
      
      if (!userProfile) {
        throw new Error('No registered account found with this phone number. Please contact the administrator.');
      }
      
      if (userProfile.status === 'suspended') {
        throw new Error('Your account has been suspended. Please contact the administrator.');
      }
      
      // 2. Generate random 6-digit OTP code
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      
      // 3. Save OTP in Firestore '/otps' collection
      const { setDoc } = require('firebase/firestore');
      await setDoc(doc(db, 'otps', formattedPhone), {
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
      });
      
      // 4. Send SMS via BulkSMSBD API
      const { smsService } = require('./smsService');
      const sent = await smsService.sendOTP(formattedPhone, otp);
      if (!sent) {
        throw new Error('Failed to send verification SMS via SMS Gateway. Please try again.');
      }
      
      return {
        phoneNumber: formattedPhone,
        simulated: false,
        confirm: async (code: string) => {
          const { doc, getDoc, deleteDoc } = require('firebase/firestore');
          const otpDocRef = doc(db, 'otps', formattedPhone);
          const otpDoc = await getDoc(otpDocRef);
          
          if (!otpDoc.exists()) {
            throw new Error('Verification code expired or not found. Please request a new code.');
          }
          
          const otpData = otpDoc.data();
          if (otpData.expiresAt < Date.now()) {
            await deleteDoc(otpDocRef);
            throw new Error('Verification code expired. Please request a new code.');
          }
          
          if (otpData.otp !== code.trim()) {
            throw new Error('Invalid verification code.');
          }
          
          // Delete code once verified
          await deleteDoc(otpDocRef);
          
          // Sign in using phone-derived email and static OTP password
          const derivedEmail = `${formattedPhone}@lrc.com`;
          const derivedPwd = `lrc_secure_otp_${formattedPhone.slice(-10)}_2026_salt`;
          
          const { signInWithEmailAndPassword } = require('firebase/auth');
          const userCredential = await signInWithEmailAndPassword(auth, derivedEmail, derivedPwd);
          const uid = userCredential.user.uid;
          
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (!userDoc.exists()) {
            throw new Error('User profile record not found.');
          }
          
          const profile = userDoc.data() as UserProfile;
          await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
          return profile;
        }
      };
    } else {
      // Mock mode OTP implementation
      const users = await mockDB.getUsers();
      const user = users.find(u => u.phone && u.phone.replace(/\D/g, '').slice(-11) === formattedPhone);
      
      if (!user) {
        throw new Error('Phone number not registered. Please contact the administrator.');
      }
      
      if (user.status === 'suspended') {
        throw new Error('Your account has been suspended.');
      }
      
      const simulatedOtp = '123456';
      console.log(`[MOCK OTP] Sent code '${simulatedOtp}' to ${formattedPhone}`);
      
      return {
        phoneNumber: formattedPhone,
        simulated: true,
        otpCode: simulatedOtp,
        confirm: async (code: string) => {
          if (code.trim() !== simulatedOtp && code.trim() !== '123456') {
            throw new Error('Invalid verification code.');
          }
          await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
          return user;
        }
      };
    }
  },

  // Verify Phone OTP (Backward compatible helper)
  verifyPhoneOTP: async (confirmationResult: any, code: string): Promise<UserProfile> => {
    return confirmationResult.confirm(code);
  },

  register: async (data: {
    name: string;
    email: string;
    phone: string;
    drivingLicense?: string;
    registrationNumber?: string;
    role?: UserProfile['role'];
    area?: string;
  }, password: string): Promise<UserProfile> => {
    const cleanEmail = data.email.trim().toLowerCase();
    
    // Set default admin permissions: viewAttendance: true, others: false
    const defaultPermissions = data.role === 'Admin' ? {
      viewDues: false,
      generateDues: false,
      manageMeetings: false,
      manageEvents: false,
      viewAttendance: true,
      takeAttendance: false
    } : undefined;

    if (hasRealFirebase && auth) {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const uid = userCredential.user.uid;
      
      const newProfile: UserProfile = {
        uid,
        name: data.name,
        email: cleanEmail,
        phone: data.phone,
        role: data.role || 'General Member',
        status: 'pending',
        photoUrl: null,
        drivingLicense: data.drivingLicense || '',
        registrationNumber: data.registrationNumber || '',
        joinedAt: Date.now(),
        area: data.area || '',
        authProvider: 'email',
        profileComplete: true,
        ...(defaultPermissions ? { permissions: defaultPermissions } : {}),
      };
      
      try {
        await setDoc(doc(db!, 'users', uid), newProfile);
        if (data.phone) {
          const cleanPhone = data.phone.replace(/\D/g, '');
          if (cleanPhone) {
            await setDoc(doc(db!, 'phone_mappings', cleanPhone), { email: cleanEmail, uid });
          }
        }
      } catch (dbError) {
        // ROLLBACK: Delete Auth user to free up email address if writing to Firestore fails
        try {
          const { deleteUser } = require('firebase/auth');
          await deleteUser(userCredential.user);
        } catch (rollbackError) {
          console.error('[AuthService] Registration rollback failed:', rollbackError);
        }
        throw dbError;
      }
      
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newProfile));
      return newProfile;
    } else {
      // MOCK Registration
      const users = await mockDB.getUsers();
      if (users.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
        throw new Error('Email already registered.');
      }
      
      const mockUid = 'user_' + Math.random().toString(36).substring(2, 9);
      const newProfile: UserProfile = {
        uid: mockUid,
        name: data.name,
        email: cleanEmail,
        phone: data.phone,
        role: data.role || 'General Member',
        status: data.role ? 'active' : 'pending',
        photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        drivingLicense: data.drivingLicense || '',
        registrationNumber: data.registrationNumber || '',
        joinedAt: Date.now(),
        area: data.area || '',
        ...(defaultPermissions ? { permissions: defaultPermissions } : {}),
      };
      
      await mockDB.saveUser(newProfile);
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newProfile));
      return newProfile;
    }
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      const Constants = require('expo-constants').default;
      const isExpoGo = Constants.appOwnership === 'expo';
      if (!isExpoGo) {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        // Clear Google Client cached tokens to allow choosing a different account next time
        await GoogleSignin.signOut();
      }
    } catch (err) {
      console.error('Failed to sign out of native Google client:', err);
    }

    if (hasRealFirebase && auth) {
      await signOut(auth);
    }
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
  },

  // Update profile details
  updateProfile: async (uid: string, updates: Partial<UserProfile>): Promise<UserProfile> => {
    const cleanUpdates: any = {};
    Object.keys(updates).forEach(key => {
      const val = (updates as any)[key];
      if (val !== undefined) {
        cleanUpdates[key] = val;
      }
    });

    if (hasRealFirebase && db) {
      const userDocRef = doc(db, 'users', uid);
      
      if (cleanUpdates.phone !== undefined || cleanUpdates.email !== undefined) {
        try {
          const currentDoc = await getDoc(userDocRef);
          if (currentDoc.exists()) {
            const currentData = currentDoc.data() as UserProfile;
            const oldPhone = currentData.phone ? currentData.phone.replace(/\D/g, '') : null;
            const newPhone = cleanUpdates.phone !== undefined 
              ? (cleanUpdates.phone ? cleanUpdates.phone.replace(/\D/g, '') : null) 
              : oldPhone;
            const emailToMap = (cleanUpdates.email || currentData.email || '').toLowerCase();
            
            if (newPhone) {
              await setDoc(doc(db, 'phone_mappings', newPhone), { email: emailToMap, uid });
              if (oldPhone && oldPhone !== newPhone) {
                const { deleteDoc } = require('firebase/firestore');
                await deleteDoc(doc(db, 'phone_mappings', oldPhone));
              }
            } else if (oldPhone) {
              const { deleteDoc } = require('firebase/firestore');
              await deleteDoc(doc(db, 'phone_mappings', oldPhone));
            }
          }
        } catch (mapErr) {
          console.error('[authService.updateProfile] Failed to update phone mapping:', mapErr);
        }
      }

      await setDoc(userDocRef, cleanUpdates, { merge: true });
      const refreshedDoc = await getDoc(userDocRef);
      const updated = refreshedDoc.data() as UserProfile;
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated));
      return updated;
    } else {
      const users = await mockDB.getUsers();
      const index = users.findIndex(u => u.uid === uid);
      if (index >= 0) {
        const updated = { ...users[index], ...cleanUpdates };
        await mockDB.saveUser(updated);
        await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated));
        return updated;
      }
      throw new Error('User profile not found.');
    }
  },

  sendPasswordReset: async (email: string): Promise<void> => {
    if (hasRealFirebase && auth) {
      await sendPasswordResetEmail(auth, email.trim());
    } else {
      console.log(`[MOCK AUTH] Password reset link sent to ${email}`);
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  },

  changePassword: async (newPassword: string): Promise<void> => {
    if (hasRealFirebase && auth && auth.currentUser) {
      await updatePassword(auth.currentUser, newPassword);
    } else {
      console.log(`[MOCK AUTH] Changed password for current user`);
      const session = await authService.getCurrentSession();
      if (session) {
        session.password = newPassword;
        await mockDB.saveUser(session);
        await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(session));
      }
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  },

  resetPasswordMock: async (email: string, newPassword: string): Promise<void> => {
    const cleanEmail = email.trim().toLowerCase();
    const users = await mockDB.getUsers();
    const user = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (!user) {
      throw new Error('User not found.');
    }
    user.password = newPassword;
    await mockDB.saveUser(user);
  }
};
