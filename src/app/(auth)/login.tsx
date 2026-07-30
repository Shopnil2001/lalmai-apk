import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal
} from 'react-native';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import { Colors, Shadows, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { CONFIG } from '../../services/config';
import { getFirebaseErrorMessage } from '../../utils/firebaseErrors';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();

  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemoLogins, setShowDemoLogins] = useState(false);

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotStep, setForgotStep] = useState<'email' | 'mockReset'>('email');

  // Initialize expo-auth-session Google auth request (for Expo Go client)
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    responseType: 'id_token',
    extraParams: {
      prompt: 'select_account',
    },
  });

  // Listen for Google Auth Session responses (Expo Go redirect flow)
  useEffect(() => {
    if (response) {
      if (response.type === 'success') {
        const token = response.authentication?.idToken || response.params?.id_token;
        if (token) {
          handleGoogleAuthSessionLogin(token);
        } else {
          console.error('Google Auth Success but no idToken found:', response);
          setError('Google Sign-In succeeded, but no ID Token was returned. Please verify client ID configuration.');
          setLoading(false);
        }
      } else if (response.type === 'cancel' || response.type === 'dismiss') {
        setLoading(false);
      } else if (response.type === 'error') {
        console.error('Google Auth Session error:', response.error);
        setError(response.error?.message || 'Google Authentication failed.');
        setLoading(false);
      }
    }
  }, [response]);

  const handleGoogleAuthSessionLogin = async (idToken: string) => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle(idToken);
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Email login
  const handleEmailLogin = async () => {
    if (!email || !password) {
      setError('Please enter your email address and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      setForgotError('Please enter your email address.');
      return;
    }
    setForgotError(null);
    setForgotSuccess(null);
    setForgotLoading(true);

    try {
      if (CONFIG.USE_MOCK_DATA) {
        const cleanEmail = forgotEmail.trim().toLowerCase();
        const { mockDB } = require('../../services/mockData');
        const users = await mockDB.getUsers();
        const found = users.find((u: any) => u.email.toLowerCase() === cleanEmail);
        
        if (!found) {
          throw new Error('This email is not registered in the system.');
        }
        
        setForgotStep('mockReset');
      } else {
        await authService.sendPasswordReset(forgotEmail);
        setForgotSuccess('A password reset link has been sent to your email. Please check your inbox.');
      }
    } catch (err: any) {
      setForgotError(err.message || 'An error occurred. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleMockResetPassword = async () => {
    if (!forgotPassword || forgotPassword.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }
    setForgotError(null);
    setForgotLoading(true);

    try {
      await authService.resetPasswordMock(forgotEmail, forgotPassword);
      setForgotSuccess('Mock password updated successfully! You can now log in using the new password.');
    } catch (err: any) {
      setForgotError(err.message || 'An error occurred.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Google login
  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const isExpoGo = Constants.appOwnership === 'expo';
      if (CONFIG.USE_MOCK_DATA) {
        await loginWithGoogle();
        setLoading(false);
      } else if (isExpoGo) {
        if (!request) {
          setError('Google Sign-In is not ready yet. Please wait a moment and try again.');
          setLoading(false);
          return;
        }
        await promptAsync();
        // loading stays true; the response useEffect will clear it
      } else {
        // Native standalone APK — uses @react-native-google-signin
        await loginWithGoogle();
        setLoading(false);
      }
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setShowDemoLogins(false);
    setError(null);
    setLoading(true);
    try {
      setEmail(demoEmail);
      setPassword('password');
      await login(demoEmail, 'password');
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { label: 'Super Admin', email: 'admin@lrc.com', role: 'Super Admin' },
    { label: 'President / Chairman', email: 'president@lrc.com', role: 'President' },
    { label: 'Treasurer', email: 'treasurer@lrc.com', role: 'Treasurer' },
    { label: 'Event Manager', email: 'events@lrc.com', role: 'Event Manager' },
    { label: 'Driver (Active)', email: 'driver@lrc.com', role: 'Driver' },
    { label: 'New Driver (Pending)', email: 'member2@lrc.com', role: 'Pending Approval' },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Logo/Header Area */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/images/icon.png')}
            style={styles.logoImage}
            contentFit="contain"
          />
          <Text style={styles.appName}>Lalmai Upozila Rent A Car</Text>
          <Text style={styles.tagline}>Association Management</Text>
        </View>

        {/* Login Card */}
        <Card style={styles.loginCard} elevation="md">
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your Lalmai Upozila Rent A Car account</Text>

          {/* ── Error banner ── */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={Colors.light.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Email Form ── */}
          <View style={styles.formSection}>
            <Input
              label="Email or Phone Number"
              placeholder="e.g. driver@lrc.com or +88017xxxxxxxx"
              value={email}
              onChangeText={setEmail}
              leftIcon="mail-outline"
              autoCapitalize="none"
            />
            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              leftIcon="lock-closed-outline"
              secureTextEntry
            />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setForgotEmail(email);
                setForgotError(null);
                setForgotSuccess(null);
                setForgotPassword('');
                setForgotStep('email');
                setShowForgotModal(true);
              }}
              style={styles.forgotPasswordContainer}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
            <Button
              title="Log In"
              variant="primary"
              onPress={handleEmailLogin}
              loading={loading}
              style={styles.actionBtn}
            />
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleGoogleLogin}
            disabled={loading}
            style={styles.googleLoginBtn}
          >
            <Ionicons name="logo-google" size={20} color="#EA4335" style={{ marginRight: 8 }} />
            <Text style={styles.googleLoginText}>Sign In with Google</Text>
          </TouchableOpacity>


        </Card>

        {/* Demo Accounts Panel — mock mode only */}
        {CONFIG.USE_MOCK_DATA && (
          <Card style={styles.demoCard} elevation="sm">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowDemoLogins(!showDemoLogins)}
              style={styles.demoHeader}
            >
              <View style={styles.demoTitleGroup}>
                <Ionicons name="key" size={20} color={Colors.light.accent} />
                <Text style={styles.demoTitle}>Quick Demo Logins</Text>
              </View>
              <Ionicons
                name={showDemoLogins ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.light.textSecondary}
              />
            </TouchableOpacity>
            {showDemoLogins && (
              <View style={styles.demoList}>
                <Text style={styles.demoSub}>
                  Tapping fills the form and logs in instantly:
                </Text>
                <View style={styles.demoGrid}>
                  {demoAccounts.map((account, idx) => (
                     <TouchableOpacity
                       key={idx}
                       activeOpacity={0.7}
                       onPress={() => handleQuickLogin(account.email)}
                       style={styles.demoItem}
                     >
                       <Text style={styles.demoItemLabel}>{account.label}</Text>
                       <Text style={styles.demoItemEmail} numberOfLines={1}>
                         {account.email}
                       </Text>
                     </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </Card>
        )}
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showForgotModal}
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <Text style={styles.modalTitle}>
              {forgotStep === 'mockReset' ? 'Reset Mock Password' : 'Reset Password'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {forgotStep === 'mockReset'
                ? `Set a new mock password for ${forgotEmail}`
                : 'Enter your email address to receive a password reset link'}
            </Text>

            {/* Error & Success banners inside modal */}
            {forgotError && (
              <View style={styles.modalErrorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.light.error} />
                <Text style={styles.modalErrorText}>{forgotError}</Text>
              </View>
            )}

            {forgotSuccess && (
              <View style={styles.modalSuccessContainer}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.light.success} />
                <Text style={styles.modalSuccessText}>{forgotSuccess}</Text>
              </View>
            )}

            {!forgotSuccess && (
              <View style={styles.modalForm}>
                {forgotStep === 'email' ? (
                  <Input
                    label="Email Address"
                    placeholder="e.g. driver@lrc.com"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    leftIcon="mail-outline"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                ) : (
                  <Input
                    label="New Password"
                    placeholder="Enter new password (min 6 chars)"
                    value={forgotPassword}
                    onChangeText={setForgotPassword}
                    leftIcon="lock-closed-outline"
                    secureTextEntry
                  />
                )}
              </View>
            )}

            <View style={styles.modalActions}>
              <Button
                title={forgotSuccess ? "Close" : "Cancel"}
                variant="outline"
                onPress={() => setShowForgotModal(false)}
                style={styles.modalBtn}
              />
              {!forgotSuccess && (
                <Button
                  title={forgotStep === 'mockReset' ? "Save Password" : "Send Link"}
                  variant="primary"
                  onPress={forgotStep === 'mockReset' ? handleMockResetPassword : handleForgotPassword}
                  style={styles.modalBtn}
                  loading={forgotLoading}
                />
              )}
            </View>
          </Card>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: Spacing.xl,
    backgroundColor: '#1E293B',
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    ...Typography.bodySmall,
    color: Colors.light.accent,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  loginCard: {
    margin: Spacing.lg,
    padding: Spacing.xl,
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
  },
  cardTitle: {
    ...Typography.h2,
    color: Colors.light.primary,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSubtitle: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.lg,
  },
  methodRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  methodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surfaceDarker,
    gap: 6,
  },
  methodBtnActive: {
    borderColor: Colors.light.accent,
    backgroundColor: Colors.light.accentLight,
  },
  methodBtnGoogle: {
    borderColor: 'rgba(234,67,53,0.25)',
    backgroundColor: '#FFF5F5',
  },
  methodIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.border,
  },
  methodIconActive: {
    backgroundColor: Colors.light.accent,
  },
  methodIconGoogle: {
    backgroundColor: 'rgba(234,67,53,0.1)',
  },
  methodLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    letterSpacing: 0.2,
  },
  methodLabelActive: {
    color: Colors.light.accent,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.light.errorLight,
    borderWidth: 1,
    borderColor: Colors.light.error,
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.light.error,
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
  },
  formSection: {
    marginBottom: Spacing.sm,
  },
  actionBtn: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  phoneHintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.light.infoLight,
    borderRadius: 10,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  phoneHintText: {
    ...Typography.bodySmall,
    color: Colors.light.info,
    flex: 1,
    lineHeight: 17,
  },
  otpSentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.successLight,
    borderRadius: 10,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  otpSentText: {
    ...Typography.bodySmall,
    color: Colors.light.success,
    flex: 1,
    fontWeight: '500',
  },
  otpSentPhone: {
    fontWeight: '700',
  },
  changeLink: {
    ...Typography.bodySmall,
    color: Colors.light.accent,
    fontWeight: '700',
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  resendBtnText: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  signUpText: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
  },
  signUpLink: {
    ...Typography.bodySmall,
    color: Colors.light.accent,
    fontWeight: '700',
  },
  googleLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surface,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 12,
    height: 48,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  googleLoginText: {
    ...Typography.bodyMedium,
    color: Colors.light.text,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  dividerText: {
    ...Typography.bodySmall,
    color: Colors.light.textLight,
    marginHorizontal: Spacing.sm,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: 10,
  },
  demoCard: {
    marginHorizontal: Spacing.lg,
    marginTop: 0,
    padding: Spacing.md,
    backgroundColor: Colors.light.accentLight,
    borderColor: '#C7D2FE',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  demoTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  demoTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.light.accent,
  },
  demoList: {
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#C7D2FE',
    paddingTop: Spacing.sm,
  },
  demoSub: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  demoItem: {
    width: '47%',
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: Spacing.sm,
  },
  demoItemLabel: {
    ...Typography.label,
    color: Colors.light.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  demoItemEmail: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.xs,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  forgotPasswordText: {
    ...Typography.bodySmall,
    color: Colors.light.accent,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
    padding: Spacing.xl,
  },
  modalTitle: {
    ...Typography.h2,
    color: Colors.light.primary,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: Spacing.lg,
  },
  modalForm: {
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalBtn: {
    flex: 1,
  },
  modalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.light.errorLight,
    borderWidth: 1,
    borderColor: Colors.light.error,
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  modalErrorText: {
    ...Typography.bodySmall,
    color: Colors.light.error,
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
  },
  modalSuccessContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.light.successLight,
    borderWidth: 1,
    borderColor: Colors.light.success,
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  modalSuccessText: {
    ...Typography.bodySmall,
    color: Colors.light.success,
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
  },
});
