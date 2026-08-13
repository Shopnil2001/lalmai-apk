import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, Shadows } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { dbService } from '../services/dbService';
import CustomHeader from '../components/CustomHeader';
import Card from '../components/Card';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface NotificationItem {
  id: string;
  type: 'meeting' | 'event' | 'announcement';
  title: string;
  body: string;
  createdAt: number;
  dateTime?: number; // event or meeting time
  location?: string;
  postedBy?: string;
  isNew: boolean;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      const lastReadStr = await AsyncStorage.getItem('LRC_NOTIFICATIONS_LAST_READ');
      const lastRead = lastReadStr ? parseInt(lastReadStr, 10) : 0;

      const [meetings, events, announcements] = await Promise.all([
        dbService.getMeetings(),
        dbService.getEvents(),
        dbService.getAnnouncements(),
      ]);

      const items: NotificationItem[] = [];

      // 1. Map Meetings
      meetings.forEach((m) => {
        items.push({
          id: `meeting_${m.id}`,
          type: 'meeting',
          title: m.title,
          body: m.description,
          createdAt: m.createdAt || m.dateTime - 24 * 60 * 60 * 1000, // fallback
          dateTime: m.dateTime,
          location: m.location,
          isNew: (m.createdAt || 0) > lastRead,
        });
      });

      // 2. Map Events
      events.forEach((e) => {
        items.push({
          id: `event_${e.id}`,
          type: 'event',
          title: e.title,
          body: e.description,
          createdAt: e.createdAt || e.dateTime - 24 * 60 * 60 * 1000,
          dateTime: e.dateTime,
          location: e.location,
          isNew: (e.createdAt || 0) > lastRead,
        });
      });

      // 3. Map Announcements
      announcements.forEach((a) => {
        items.push({
          id: `announcement_${a.id}`,
          type: 'announcement',
          title: a.title,
          body: a.content,
          createdAt: a.createdAt || Date.now(),
          postedBy: `${a.postedByName} (${a.postedByRole})`,
          isNew: (a.createdAt || 0) > lastRead,
        });
      });

      // Sort by creation time descending
      items.sort((a, b) => b.createdAt - a.createdAt);

      const dismissedStr = await AsyncStorage.getItem('LRC_DISMISSED_NOTIFICATIONS');
      const dismissed = dismissedStr ? JSON.parse(dismissedStr) : [];
      const filtered = items.filter(n => !dismissed.includes(n.id));

      setNotifications(filtered);

      // Update last read timestamp to mark everything as read
      await AsyncStorage.setItem('LRC_NOTIFICATIONS_LAST_READ', Date.now().toString());
    } catch (error) {
      console.error('Failed to load notifications', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDeleteNotification = async (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      const dismissedStr = await AsyncStorage.getItem('LRC_DISMISSED_NOTIFICATIONS');
      const dismissed = dismissedStr ? JSON.parse(dismissedStr) : [];
      if (!dismissed.includes(id)) {
        dismissed.push(id);
        await AsyncStorage.setItem('LRC_DISMISSED_NOTIFICATIONS', JSON.stringify(dismissed));
      }
    } catch (err) {
      console.error('Failed to save dismissed notification', err);
    }
  };

  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(diff / 86400000);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;

    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getIconConfig = (type: NotificationItem['type']) => {
    switch (type) {
      case 'meeting':
        return { name: 'calendar', color: '#4F46E5', bgColor: '#EEF2FF', label: 'Meeting' };
      case 'event':
        return { name: 'flag', color: '#D97706', bgColor: '#FEF3C7', label: 'Event' };
      case 'announcement':
        return { name: 'megaphone', color: '#059669', bgColor: '#ECFDF5', label: 'Notice' };
    }
  };

  const formatTargetDate = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isExpanded = expandedId === item.id;
    const config = getIconConfig(item.type);

    return (
      <Card style={[styles.card, item.isNew && styles.cardUnread]} elevation="sm">
        <View style={styles.cardHeaderRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => toggleExpand(item.id)}
            style={styles.cardHeaderLeft}
          >
            {/* Left Icon */}
            <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
              <Ionicons name={config.name as any} size={20} color={config.color} />
            </View>

            {/* Core Info */}
            <View style={styles.infoContainer}>
              <View style={styles.topMetaRow}>
                <Text style={[styles.typeLabel, { color: config.color }]}>
                  {config.label}
                </Text>
                <Text style={styles.timeLabel}>{getRelativeTime(item.createdAt)}</Text>
              </View>
              <Text style={styles.title} numberOfLines={isExpanded ? undefined : 2}>
                {item.title}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Action Icons Column/Row */}
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleDeleteNotification(item.id)}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.light.error} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => toggleExpand(item.id)}
              style={styles.chevronBtn}
            >
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={Colors.light.textLight}
              />
            </TouchableOpacity>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />
            <Text style={styles.bodyText}>{item.body}</Text>

            {/* Dynamic Event / Meeting Info */}
            {(item.location || item.dateTime) && (
              <View style={styles.extraDetailsContainer}>
                {item.dateTime && (
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={14} color={Colors.light.textSecondary} />
                    <Text style={styles.detailText}>{formatTargetDate(item.dateTime)}</Text>
                  </View>
                )}
                {item.location && (
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={14} color={Colors.light.textSecondary} />
                    <Text style={styles.detailText}>{item.location}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Dynamic Announcement Author */}
            {item.postedBy && (
              <Text style={styles.postedByText}>Posted by: {item.postedBy}</Text>
            )}

            {/* Navigation Shortcut */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (item.type === 'meeting') {
                  router.push('/(tabs)/meetings');
                } else if (item.type === 'event') {
                  router.push('/(tabs)/events');
                } else {
                  router.push('/(tabs)/fees' as any);
                }
              }}
              style={[styles.actionBtn, { borderColor: config.color }]}
            >
              <Text style={[styles.actionBtnText, { color: config.color }]}>
                View on {item.type === 'meeting' ? 'Meetings' : item.type === 'event' ? 'Events' : 'Fees Panel'}
              </Text>
              <Ionicons name="arrow-forward" size={14} color={config.color} />
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Notifications" showBack fallbackRoute="/(tabs)/fees" />
      
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.light.accent]}
            tintColor={Colors.light.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color={Colors.light.textLight} />
            <Text style={styles.emptyText}>No notifications found.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  card: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.light.surface,
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.accent,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  chevronBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.xs,
  },
  topMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  timeLabel: {
    fontSize: 10,
    color: Colors.light.textLight,
  },
  title: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.light.primary,
    lineHeight: 18,
  },
  chevron: {
    alignSelf: 'center',
  },
  expandedContent: {
    marginTop: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.surfaceDarker,
    marginBottom: Spacing.sm,
  },
  bodyText: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  extraDetailsContainer: {
    backgroundColor: Colors.light.surfaceDarker,
    borderRadius: 8,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
  },
  postedByText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: Colors.light.textLight,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1.2,
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: Spacing.md,
  },
  actionBtnText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl + Spacing.xl,
  },
  emptyText: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    marginTop: Spacing.sm,
  },
});
