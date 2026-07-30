import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Button from '../../components/Button';
import Card from '../../components/Card';
import CustomHeader from '../../components/CustomHeader';
import RoleBadge from '../../components/RoleBadge';
import { Colors, Shadows, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { CONFIG } from '../../services/config';
import { dbService } from '../../services/dbService';
import { Meeting, PaymentRecord, UserProfile, OtherIncomeRecord, ExpenseRecord } from '../../services/mockData';
import { calculateTotalDues } from '../../utils/feeUtils';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isSuperAdmin, hasPermission } = useAuth();

  const [members, setMembers] = useState<UserProfile[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [otherIncome, setOtherIncome] = useState<OtherIncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [analyticsFilter, setAnalyticsFilter] = useState<'1m' | '3m' | '1y'>('1m');

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [fetchedMembers, fetchedMeetings, fetchedPayments, fetchedOtherIncome, fetchedExpenses] = await Promise.all([
        dbService.getUsers(),
        dbService.getMeetings(),
        dbService.getPayments(),
        dbService.getOtherIncome(),
        dbService.getExpenses()
      ]);

      let displayMembers = fetchedMembers;
      let displayPayments = fetchedPayments;

      if (user && user.role === 'Admin') {
        const assignedArea = user.assignedArea;
        const assignedAreas = user.assignedAreas || [];
        displayMembers = fetchedMembers.filter(
          m => m.uid === user.uid || (m.area && (m.area === assignedArea || assignedAreas.includes(m.area)))
        );
        displayPayments = fetchedPayments.filter(p => {
          const m = fetchedMembers.find(member => member.uid === p.userId);
          return m && m.area && (m.area === assignedArea || assignedAreas.includes(m.area));
        });
      }

      setMembers(displayMembers);
      setMeetings(fetchedMeetings);
      setPayments(displayPayments);
      setOtherIncome(fetchedOtherIncome);
      setExpenses(fetchedExpenses);
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getFilteredAnalytics = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    
    let filterDate: Date;
    if (analyticsFilter === '1m') {
      filterDate = new Date(currentYear, currentMonth, 1);
    } else if (analyticsFilter === '3m') {
      filterDate = new Date(currentYear, currentMonth - 2, 1);
    } else {
      filterDate = new Date(currentYear, 0, 1);
    }
    
    const isWithinRange = (dateStr: string) => {
      const d = new Date(dateStr);
      return d >= filterDate;
    };
    
    // Member dues collected
    const filteredPayments = payments.filter(p => isWithinRange(p.dateStr));
    const regularEarnings = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    
    // Other income
    const filteredOtherIncome = otherIncome.filter(inc => isWithinRange(inc.dateStr));
    const otherEarnings = filteredOtherIncome.reduce((sum, inc) => sum + inc.amount, 0);
    
    // Expenses
    const filteredExpenses = expenses.filter(exp => isWithinRange(exp.dateStr));
    const totalExp = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const totalEarn = regularEarnings + otherEarnings;
    const netProfit = totalEarn - totalExp;
    
    return {
      regularEarnings,
      otherEarnings,
      totalEarnings: totalEarn,
      totalExpenses: totalExp,
      netProfit,
    };
  };

  const analytics = getFilteredAnalytics();
  const hasFinancialAccess = isSuperAdmin || hasPermission('viewDues') || hasPermission('generateDues');

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadDashboardData();
      }
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleApproveMember = async (memberId: string, name: string) => {
    Alert.alert(
      'Approve Member',
      `Are you sure you want to approve and activate ${name}'s membership?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await dbService.verifyUser(memberId, 'active');
              Alert.alert('Success', `${name} is now an active member.`);
              loadDashboardData(); // Reload
            } catch (error) {
              Alert.alert('Error', 'Failed to approve member.');
            }
          }
        }
      ]
    );
  };

  const handleInjectSeedData = () => {
    Alert.alert(
      'Initialize / Restore Database',
      CONFIG.USE_MOCK_DATA
        ? 'This will populate the local database sandbox with mock data. Proceed?'
        : 'This will seed your LIVE Firebase: Auth users will be registered and Firestore collections populated. You will be signed out. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Inject',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await dbService.injectSeedData();
              if (CONFIG.USE_MOCK_DATA) {
                Alert.alert('Success', 'Seed data successfully restored. Reloading dashboard...');
                loadDashboardData();
              } else {
                Alert.alert(
                  'Database Seeded',
                  'Firebase Auth accounts and Firestore collections seeded successfully. You have been signed out. Please log in with: admin@lrc.com / password.'
                );
              }
            } catch (error: any) {
              console.error('Failed to inject seed data', error);
              Alert.alert('Error', error.message || 'Failed to inject seed data.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Stats
  const activeMembers = members.filter(m => m.status === 'active');
  const pendingMembers = members.filter(m => m.status === 'pending');
  const upcomingMeetings = meetings.filter(m => m.dateTime >= Date.now() && m.status === 'upcoming');

  // Sum outstanding due for all scoped members dynamically
  const totalOutstandingSum = members
    .filter(m => m.status === 'active')
    .reduce((sum, m) => {
      const totalDues = calculateTotalDues(m.joinedAt, m.yearlyFee);
      const memberPayments = payments.filter(p => p.userId === m.uid);
      const paidAmount = memberPayments.reduce((total, p) => total + p.amount, 0);
      const due = totalDues - paidAmount;
      return sum + (due > 0 ? due : 0);
    }, 0);

  const totalAdvanceSum = members
    .filter(m => m.status === 'active')
    .reduce((sum, m) => {
      const totalDues = calculateTotalDues(m.joinedAt, m.yearlyFee);
      const memberPayments = payments.filter(p => p.userId === m.uid);
      const paidAmount = memberPayments.reduce((total, p) => total + p.amount, 0);
      const due = totalDues - paidAmount;
      return sum + (due < 0 ? Math.abs(due) : 0);
    }, 0);

  const menuItems = [
    {
      title: 'Member Directory',
      icon: 'people',
      color: '#4F46E5',
      route: '/(admin)/members',
      desc: 'Verify applications & assign roles'
    },
    {
      title: 'Schedule Meeting',
      icon: 'calendar',
      color: '#059669',
      route: '/(admin)/meetings/create',
      desc: 'Organize general & committee meets',
      permission: 'manageMeetings'
    },
    {
      title: 'Create Event',
      icon: 'flag',
      color: '#D97706',
      route: '/(admin)/events/create',
      desc: 'Build social meets & campaigns',
      permission: 'manageEvents'
    },
    {
      title: 'Fee Collections',
      icon: 'wallet',
      color: '#2563EB',
      route: '/(admin)/fees',
      desc: 'Track and generate monthly dues',
      permission: 'viewDues'
    },
    {
      title: 'Broadcast Announcement',
      icon: 'megaphone',
      color: '#7C3AED',
      route: '/(admin)/announcements/create',
      desc: 'Publish notices to all members'
    },
    {
      title: 'Manage Areas',
      icon: 'map',
      color: '#0F172A',
      route: '/(admin)/areas',
      desc: 'Create and remove regional areas',
      superAdminOnly: true
    },
    {
      title: 'Attendance Calendar',
      icon: 'calendar-clear-outline',
      color: '#8B5CF6',
      route: '/attendance/calendar',
      desc: 'View member presence grid',
      permission: 'viewAttendance'
    }
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.permission && !hasPermission(item.permission as any)) {
      if (item.title === 'Fee Collections' && hasPermission('generateDues')) {
        return true;
      }
      return false;
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <CustomHeader title="Admin Dashboard" showBack fallbackRoute="/(tabs)/fees" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.light.accent]}
            tintColor={Colors.light.accent}
          />
        }
      >
        {/* Financial Analytics Panel */}
        {hasFinancialAccess && (
          <Card style={styles.analyticsCard} elevation="md">
            <View style={styles.analyticsHeaderCol}>
              <Text style={styles.analyticsTitle}>Financial Analytics</Text>
              <Text style={styles.analyticsSubtitle}>Treasury balance & fleet cashflow summary</Text>
              
              {/* Filter Tabs */}
              <View style={styles.filterTabsRow}>
                {(['1m', '3m', '1y'] as const).map(filterOpt => (
                  <TouchableOpacity
                    key={filterOpt}
                    activeOpacity={0.7}
                    onPress={() => setAnalyticsFilter(filterOpt)}
                    style={[
                      styles.filterTabBtn,
                      analyticsFilter === filterOpt && styles.activeFilterTabBtn
                    ]}
                  >
                    <Text style={[
                      styles.filterTabBtnText,
                      analyticsFilter === filterOpt && styles.activeFilterTabBtnText
                    ]}>
                      {filterOpt === '1m' ? '1 Month' : filterOpt === '3m' ? '3 Months' : '1 Year'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Treasury & Collection Metrics Row */}
            <View style={styles.metricsSummaryGrid}>
              <View style={styles.metricSummaryItem}>
                <Text style={styles.metricSummaryLabel}>Treasury Cash Reserve</Text>
                <Text style={[styles.metricSummaryVal, { color: analytics.netProfit >= 0 ? Colors.light.success : Colors.light.error }]}>
                  ৳{analytics.netProfit.toLocaleString()}
                </Text>
                <Text style={styles.metricSummarySub}>Total net surplus funds</Text>
              </View>
              <View style={styles.metricSummaryDivider} />
              <View style={styles.metricSummaryItem}>
                <Text style={styles.metricSummaryLabel}>Collection Efficiency</Text>
                <Text style={[styles.metricSummaryVal, { color: Colors.light.primary }]}>
                  {Math.round((analytics.regularEarnings / Math.max(1, totalOutstandingSum + analytics.regularEarnings)) * 100)}%
                </Text>
                <Text style={styles.metricSummarySub}>Dues collection rate</Text>
              </View>
            </View>

            {/* Visual comparative horizontal bar chart */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Comparative Cashflow Balance</Text>
              
              {(() => {
                const projectedOwed = totalOutstandingSum + analytics.regularEarnings;
                const maxValue = Math.max(1, projectedOwed, analytics.regularEarnings, analytics.otherEarnings, analytics.totalExpenses);
                
                const getWidthPercent = (val: number) => {
                  return `${Math.max(4, Math.round((val / maxValue) * 100))}%`;
                };

                const chartData = [
                  { label: 'Projected Dues (Owed)', value: projectedOwed, color: '#6366F1', desc: 'Active members total target' },
                  { label: 'Dues Collected', value: analytics.regularEarnings, color: '#10B981', desc: 'Received member fees' },
                  { label: 'Other Income', value: analytics.otherEarnings, color: '#F59E0B', desc: 'Donations & resource rents' },
                  { label: 'Expenses Outflow', value: analytics.totalExpenses, color: '#EF4444', desc: 'Association costs' },
                ];

                return chartData.map((bar, idx) => (
                  <View key={idx} style={styles.chartRow}>
                    <View style={styles.chartRowMeta}>
                      <View>
                        <Text style={styles.chartRowLabel}>{bar.label}</Text>
                        <Text style={styles.chartRowDesc}>{bar.desc}</Text>
                      </View>
                      <Text style={[styles.chartRowVal, { color: bar.color }]}>৳{bar.value.toLocaleString()}</Text>
                    </View>
                    <View style={styles.chartBarBg}>
                      <View 
                        style={[
                          styles.chartBarFill, 
                          { width: getWidthPercent(bar.value) as any, backgroundColor: bar.color }
                        ]} 
                      />
                    </View>
                  </View>
                ));
              })()}
            </View>
          </Card>
        )}

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <Card 
            style={styles.statCard} 
            elevation="sm"
            onPress={() => router.push({
              pathname: '/(admin)/members',
              params: { initialStatus: 'active' }
            } as any)}
          >
            <Text style={styles.statNumber}>{activeMembers.length}</Text>
            <Text style={styles.statLabel}>Active Members</Text>
          </Card>
          <Card 
            style={[styles.statCard, pendingMembers.length > 0 && styles.statCardAlert]} 
            elevation="sm"
            onPress={() => router.push({
              pathname: '/(admin)/members',
              params: { initialStatus: 'inactive' }
            } as any)}
          >
            <Text style={[styles.statNumber, pendingMembers.length > 0 && { color: Colors.light.warning }]}>
              {pendingMembers.length}
            </Text>
            <Text style={styles.statLabel}>Pending Approval</Text>
          </Card>
          <Card style={styles.statCard} elevation="sm">
            <Text style={styles.statNumber}>{upcomingMeetings.length}</Text>
            <Text style={styles.statLabel}>Upcoming Meets</Text>
          </Card>
          <Card style={styles.statCard} elevation="sm">
            <Text style={[styles.statNumber, { color: Colors.light.error }]}>৳{totalOutstandingSum.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Outstanding Dues</Text>
          </Card>
          <Card style={styles.statCard} elevation="sm">
            <Text style={[styles.statNumber, { color: Colors.light.success }]}>৳{totalAdvanceSum.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Advance Payments</Text>
          </Card>
        </View>

        {/* Administration shortcuts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Management Services</Text>
          <View style={styles.menuGrid}>
            {filteredMenuItems.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.8}
                onPress={() => router.push(item.route as any)}
                style={styles.menuTile}
              >
                <View style={[styles.iconBox, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                </View>
                <Text style={styles.menuTitleText}>{item.title}</Text>
                <Text style={styles.menuDescText}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: '48%',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardAlert: {
    borderColor: '#FCD34D', // Amber highlight
    backgroundColor: '#FFFBEB',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.light.primary,
    fontWeight: '800',
    marginBottom: Spacing.md,
  },
  pendingCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  pendingMemberDetails: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  pendingName: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  pendingPhone: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  pendingVehicle: {
    ...Typography.bodySmall,
    color: Colors.light.textLight,
    marginTop: 2,
  },
  pendingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pendingBtnHalf: {
    width: '48%',
    height: 38,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuTile: {
    width: '48%',
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  menuTitleText: {
    ...Typography.bodyMedium,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  menuDescText: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginTop: 4,
    lineHeight: 14,
  },
  dangerZoneCard: {
    padding: Spacing.md,
    borderColor: Colors.light.errorLight,
    borderWidth: 1.5,
    backgroundColor: '#FEF2F2',
  },
  dangerZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  dangerZoneTitle: {
    ...Typography.bodyMedium,
    fontWeight: '800',
    color: Colors.light.error,
    marginLeft: Spacing.sm,
  },
  dangerZoneText: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 16,
  },
  injectBtn: {
    marginTop: Spacing.xs,
  },
  analyticsCard: {
    padding: Spacing.md,
    borderRadius: 16,
    backgroundColor: Colors.light.surface,
    marginBottom: Spacing.md,
  },
  analyticsHeaderCol: {
    marginBottom: Spacing.md,
  },
  analyticsTitle: {
    ...Typography.bodyMedium,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  filterTabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surfaceDarker,
    borderRadius: 8,
    padding: 3,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  filterTabBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeFilterTabBtn: {
    backgroundColor: Colors.light.accent,
  },
  filterTabBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  activeFilterTabBtnText: {
    color: '#FFFFFF',
  },
  analyticsDashboard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  analyticsMetricColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.light.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  metricSubtext: {
    fontSize: 8,
    color: Colors.light.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.light.border,
  },
  netProfitBarContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.surfaceDarker,
    paddingTop: Spacing.sm,
  },
  netProfitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  netProfitLabel: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  netProfitVal: {
    ...Typography.bodyMedium,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.light.surfaceDarker,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressBarLabel: {
    fontSize: 9,
    color: Colors.light.textSecondary,
  },
  analyticsSubtitle: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  metricsSummaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: Spacing.md,
  },
  metricSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricSummaryLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricSummaryVal: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  metricSummarySub: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
  },
  metricSummaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.light.border,
    marginHorizontal: 8,
  },
  chartContainer: {
    marginTop: Spacing.xs,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartRow: {
    marginBottom: Spacing.sm,
  },
  chartRowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chartRowLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  chartRowDesc: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
  },
  chartRowVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
