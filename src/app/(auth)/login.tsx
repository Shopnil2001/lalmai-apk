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
  const { sendPhoneOTP, verifyPhoneOTP } = useAuth();

  // OTP login form states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemoLogins, setShowDemoLogins] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Resend OTP countdown timer
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Request OTP from BulkSMSBD SMS Gateway
  const handleSendOTP = async () => {
    if (!phoneNumber) {
      setError('Please enter your phone number.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await sendPhoneOTP(phoneNumber, null);
      setConfirmationResult(result);
      setStep('otp');
      setResendTimer(60);
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and Authenticate User
  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length < 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verifyPhoneOTP(confirmationResult, otpCode);
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoPhone: string) => {
    setShowDemoLogins(false);
    setError(null);
    setLoading(true);
    try {
      setPhoneNumber(demoPhone);
      const result = await authService.sendPhoneOTP(demoPhone);
      setConfirmationResult(result);
      setStep('otp');
      
      // Auto verify in mock mode for faster developer testing
      if (result.simulated) {
        setOtpCode(result.otpCode || '123456');
        setLoading(true);
        await verifyPhoneOTP(result, result.otpCode || '123456');
      }
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { label: 'Super Admin', phone: '01711223344', role: 'Super Admin' },
    { label: 'President / Chairman', phone: '01811223344', role: 'President' },
    { label: 'Treasurer', phone: '01911223344', role: 'Treasurer' },
    { label: 'Event Manager', phone: '01511223344', role: 'Event Manager' },
    { label: 'Driver (Active)', phone: '01611223344', role: 'Driver' },
    { label: 'New Driver (Pending)', phone: '01311223344', role: 'Pending Approval' },
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
        {/* Login Card */}
        <Card style={styles.loginCard} elevation="md">
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in securely via SMS OTP verification code</Text>

          {/* ── Error banner ── */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={Colors.light.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Two-step OTP form ── */}
          {step === 'phone' ? (
            <View style={styles.formSection}>
              <Input
                label="Phone Number"
                placeholder="e.g. 017XXXXXXXX"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                leftIcon="call-outline"
                keyboardType="phone-pad"
              />
              <Button
                title="Send Verification Code"
                variant="primary"
                onPress={handleSendOTP}
                loading={loading}
                style={styles.actionBtn}
              />
            </View>
          ) : (
            <View style={styles.formSection}>
              <Text style={styles.otpNoticeText}>
                We sent a 6-digit verification code to your phone number. Please enter it below.
              </Text>
              <Input
                label="Verification Code"
                placeholder="Enter 6-digit OTP"
                value={otpCode}
                onChangeText={setOtpCode}
                leftIcon="key-outline"
                keyboardType="number-pad"
                maxLength={6}
              />
              <Button
                title="Verify & Log In"
                variant="primary"
                onPress={handleVerifyOTP}
                loading={loading}
                style={styles.actionBtn}
              />

              <View style={styles.otpActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setStep('phone')}
                  style={styles.changePhoneBtn}
                  disabled={loading}
                >
                  <Text style={styles.changePhoneText}>Change Number</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleSendOTP}
                  style={styles.resendBtnContainer}
                  disabled={resendTimer > 0 || loading}
                >
                  <Text style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
                  Tapping fills the form and logs in instantly (simulated OTP 123456):
                </Text>
                <View style={styles.demoGrid}>
                  {demoAccounts.map((account, idx) => (
                     <TouchableOpacity
                       key={idx}
                       activeOpacity={0.7}
                       onPress={() => handleQuickLogin(account.phone)}
                       style={styles.demoItem}
                     >
                       <Text style={styles.demoItemLabel}>{account.label}</Text>
                       <Text style={styles.demoItemEmail} numberOfLines={1}>
                         {account.phone} ({account.role})
                       </Text>
                     </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </Card>
        )}
      </ScrollView>
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
  otpNoticeText: {
    ...Typography.bodyMedium,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  otpActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  changePhoneBtn: {
    paddingVertical: 6,
  },
  changePhoneText: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  resendBtnContainer: {
    paddingVertical: 6,
  },
  resendText: {
    ...Typography.bodySmall,
    color: Colors.light.accent,
    fontWeight: '700',
  },
  resendTextDisabled: {
    color: '#94A3B8',
  },
});
