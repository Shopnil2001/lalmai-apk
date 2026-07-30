import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { Colors, Spacing, Typography } from '../../constants/theme';

export default function Register() {
  const router = useRouter();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Header */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(auth)/login');
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Membership Registration</Text>
          <Text style={styles.subtitle}>Lalmai Upozila Rent A Car Association Management</Text>
        </View>

        {/* Notice Card */}
        <Card style={styles.registerCard} elevation="md">
          <View style={styles.noticeContainer}>
            <Ionicons name="lock-closed" size={48} color={Colors.light.warning} style={styles.noticeIcon} />
            <Text style={styles.noticeTitle}>Registration Closed</Text>
            <Text style={styles.noticeText}>
              Self-registration is currently disabled. All member accounts must be created manually by the Super Admin.
            </Text>
            <Text style={styles.noticeInstructions}>
              Please contact your association administrator or supervisor to receive your login credentials.
            </Text>
            <Button
              title="Return to Login"
              variant="primary"
              onPress={() => router.replace('/(auth)/login')}
              style={styles.returnBtn}
            />
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    ...Typography.bodyMedium,
    color: Colors.light.text,
    marginLeft: Spacing.xs,
    fontWeight: '600',
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    color: Colors.light.primary,
    fontWeight: '800',
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    marginTop: Spacing.xs,
  },
  registerCard: {
    padding: Spacing.xl,
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
  },
  noticeContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  noticeIcon: {
    marginBottom: Spacing.md,
  },
  noticeTitle: {
    ...Typography.h2,
    color: Colors.light.primary,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  noticeText: {
    ...Typography.bodyMedium,
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  noticeInstructions: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.xl,
  },
  returnBtn: {
    width: '100%',
  },
});
