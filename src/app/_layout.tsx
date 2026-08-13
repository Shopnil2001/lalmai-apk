import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Animated, Easing } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { Colors, Spacing, Typography, Shadows } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import Card from '../components/Card';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import {
  registerForPushNotificationsAsync,
  savePushTokenToFirestore,
} from '../services/notificationService';

function AuthRouterGuard() {
  const { user, isLoading, isAuthenticated, refreshUser, logout } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Animation values
  const carAnim = useRef(new Animated.Value(0)).current;
  const roadAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLoading) return;

    // Engine idle vibration loop (subtle up and down movement)
    const engineAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(carAnim, {
          toValue: -2,
          duration: 120,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(carAnim, {
          toValue: 0,
          duration: 120,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    // Road dashed line horizontal offset loop (simulates forward movement)
    const roadAnimation = Animated.loop(
      Animated.timing(roadAnim, {
        toValue: -30,
        duration: 600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // Pulse animation for the glowing background circle
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    engineAnimation.start();
    roadAnimation.start();
    pulseAnimation.start();

    return () => {
      engineAnimation.stop();
      roadAnimation.stop();
      pulseAnimation.stop();
    };
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;

    const segs = segments as string[];
    const inAuthGroup = segs[0] === '(auth)';
    const onCompleteProfile = segs.includes('complete-profile');
    const isProtectedRoute = segs[0] === '(tabs)' || segs[0] === '(admin)' || segs.includes('attendance') || segs.includes('notifications');

    if (!isAuthenticated) {
      // Not logged in → redirect to login only if trying to access a protected route
      if (isProtectedRoute) {
        router.replace('/(auth)/login');
      }
    } else if (user?.profileComplete === false) {
      // Google/phone first-time sign-up → must complete profile before anything else
      if (!onCompleteProfile) {
        router.replace('/(auth)/complete-profile' as any);
      }
    } else if (user?.status === 'active') {
      // Fully active member/admin → redirect away from auth screens
      if (inAuthGroup) {
        if (user.role === 'Super Admin' || user.role === 'Admin') {
          router.replace('/(admin)/dashboard' as any);
        } else {
          router.replace('/(tabs)/fees' as any);
        }
      }
    }
    // status === 'pending' or 'suspended' → AuthRouterGuard renders those screens inline below
  }, [isAuthenticated, isLoading, user?.status, user?.profileComplete, segments]);

  // Loading Screen
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        {/* Pulsing glow circle */}
        <Animated.View
          style={[
            styles.glowCircle,
            { transform: [{ scale: scaleAnim }] }
          ]}
        />
        
        {/* Car and road container */}
        <View style={styles.carWrapper}>
          <Animated.View style={{ transform: [{ translateY: carAnim }] }}>
            <Ionicons name="car-sport" size={72} color={Colors.light.accent} />
          </Animated.View>
          
          {/* Dash line for road */}
          <View style={styles.roadContainer}>
            <Animated.View
              style={[
                styles.roadLines,
                { transform: [{ translateX: roadAnim }] }
              ]}
            >
              <Text style={styles.roadText}>- - - - - - - - - - - -</Text>
            </Animated.View>
          </View>
        </View>

        <Text style={styles.loadingTitle}>Lalmai Upozila Rent A Car</Text>
        <Text style={styles.loadingSubtitle}>Revving up the engine...</Text>
      </View>
    );
  }

  // Account Pending Approval Screen
  if (isAuthenticated && user?.status === 'pending') {
    return (
      <SafeAreaView style={styles.guardContainer}>
        <View style={styles.guardContent}>
          <View style={styles.guardIconCircle}>
            <Ionicons name="time" size={48} color={Colors.light.warning} />
          </View>
          
          <Text style={styles.guardTitle}>Application Under Review</Text>
          <Text style={styles.guardDescription}>
            Hello, <Text style={styles.boldText}>{user.name}</Text>. Your membership application for the Lalmai Upozila Rent A Car Association is currently pending verification.
          </Text>

          <Card style={styles.guardDetailsCard} elevation="sm">
            <Text style={styles.detailsTitle}>Submitted Application Details</Text>
            <View style={styles.divider} />
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailVal}>{user.email}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailVal}>{user.phone}</Text>
            </View>
            {user.registrationNumber && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Registration No:</Text>
                <Text style={styles.detailVal}>{user.registrationNumber}</Text>
              </View>
            )}
          </Card>

          <Text style={styles.guardHelperText}>
            Our President (Haji Mohammad Selim) or Secretary will review your driving license and registration details shortly.
          </Text>

          <Button
            title="Check Approval Status"
            variant="primary"
            onPress={refreshUser}
            style={styles.guardBtn}
          />

          <Button
            title="Log Out / Switch Account"
            variant="outline"
            onPress={logout}
            style={styles.guardBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Account Suspended Screen
  if (isAuthenticated && user?.status === 'suspended') {
    return (
      <SafeAreaView style={styles.guardContainer}>
        <View style={styles.guardContent}>
          <View style={[styles.guardIconCircle, { backgroundColor: Colors.light.errorLight }]}>
            <Ionicons name="ban" size={48} color={Colors.light.error} />
          </View>
          
          <Text style={styles.guardTitle}>Account Suspended</Text>
          <Text style={styles.guardDescription}>
            Your driver membership account has been suspended by the administrators.
          </Text>
          
          <Text style={styles.guardHelperText}>
            If you believe this is an error or need to resolve outstanding monthly dues, please contact the LRC Treasurer or President directly.
          </Text>

          <Button
            title="Log Out / Exit"
            variant="primary"
            onPress={logout}
            style={styles.guardBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Safe Stack Navigator for Active Users
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="attendance/calendar" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}

/**
 * NotificationSetup must live inside AuthProvider so it can call useAuth.
 * It registers for push notifications once the user is authenticated.
 */
function NotificationSetup() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user?.uid) return;

    let mounted = true;

    const setupNotifications = async () => {
      const token = await registerForPushNotificationsAsync();
      if (token && mounted) {
        await savePushTokenToFirestore(user.uid, token);
      }
    };

    setupNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[NotificationSetup] Received:', notification.request.content.title);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log(
          '[NotificationSetup] Tapped:',
          response.notification.request.content.title
        );
      }
    );

    return () => {
      mounted = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isLoading, isAuthenticated, user?.uid]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ToastProvider>
        <AuthProvider>
          <NotificationSetup />
          <AuthRouterGuard />
        </AuthProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
  glowCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    alignSelf: 'center',
    top: '40%',
    marginTop: -70,
  },
  carWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    marginTop: -30,
  },
  roadContainer: {
    width: 110,
    height: 15,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  roadLines: {
    width: 200,
    alignItems: 'center',
  },
  roadText: {
    color: Colors.light.accent,
    fontSize: 16,
    fontWeight: '800',
    opacity: 0.4,
    letterSpacing: 3,
  },
  loadingTitle: {
    ...Typography.h2,
    color: Colors.light.primary,
    fontWeight: '800',
    marginTop: Spacing.xl,
    textAlign: 'center',
  },
  loadingSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.light.accent,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  guardContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  guardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  guardIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.light.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  guardTitle: {
    ...Typography.h2,
    color: Colors.light.primary,
    fontWeight: '800',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  guardDescription: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  boldText: {
    fontWeight: '700',
    color: Colors.light.primary,
  },
  guardDetailsCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
    width: '100%',
  },
  detailsTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.surfaceDarker,
    marginVertical: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  detailVal: {
    ...Typography.bodySmall,
    color: Colors.light.primary,
    fontWeight: '700',
  },
  guardHelperText: {
    ...Typography.bodySmall,
    color: Colors.light.textLight,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.xl,
  },
  guardBtn: {
    marginBottom: Spacing.sm,
    width: '100%',
  },
});
