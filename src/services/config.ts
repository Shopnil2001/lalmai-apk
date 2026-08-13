/**
 * Configuration file for the LRC application.
 * Set USE_MOCK_DATA to false when ready to connect to real Firebase and Cloudinary.
 */
export const CONFIG = {
  // Checks if the env variable is explicitly set to 'false' (if empty or 'true', defaults to mock mode)
  USE_MOCK_DATA: process.env.EXPO_PUBLIC_USE_MOCK_DATA !== 'false',

  // Firebase Configuration (binds to environment variables)
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "your-project-id.firebaseapp.com",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "your-project-id",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "your-project-id.appspot.com",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "your-messaging-sender-id",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "your-app-id",
  },

  // Cloudinary Configuration (binds to environment variables)
  cloudinary: {
    cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || "your-cloud-name",
    uploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "your-unsigned-upload-preset",
  }
};
