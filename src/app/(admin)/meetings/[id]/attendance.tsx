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
import { UserProfile, Attendance } from '../../../../services/mockData';
import { useAuth } from '../../../../context/AuthContext';
import CustomHeader from '../../../../components/CustomHeader';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';

interface AttendanceState {
  [userId: string]: 'present' | 'absent' | 'excused';
}

export default function RecordAttendance() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [attendanceSheet, setAttendanceSheet] = useState<AttendanceState>({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAttendanceData = async () => {
    try {
      const meetingId = id as string;
      const [allUsers, allMeetings] = await Promise.all([
        dbService.getUsers(),
        dbService.getMeetings()
      ]);
      const currentMeeting = allMeetings.find(m => m.id === meetingId);

      // Only record attendance for active members targeted by the meeting's areas
      let activeMembers = allUsers.filter(u => u.status === 'active');
      if (currentMeeting && currentMeeting.targetAreas && currentMeeting.targetAreas.length > 0) {
        activeMembers = activeMembers.filter(u => u.area && currentMeeting.targetAreas?.includes(u.area));
      }
      setMembers(activeMembers);

      // Load existing attendance records
      const existingRecords = await dbService.getAttendanceForMeeting(meetingId);
      
      const initialSheet: AttendanceState = {};
      activeMembers.forEach(member => {
        const record = existingRecords.find(r => r.userId === member.uid);
        // Default to 'present' if no record, or set to existing status
        initialSheet[member.uid] = record ? record.status : 'present';
      });
      setAttendanceSheet(initialSheet);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load attendance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadAttendanceData();
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
      const meetingId = id as string;
      
      // Map sheet state back to list structure
      const list = members.map(member => ({
        userId: member.uid,
        userName: member.name,
        status: attendanceSheet[member.uid] || 'present'
      }));

      await dbService.saveAttendance(meetingId, list, user?.uid || 'admin');
      
      Alert.alert(
        'Success',
        'Attendance records saved successfully.',
        [{ text: 'OK', onPress: () => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(admin)/dashboard');
          }
        } }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save attendance records.');
    } finally {
      setSaving(false);
    }
  };

  const renderMemberRow = ({ item }: { item: UserProfile }) => {
    const status = attendanceSheet[item.uid] || 'present';

    return (
      <Card style={styles.memberRow} elevation="sm">
        <View style={styles.rowContent}>
          {/* Member Name */}
          <View style={styles.nameContainer}>
            <Text style={styles.memberName}>{item.name}</Text>
            <Text style={styles.memberRole}>{item.role}</Text>
          </View>

          {/* Toggle buttons grid */}
          <View style={styles.toggleGroup}>
            {/* Present */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleToggleStatus(item.uid, 'present')}
              style={[
                styles.toggleBtn,
                styles.presentBtn,
                status === 'present' && styles.presentActive
              ]}
            >
              <Text style={[
                styles.toggleText,
                status === 'present' && styles.textActive
              ]}>P</Text>
            </TouchableOpacity>

            {/* Absent */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleToggleStatus(item.uid, 'absent')}
              style={[
                styles.toggleBtn,
                styles.absentBtn,
                status === 'absent' && styles.absentActive
              ]}
            >
              <Text style={[
                styles.toggleText,
                status === 'absent' && styles.textActive
              ]}>A</Text>
            </TouchableOpacity>

            {/* Excused */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleToggleStatus(item.uid, 'excused')}
              style={[
                styles.toggleBtn,
                styles.excusedBtn,
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
      <CustomHeader title="Mark Attendance" showBack fallbackRoute="/(admin)/dashboard" />
      
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
          <View style={[styles.legendIndicator, { backgroundColor: '#94A3B8' }]} />
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
              title="Save Attendance Sheet"
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
  presentBtn: {},
  absentBtn: {},
  excusedBtn: {},
  presentActive: {
    backgroundColor: Colors.light.success,
  },
  absentActive: {
    backgroundColor: Colors.light.error,
  },
  excusedActive: {
    backgroundColor: '#64748B', // Neutral dark gray for excuse
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
