/**
 * Translates Firebase Auth error codes into user-friendly messages.
 * Covers all common auth/firestore error codes.
 */
export function getFirebaseErrorMessage(error: any): string {
  const code: string = error?.code || '';
  const rawMessage: string = error?.message || '';

  // Firebase Auth errors
  const authErrors: Record<string, string> = {
    'auth/invalid-credential':        'Incorrect email or password. Please try again.',
    'auth/wrong-password':            'Incorrect password. Please try again.',
    'auth/user-not-found':            'No account found with this email address.',
    'auth/email-already-in-use':      'This email is already registered. Please sign in instead.',
    'auth/invalid-email':             'Please enter a valid email address.',
    'auth/weak-password':             'Password must be at least 6 characters long.',
    'auth/user-disabled':             'This account has been disabled. Please contact support.',
    'auth/too-many-requests':         'Too many failed attempts. Please wait a few minutes and try again.',
    'auth/network-request-failed':    'Network error. Please check your internet connection and try again.',
    'auth/operation-not-allowed':     'This sign-in method is not enabled. Please contact the administrator.',
    'auth/requires-recent-login':     'For security, please sign out and sign back in to continue.',
    'auth/credential-already-in-use': 'This credential is already linked to a different account.',
    'auth/account-exists-with-different-credential': 'An account already exists with the same email but a different sign-in method.',
    'auth/popup-closed-by-user':      'Sign-in was cancelled. Please try again.',
    'auth/popup-blocked':             'Sign-in popup was blocked. Please allow popups and try again.',
    'auth/cancelled-popup-request':   'Sign-in was cancelled.',
    'auth/invalid-phone-number':      'Please enter a valid phone number with country code (e.g. +8801700000000).',
    'auth/missing-phone-number':      'Please enter your phone number.',
    'auth/quota-exceeded':            'SMS quota exceeded. Please try again later.',
    'auth/invalid-verification-code': 'The verification code you entered is incorrect. Please check and try again.',
    'auth/code-expired':              'The verification code has expired. Please request a new one.',
    'auth/missing-verification-code': 'Please enter the 6-digit verification code.',
    'auth/provider-already-linked':   'This sign-in method is already linked to your account.',
    'auth/no-such-provider':          'This sign-in method is not linked to your account.',
    'auth/session-expired':           'Your session has expired. Please sign in again.',
    'auth/id-token-expired':          'Your session has expired. Please sign in again.',
    'auth/user-token-expired':        'Your session has expired. Please sign in again.',
    'auth/invalid-api-key':           'App configuration error. Please contact support.',
    'auth/app-not-authorized':        'This app is not authorised to use Firebase Authentication.',
    'auth/web-storage-unsupported':   'Your browser does not support web storage. Please enable cookies.',
  };

  // Firestore errors
  const firestoreErrors: Record<string, string> = {
    'permission-denied':              'You do not have permission to perform this action.',
    'not-found':                      'The requested data was not found.',
    'already-exists':                 'This record already exists.',
    'resource-exhausted':             'Service is temporarily unavailable. Please try again later.',
    'unavailable':                    'Service is temporarily unavailable. Please check your connection.',
    'deadline-exceeded':              'Request timed out. Please try again.',
    'unauthenticated':                'You must be signed in to perform this action.',
    'aborted':                        'The operation was aborted. Please try again.',
  };

  if (code && authErrors[code]) return authErrors[code];
  if (code && firestoreErrors[code]) return firestoreErrors[code];

  // Check for nested code (e.g. from wrapped errors)
  if (rawMessage.includes('auth/')) {
    const match = rawMessage.match(/auth\/[\w-]+/);
    if (match && authErrors[match[0]]) return authErrors[match[0]];
  }

  // Known non-Firebase app errors (thrown by our own code)
  if (rawMessage.includes('User profile does not exist')) {
    return 'Your account was not found in our system. Please register as a new member or contact the administrator.';
  }
  if (rawMessage.includes('suspended')) {
    return 'Your account has been suspended. Please contact the association administrator.';
  }
  if (rawMessage.includes('No Google credentials')) {
    return 'Google Sign-In was cancelled or failed. Please try again.';
  }
  if (rawMessage.includes('Google native Sign-in failed')) {
    return 'Google Sign-In failed. Please make sure you have Google Play Services and try again.';
  }
  if (rawMessage.includes('Google native ID Token')) {
    return 'Google Sign-In did not return a valid token. Please try again.';
  }
  if (rawMessage.includes('Phone authentication')) {
    return 'Phone sign-in is not available in this version. Please use email or contact the administrator.';
  }

  // Fallback: strip technical prefixes from the raw message
  if (rawMessage) {
    // Strip Firebase internal prefixes
    return rawMessage
      .replace(/Firebase:\s*/i, '')
      .replace(/\s*\(auth\/[\w-]+\)\./i, '')
      .replace(/\s*\([\w-]+\/[\w-]+\)\./i, '')
      .trim() || 'Something went wrong. Please try again.';
  }

  return 'Something went wrong. Please try again.';
}
