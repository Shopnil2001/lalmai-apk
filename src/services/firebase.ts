import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CONFIG } from './config';

let app;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Initialize Firebase only if mock data is turned off and config is filled
const isFirebaseConfigured = 
  CONFIG.firebase.apiKey !== 'YOUR_API_KEY' && 
  CONFIG.firebase.projectId !== 'your-project-id';

if (!CONFIG.USE_MOCK_DATA && isFirebaseConfigured) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(CONFIG.firebase);
      
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
      
      db = getFirestore(app);
      console.log('Firebase initialized successfully.');
    } else {
      app = getApp();
      auth = getAuth(app);
      db = getFirestore(app);
    }
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
} else {
  console.log('Running in MOCK mode or Firebase not fully configured. Using simulated services.');
}

export { auth, db };
export const hasRealFirebase = isFirebaseConfigured && !CONFIG.USE_MOCK_DATA;

let secondaryAuth: Auth | null = null;
export const getSecondaryAuth = (): Auth | null => {
  if (!hasRealFirebase) return null;
  if (secondaryAuth) return secondaryAuth;
  try {
    const apps = getApps();
    const secApp = apps.find(a => a.name === 'SecondaryApp') || initializeApp(CONFIG.firebase, 'SecondaryApp');
    secondaryAuth = initializeAuth(secApp, {});
    return secondaryAuth;
  } catch (error) {
    console.error('Failed to initialize secondary Auth app:', error);
    return null;
  }
};

