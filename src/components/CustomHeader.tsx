import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { Colors, Spacing, Typography } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dbService } from '../services/dbService';

interface CustomHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  fallbackRoute?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  showProfile?: boolean;
  notificationCount?: number;
}

export default function CustomHeader({
  title,
  subtitle,
  showBack = false,
  fallbackRoute,
  rightIcon,
  onRightPress,
  showProfile = false,
  notificationCount,
}: CustomHeaderProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [unreadCount, setUnreadCount] = useState(0);

  const checkUnread = async () => {
    try {
      const lastReadStr = await AsyncStorage.getItem('LRC_NOTIFICATIONS_LAST_READ');
      const lastRead = lastReadStr ? parseInt(lastReadStr, 10) : 0;
      
      const [meetings, events, announcements] = await Promise.all([
        dbService.getMeetings(),
        dbService.getEvents(),
        dbService.getAnnouncements(),
      ]);

      let count = 0;
      meetings.forEach(m => { if ((m.createdAt || 0) > lastRead) count++; });
      events.forEach(e => { if ((e.createdAt || 0) > lastRead) count++; });
      announcements.forEach(a => { if ((a.createdAt || 0) > lastRead) count++; });

      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to count unread notifications', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    const unsubscribe = navigation.addListener('focus', () => {
      checkUnread();
    });
    checkUnread();
    return unsubscribe;
  }, [navigation, user]);

  const displayCount = notificationCount !== undefined ? notificationCount : unreadCount;

  const isHomeHeader = showProfile;

  return (
    <View
      style={[
        styles.headerContainer,
        styles.defaultHeaderBg,
        { paddingTop: insets.top + Spacing.xs },
      ]}
    >
      <View style={styles.content}>
        {/* Left: back OR profile */}
        {showBack ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace((fallbackRoute || '/(tabs)/fees') as any);
              }
            }}
            style={[styles.iconButton, styles.darkIconButton]}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : showProfile && user ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.profileContainer}
          >
            {user.photoUrl ? (
              <Image
                source={{ uri: user.photoUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarInitial}>
                <Text style={styles.avatarInitialText}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.greeting}>Hello,</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {user.name.split(' ')[0]}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Center title (for non-profile headers) */}
        {!showProfile && (
          <View style={styles.titleContainer}>
            {title ? (
              <Text style={[styles.titleText, showBack && styles.titleTextBack]}>
                {title}
              </Text>
            ) : (
              <Text style={styles.titleText}>LRC Lalmai</Text>
            )}
            {subtitle && (
              <Text style={styles.subtitleText}>{subtitle}</Text>
            )}
          </View>
        )}

        {/* Right: custom icon OR notification bell */}
        <View style={styles.rightGroup}>
          {rightIcon && !showProfile ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onRightPress}
              style={[styles.iconButton, styles.darkIconButton]}
            >
              <Ionicons
                name={rightIcon}
                size={22}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          ) : null}

          {/* Admin Console Shortcut — only for admins */}
          {(user?.role === 'Admin' || user?.role === 'Super Admin') && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.replace('/(admin)/dashboard' as any)}
              style={[
                styles.iconButton,
                styles.darkIconButton,
                { marginRight: 6 }
              ]}
            >
              <Ionicons
                name="settings-outline"
                size={22}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          )}

          {/* Notification bell — always shown */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/notifications')}
            style={[
              styles.iconButton,
              styles.darkIconButton,
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color="#FFFFFF"
            />
            {displayCount !== undefined && displayCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {displayCount > 9 ? '9+' : displayCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingBottom: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  homeHeaderBg: {
    backgroundColor: '#1E293B',
  },
  defaultHeaderBg: {
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  content: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentIconButton: {
    backgroundColor: Colors.light.accentLight,
  },
  darkIconButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  lightIconButton: {
    backgroundColor: Colors.light.surfaceDarker,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '55%',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4F46E5',
    backgroundColor: '#1E293B',
  },
  avatarInitial: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4F46E5',
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  welcomeTextContainer: {
    marginLeft: Spacing.sm,
  },
  greeting: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
  },
  userName: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  titleText: {
    ...Typography.h3,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  titleTextBack: {
    color: '#FFFFFF',
  },
  subtitleText: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: Colors.light.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
