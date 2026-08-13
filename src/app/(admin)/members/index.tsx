import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState, useEffect } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import CustomHeader from '../../../components/CustomHeader';
import Input from '../../../components/Input';
import RoleBadge from '../../../components/RoleBadge';
import { Colors, Shadows, Spacing, Typography } from '../../../constants/theme';
import { useAuth } from '../../../context/AuthContext';
import { dbService } from '../../../services/dbService';
import { PaymentRecord, UserProfile } from '../../../services/mockData';
import { calculateTotalDues } from '../../../utils/feeUtils';

export default function MembersDirectory() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const { initialStatus } = useLocalSearchParams<{ initialStatus?: string }>();
  const canTakeAttendance = user?.role === 'Super Admin' || (user?.role === 'Admin' && hasPermission('takeAttendance'));
  
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>(initialStatus || 'All');
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialStatus) {
      setFilterStatus(initialStatus);
    }
  }, [initialStatus]);

  // Attendance modal state
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [attendanceDate, setAttendanceDate] = useState('');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [markingAttendance, setMarkingAttendance] = useState(false);

  const loadMembers = async () => {
    try {
      const [fetchedUsers, fetchedPayments] = await Promise.all([
        dbService.getUsers(),
        dbService.getPayments()
      ]);
      setMembers(fetchedUsers);
      setPayments(fetchedPayments);
    } catch (error) {
      console.error('Failed to load directory data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadMembers();
      }
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMembers();
  };

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const handleOpenAttendance = (member: UserProfile) => {
    setSelectedMember(member);
    setAttendanceDate(getTodayStr());
    setShowAttendanceModal(true);
  };

  const handleConfirmAttendance = async () => {
    if (!selectedMember || !user) return;
    
    // Validate date format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(attendanceDate)) {
      Alert.alert('Error', 'Please enter a valid date in YYYY-MM-DD format.');
      return;
    }

    try {
      setMarkingAttendance(true);
      await dbService.markMemberPresent(selectedMember.uid, attendanceDate, user.uid);
      Alert.alert('Success', `Attendance marked successfully for ${selectedMember.name} on ${attendanceDate}.`);
      setShowAttendanceModal(false);
    } catch (err) {
      console.error('Failed to mark attendance:', err);
      Alert.alert('Error', 'Failed to mark attendance.');
    } finally {
      setMarkingAttendance(false);
    }
  };

  // Filter & Search Logic
  const filteredMembers = members.filter(member => {
    // If Admin, show members in their area(s)
    if (user && user.role === 'Admin') {
      const assignedArea = user.assignedArea;
      const assignedAreas = user.assignedAreas || [];
      if (
        member.uid !== user.uid &&
        (!member.area || (member.area !== assignedArea && !assignedAreas.includes(member.area)))
      ) {
        return false;
      }
    }

    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      member.phone.includes(searchQuery) ||
      (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (member.area && member.area.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesRole = 
      filterRole === 'All' || 
      member.role === filterRole ||
      (filterRole === 'Drivers' && (member.role === 'General Member' || (member.role as string) === 'Driver / General Member')) ||
      (filterRole === 'Committee' && member.role !== 'General Member' && (member.role as string) !== 'Driver / General Member');

    const matchesStatus =
      filterStatus === 'All' ||
      (filterStatus === 'active' && member.status === 'active') ||
      (filterStatus === 'inactive' && member.status !== 'active');

    return matchesSearch && matchesRole && matchesStatus;
  });

  const rolesFilterList = ['All', 'Drivers', 'Committee'];

  const renderMemberItem = ({ item }: { item: UserProfile }) => {
    // Calculate stats
    const totalDues = calculateTotalDues(item.joinedAt, item.yearlyFee);

    const memberPayments = payments.filter(p => p.userId === item.uid);
    const paidAmount = memberPayments.reduce((sum, p) => sum + p.amount, 0);

    const dueAmount = totalDues - paidAmount;

    return (
      <Card style={styles.memberCard} elevation="sm">
        <View style={styles.cardContent}>
          <Ionicons name="person-circle" size={48} color={Colors.light.textLight} style={styles.avatar} />
          
          <View style={styles.detailsContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.memberName} numberOfLines={1}>
                {item.name}
                {item.area ? ` • ${item.area}` : ''}
              </Text>
            </View>
            <Text style={styles.memberPhone}>{item.phone}</Text>
            <View style={styles.badgeRow}>
              <RoleBadge roleOrStatus={item.role as any} style={styles.badge} />
              <RoleBadge roleOrStatus={item.status as any} style={styles.badge} />
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        {item.role === 'General Member' && (
          <View style={styles.statsGrid}>
            <View style={styles.statColumn}>
              <Text style={styles.statLabel}>Paid</Text>
              <Text style={[styles.statValue, styles.paidValue]}>৳{paidAmount}</Text>
            </View>
            <View style={[styles.statColumn, styles.borderLeftRight]}>
              <Text style={styles.statLabel}>{dueAmount < 0 ? 'Advance' : 'Due'}</Text>
              <Text style={[
                styles.statValue, 
                dueAmount < 0 ? styles.paidValue : styles.dueValue
              ]}>
                ৳{Math.abs(dueAmount)}
              </Text>
            </View>
            <View style={styles.statColumn}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={[styles.statValue, styles.totalValue]}>৳{totalDues}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push({
              pathname: '/(admin)/members/[id]',
              params: { id: item.uid }
            })}
            style={[styles.actionBtn, styles.profileBtn]}
          >
            <Ionicons name="eye-outline" size={16} color={Colors.light.primary} />
            <Text style={styles.profileBtnText}>View Profile</Text>
          </TouchableOpacity>

          {item.role === 'General Member' && canTakeAttendance && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleOpenAttendance(item)}
              style={[styles.actionBtn, styles.attendanceBtn]}
            >
              <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
              <Text style={styles.attendanceBtnText}>Attendance</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  const activeCount = members.filter(m => m.status === 'active').length;
  const inactiveCount = members.filter(m => m.status !== 'active').length;

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Member Directory" 
        showBack 
        fallbackRoute="/(admin)/dashboard"
        rightIcon={user?.role === 'Super Admin' ? 'add-outline' : undefined}
        onRightPress={user?.role === 'Super Admin' ? () => router.push('/(admin)/members/create') : undefined}
      />

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Search by name, phone, area or email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search-outline"
          containerStyle={styles.searchInput}
        />
      </View>

      {/* Fleet Overview counts card */}
      <Card style={styles.overviewCard} elevation="sm">
        <View style={styles.overviewRow}>
          <TouchableOpacity 
            style={[styles.overviewItem, filterStatus === 'active' && styles.overviewItemActive]} 
            onPress={() => setFilterStatus(prev => prev === 'active' ? 'All' : 'active')}
            activeOpacity={0.7}
          >
            <Text style={[styles.overviewValue, { color: Colors.light.success }, filterStatus === 'active' && { fontWeight: '900' }]}>{activeCount}</Text>
            <Text style={[styles.overviewLabel, filterStatus === 'active' && { color: Colors.light.accent, fontWeight: '700' }]}>Active Members</Text>
          </TouchableOpacity>
          <View style={styles.overviewDivider} />
          <TouchableOpacity 
            style={[styles.overviewItem, filterStatus === 'inactive' && styles.overviewItemActive]} 
            onPress={() => setFilterStatus(prev => prev === 'inactive' ? 'All' : 'inactive')}
            activeOpacity={0.7}
          >
            <Text style={[styles.overviewValue, { color: Colors.light.warning }, filterStatus === 'inactive' && { fontWeight: '900' }]}>{inactiveCount}</Text>
            <Text style={[styles.overviewLabel, filterStatus === 'inactive' && { color: Colors.light.accent, fontWeight: '700' }]}>Inactive Members</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {rolesFilterList.map((tab, idx) => (
          <TouchableOpacity
            key={idx}
            activeOpacity={0.8}
            onPress={() => setFilterRole(tab)}
            style={[styles.filterTab, filterRole === tab && styles.activeFilterTab]}
          >
            <Text style={[styles.filterTabText, filterRole === tab && styles.activeFilterTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredMembers}
        keyExtractor={item => item.uid}
        renderItem={renderMemberItem}
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
            <Ionicons name="people-outline" size={48} color={Colors.light.textLight} />
            <Text style={styles.emptyText}>No members match your search criteria.</Text>
          </View>
        }
      />

      {/* Mark Attendance Modal */}
      {selectedMember && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showAttendanceModal}
          onRequestClose={() => setShowAttendanceModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard} elevation="lg">
              <Text style={styles.modalTitle}>Mark Attendance</Text>
              <Text style={styles.modalSubtitle}>
                Mark <Text style={styles.boldText}>{selectedMember.name}</Text> as present
              </Text>

              <Input
                label="Date (YYYY-MM-DD) *"
                placeholder="YYYY-MM-DD"
                value={attendanceDate}
                onChangeText={setAttendanceDate}
                leftIcon="calendar-outline"
                containerStyle={styles.modalInput}
              />

              <View style={styles.quickSelectRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setAttendanceDate(getTodayStr())}
                  style={[styles.quickSelectBtn, attendanceDate === getTodayStr() && styles.quickSelectActive]}
                >
                  <Text style={[styles.quickSelectText, attendanceDate === getTodayStr() && styles.quickSelectActiveText]}>Today</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setAttendanceDate(getYesterdayStr())}
                  style={[styles.quickSelectBtn, attendanceDate === getYesterdayStr() && styles.quickSelectActive]}
                >
                  <Text style={[styles.quickSelectText, attendanceDate === getYesterdayStr() && styles.quickSelectActiveText]}>Yesterday</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowAttendanceModal(false)}
                  style={styles.modalBtn}
                  disabled={markingAttendance}
                />
                <Button
                  title="Confirm"
                  variant="primary"
                  onPress={handleConfirmAttendance}
                  style={styles.modalBtn}
                  loading={markingAttendance}
                />
              </View>
            </Card>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.light.surface,
  },
  searchInput: {
    marginBottom: Spacing.sm,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surface,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: Spacing.sm,
    backgroundColor: Colors.light.surfaceDarker,
  },
  activeFilterTab: {
    backgroundColor: Colors.light.accentLight,
  },
  filterTabText: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  activeFilterTabText: {
    color: Colors.light.accent,
    fontWeight: '700',
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  memberCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: Spacing.md,
  },
  detailsContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberName: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  memberPhone: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  badge: {
    marginRight: Spacing.xs,
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.light.surfaceDarker,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.surfaceDarker,
    marginVertical: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  borderLeftRight: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.light.surfaceDarker,
    borderRightWidth: 1,
    borderRightColor: Colors.light.surfaceDarker,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.light.textLight,
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  statValue: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    marginTop: 2,
  },
  paidValue: {
    color: Colors.light.success,
  },
  dueValue: {
    color: Colors.light.error,
  },
  totalValue: {
    color: Colors.light.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    gap: 6,
  },
  profileBtn: {
    backgroundColor: Colors.light.surfaceDarker,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  profileBtnText: {
    ...Typography.bodySmall,
    color: Colors.light.primary,
    fontWeight: '700',
  },
  attendanceBtn: {
    backgroundColor: Colors.light.accent,
  },
  attendanceBtnText: {
    ...Typography.bodySmall,
    color: '#FFFFFF',
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
  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
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
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  boldText: {
    fontWeight: '700',
    color: Colors.light.text,
  },
  modalInput: {
    marginBottom: Spacing.sm,
  },
  quickSelectRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickSelectBtn: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: 16,
    backgroundColor: Colors.light.surfaceDarker,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  quickSelectActive: {
    backgroundColor: Colors.light.accentLight,
    borderColor: Colors.light.accent,
  },
  quickSelectText: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  quickSelectActiveText: {
    color: Colors.light.accent,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalBtn: {
    flex: 1,
  },
  overviewCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewValue: {
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  overviewLabel: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  overviewDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.light.border,
  },
  overviewItemActive: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 2,
  },
});
