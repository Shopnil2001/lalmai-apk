import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography, Shadows } from '../../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { dbService } from '../../../../services/dbService';
import { UserProfile, EventAttendance, Event } from '../../../../services/mockData';
import { useAuth } from '../../../../context/AuthContext';
import CustomHeader from '../../../../components/CustomHeader';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';
import * as Print from 'expo-print';

interface AttendanceState {
  [userId: string]: 'present' | 'absent' | 'excused';
}

export default function EventAttendanceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [attendanceSheet, setAttendanceSheet] = useState<AttendanceState>({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const eventId = id as string;
      
      // Load Event details
      const allEvents = await dbService.getEvents();
      const currentEvent = allEvents.find(e => e.id === eventId);
      if (currentEvent) {
        setEvent(currentEvent);
      }

      // Load active users targeted by the event's areas
      const allUsers = await dbService.getUsers();
      let activeMembers = allUsers.filter(u => u.status === 'active');
      if (currentEvent && currentEvent.targetAreas && currentEvent.targetAreas.length > 0) {
        activeMembers = activeMembers.filter(u => u.area && currentEvent.targetAreas?.includes(u.area));
      }
      setMembers(activeMembers);

      // Load existing attendance
      const existingRecords = await dbService.getAttendanceForEvent(eventId);
      
      const initialSheet: AttendanceState = {};
      activeMembers.forEach(member => {
        const record = existingRecords.find(r => r.userId === member.uid);
        initialSheet[member.uid] = record ? record.status : 'present';
      });
      setAttendanceSheet(initialSheet);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load event attendance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const handleToggleStatus = (userId: string, status: 'present' | 'absent' | 'excused') => {
    setAttendanceSheet(prev => ({
      ...prev,
      [userId]: status
    }));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const eventId = id as string;
      
      const list = members.map(member => ({
        userId: member.uid,
        userName: member.name,
        status: attendanceSheet[member.uid] || 'present'
      }));

      await dbService.saveEventAttendance(eventId, list, user?.uid || 'admin');
      
      Alert.alert(
        'Success',
        'Event attendance saved successfully.',
        [{ text: 'OK', onPress: () => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/events');
          }
        } }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save event attendance.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintAttendance = async () => {
    if (!event) {
      Alert.alert('Error', 'No event data available to print.');
      return;
    }

    const eventDate = new Date(event.dateTime).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const rows = members.map((member, index) => {
      const status = attendanceSheet[member.uid] || 'present';
      const color = status === 'present' ? '#10B981' : status === 'absent' ? '#EF4444' : '#64748B';
      return `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${member.name}</strong></td>
          <td>${member.role}</td>
          <td>${member.phone}</td>
          <td style="color: ${color}; font-weight: bold; text-transform: uppercase;">${status}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 24px; color: #0F172A; }
            h1 { font-size: 24px; color: #1E293B; margin-bottom: 4px; }
            .meta { font-size: 14px; color: #64748B; margin-bottom: 24px; border-bottom: 2px solid #E2E8F0; padding-bottom: 12px; }
            .meta-item { margin-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #E2E8F0; padding: 12px; text-align: left; font-size: 12px; }
            th { background-color: #F1F5F9; color: #475569; font-weight: bold; }
            tr:nth-child(even) { background-color: #FAFAFA; }
          </style>
        </head>
        <body>
          <h1>Lalmai Upozila Rent A Car Association</h1>
          <div class="meta">
            <div class="meta-item"><strong>Event:</strong> ${event.title}</div>
            <div class="meta-item"><strong>Date:</strong> ${eventDate}</div>
            <div class="meta-item"><strong>Location:</strong> ${event.location}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>SL</th>
                <th>Member Name</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
      await Print.printAsync({ html });
    } catch (error) {
      Alert.alert('Error', 'Failed to print attendance sheet.');
    }
  };

  const renderMemberRow = ({ item }: { item: UserProfile }) => {
    const status = attendanceSheet[item.uid] || 'present';

    return (
      <Card style={styles.memberRow} elevation="sm">
        <View style={styles.rowContent}>
          <View style={styles.nameContainer}>
            <Text style={styles.memberName}>{item.name}</Text>
            <Text style={styles.memberRole}>{item.role}</Text>
          </View>

          <View style={styles.toggleGroup}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleToggleStatus(item.uid, 'present')}
              style={[
                styles.toggleBtn,
                status === 'present' && styles.presentActive
              ]}
            >
              <Text style={[
                styles.toggleText,
                status === 'present' && styles.textActive
              ]}>P</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleToggleStatus(item.uid, 'absent')}
              style={[
                styles.toggleBtn,
                status === 'absent' && styles.absentActive
              ]}
            >
              <Text style={[
                styles.toggleText,
                status === 'absent' && styles.textActive
              ]}>A</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleToggleStatus(item.uid, 'excused')}
              style={[
                styles.toggleBtn,
                status === 'excused' && styles.excusedActive
              ]}
            >
              <Text style={[
                styles.toggleText,
                status === 'excused' && styles.textActive
              ]}>E</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Event Attendance" 
        showBack 
        fallbackRoute="/(tabs)/events" 
        rightIcon="print-outline"
        onRightPress={handlePrintAttendance}
      />
      
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendIndicator, { backgroundColor: Colors.light.success }]} />
          <Text style={styles.legendLabel}>P = Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIndicator, { backgroundColor: Colors.light.error }]} />
          <Text style={styles.legendLabel}>A = Absent</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIndicator, { backgroundColor: '#64748B' }]} />
          <Text style={styles.legendLabel}>E = Excused</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.accent} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={item => item.uid}
          renderItem={renderMemberRow}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            <Button
              title="Save Event Attendance"
              variant="primary"
              onPress={handleSaveAttendance}
              loading={saving}
              style={styles.saveBtn}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={Colors.light.textLight} />
              <Text style={styles.emptyText}>No active members available to check in.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.xs,
  },
  legendLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  memberRow: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  memberName: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  memberRole: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
    backgroundColor: Colors.light.surfaceDarker,
  },
  presentActive: {
    backgroundColor: Colors.light.success,
  },
  absentActive: {
    backgroundColor: Colors.light.error,
  },
  excusedActive: {
    backgroundColor: '#64748B',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  textActive: {
    color: '#FFFFFF',
  },
  saveBtn: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    marginTop: Spacing.sm,
  },
});
