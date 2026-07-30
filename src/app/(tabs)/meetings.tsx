import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  ScrollView,
  Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTabBarVisibility } from '../../context/TabBarVisibilityContext';
import { Colors, Spacing, Typography, Shadows } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { dbService } from '../../services/dbService';
import { Meeting, Attendance } from '../../services/mockData';
import CustomHeader from '../../components/CustomHeader';
import Card from '../../components/Card';
import RoleBadge from '../../components/RoleBadge';

export default function MeetingsList() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { handleScroll } = useTabBarVisibility();
  
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const fetchedMeetings = await dbService.getMeetings();
      setMeetings(fetchedMeetings);
      
      if (user) {
        const userAttendance = await dbService.getUserAttendance(user.uid);
        setAttendance(userAttendance);
      }
    } catch (error) {
      console.error('Failed to load meetings', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getPersonalAttendanceStatus = (meetingId: string) => {
    if (!user) return null;
    // Find attendance record matching meetingId and user.uid
    const record = attendance.find(r => r.meetingId === meetingId && r.userId === user.uid);
    return record ? record.status : null;
  };

  const formatMeetingDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const day = date.getDate();
    const month = date.toLocaleDateString(undefined, { month: 'short' });
    const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return { day, month, time, fullDate: date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) };
  };

  const upcomingMeetings = meetings.filter(m => {
    if (m.status === 'cancelled') return false;
    if (m.dateTime < Date.now()) return false;
    if (user && user.role === 'General Member') {
      if (m.targetAreas && m.targetAreas.length > 0) {
        return !!(user.area && m.targetAreas.includes(user.area));
      }
    }
    return true;
  });
  
  const pastMeetings = meetings.filter(m => {
    if (m.status === 'cancelled') return false;
    if (m.dateTime >= Date.now() && m.status !== 'completed') return false;
    if (user && user.role === 'General Member') {
      if (m.targetAreas && m.targetAreas.length > 0) {
        return !!(user.area && m.targetAreas.includes(user.area));
      }
    }
    return true;
  });

  const filteredMeetings = activeTab === 'upcoming' ? upcomingMeetings : pastMeetings;

  const renderMeetingItem = ({ item }: { item: Meeting }) => {
    const { day, month, time, fullDate } = formatMeetingDate(item.dateTime);
    const userAttendance = getPersonalAttendanceStatus(item.id);

    return (
      <Card style={styles.meetingCard} elevation="sm">
        <View style={styles.cardHeader}>
          {/* Calendar Badge */}
          <View style={styles.calendarBadge}>
            <Text style={styles.calendarDay}>{day}</Text>
            <Text style={styles.calendarMonth}>{month.toUpperCase()}</Text>
          </View>

          <View style={styles.meetingInfo}>
            <Text style={styles.meetingTitle}>{item.title}</Text>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={14} color={Colors.light.textSecondary} />
              <Text style={styles.detailText}>{time}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={14} color={Colors.light.textSecondary} />
              <Text style={styles.detailText} numberOfLines={1}>{item.location}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.description}>{item.description}</Text>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          {/* Left action / status display */}
          <View style={styles.footerLeft}>
            {activeTab === 'completed' ? (
              <View style={styles.attendanceStatusRow}>
                <Text style={styles.statusLabel}>Your Attendance:</Text>
                {userAttendance ? (
                  <RoleBadge roleOrStatus={userAttendance as any} />
                ) : (
                  <Text style={styles.noRecordText}>Not Marked</Text>
                )}
              </View>
            ) : (
              <RoleBadge roleOrStatus="active" style={styles.upcomingBadge} />
            )}
          </View>
        </View>

        {/* Right admin actions row (separate to prevent overflow) */}
        {isAdmin && (
          <View style={styles.meetingAdminFooter}>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => router.push({
                pathname: '/(admin)/meetings/[id]/attendance',
                params: { id: item.id }
              })}
              style={styles.actionButton}
            >
              <Ionicons name="checkbox-outline" size={18} color={Colors.light.accent} />
              <Text style={styles.actionButtonText}>Attendance</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => router.push({
                pathname: '/(admin)/meetings/[id]/edit',
                params: { id: item.id }
              })}
              style={[styles.actionButton, { backgroundColor: Colors.light.surfaceDarker }]}
            >
              <Ionicons name="create-outline" size={18} color={Colors.light.textSecondary} />
              <Text style={[styles.actionButtonText, { color: Colors.light.textSecondary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Meetings" 
        rightIcon={isAdmin ? "add-circle" : undefined}
        onRightPress={isAdmin ? () => router.push('/(admin)/meetings/create') : undefined}
      />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => setActiveTab('upcoming')}
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming ({upcomingMeetings.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => setActiveTab('completed')}
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Past & Completed ({pastMeetings.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        onScroll={handleScroll}
        scrollEventThrottle={16}
        data={filteredMeetings}
        keyExtractor={item => item.id}
        renderItem={renderMeetingItem}
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
            <Ionicons name="calendar-outline" size={48} color={Colors.light.textLight} />
            <Text style={styles.emptyText}>No meetings found in this section.</Text>
            {isAdmin && activeTab === 'upcoming' && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/(admin)/meetings/create')}
                style={styles.emptyButton}
              >
                <Text style={styles.emptyButtonText}>Schedule First Meeting</Text>
              </TouchableOpacity>
            )}
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  tabText: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  meetingCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarBadge: {
    backgroundColor: Colors.light.accentLight,
    borderRadius: 12,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDay: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.accent,
  },
  calendarMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.light.primary,
    marginTop: -2,
  },
  meetingInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  meetingTitle: {
    ...Typography.bodyLarge,
    fontWeight: '800',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  detailText: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    marginLeft: Spacing.xs,
  },
  description: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    marginTop: Spacing.md,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.surfaceDarker,
    marginVertical: Spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendanceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    marginRight: Spacing.sm,
  },
  noRecordText: {
    ...Typography.bodySmall,
    color: Colors.light.textLight,
    fontStyle: 'italic',
  },
  upcomingBadge: {
    backgroundColor: Colors.light.accentLight,
  },
  adminActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meetingAdminFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.surfaceDarker,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.accentLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  actionButtonText: {
    ...Typography.bodySmall,
    color: Colors.light.accent,
    fontWeight: '700',
    marginLeft: Spacing.xs,
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
    marginBottom: Spacing.md,
  },
  emptyButton: {
    backgroundColor: Colors.light.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  emptyButtonText: {
    ...Typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
