import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Card from '../../components/Card';
import CustomHeader from '../../components/CustomHeader';
import { Colors, Shadows, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useTabBarVisibility } from '../../context/TabBarVisibilityContext';
import { dbService } from '../../services/dbService';
import { PaymentRecord } from '../../services/mockData';
import { calculateTotalDues, calculateCumulativeDues } from '../../utils/feeUtils';

export default function FeesTracker() {
  const router = useRouter();
  const { user, isSuperAdmin, hasPermission } = useAuth();
  const { handleScroll } = useTabBarVisibility();
  
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const canManageFees = isSuperAdmin || hasPermission('viewDues') || hasPermission('generateDues');

  const loadFeeData = async () => {
    if (!user) return;
    try {
      const [fetchedPayments, instructions] = await Promise.all([
        dbService.getMemberPayments(user.uid),
        dbService.getPaymentInstructions()
      ]);
      setPaymentInstructions(instructions);
      // Sort payments by dateStr descending
      fetchedPayments.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
      setPayments(fetchedPayments);
    } catch (error) {
      console.error('Failed to load fee stats', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFeeData();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadFeeData();
  };

  // Calculations for dynamic dues
  const totalDues = user ? calculateTotalDues(user.joinedAt, user.yearlyFee) : 0;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const dueAmount = totalDues - totalPaid;

  const yearlyFee = user?.yearlyFee || 1200;
  const calculateYearlyDueForMember = () => {
    if (!user) return 0;
    const currentYear = new Date().getFullYear();
    const expectedCumulativeThisYear = calculateCumulativeDues(user.joinedAt, user.yearlyFee, currentYear);
    return Math.max(0, expectedCumulativeThisYear - totalPaid);
  };
  const memberYearlyDue = calculateYearlyDueForMember();

  const renderPaymentItem = ({ item }: { item: PaymentRecord }) => {
    return (
      <Card style={styles.paymentCard} elevation="sm">
        <View style={styles.paymentCardContent}>
          <View style={styles.paymentLeft}>
            <View style={styles.checkIconCircle}>
              <Ionicons name="checkmark-circle" size={22} color={Colors.light.success} />
            </View>
            <View style={styles.paymentTextContainer}>
              <Text style={styles.paymentAmount}>+৳{item.amount}</Text>
              {item.note ? <Text style={styles.paymentNote}>{item.note}</Text> : null}
            </View>
          </View>
          <View style={styles.paymentRight}>
            <Text style={styles.paymentDate}>{item.dateStr}</Text>
            <Text style={styles.auditedText}>Logged by Admin</Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderHeader = () => {
    return (
      <View style={styles.headerWrapper}>
        {/* Treasurer/Admin quick link */}
        {canManageFees && (
          <Card style={styles.managementBanner} onPress={() => router.push('/(admin)/fees')}>
            <View style={styles.managementContent}>
              <View style={styles.managementLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name="card" size={20} color={Colors.light.accent} />
                </View>
                <View style={styles.managementText}>
                  <Text style={styles.managementTitle}>Fee Collections Console</Text>
                  <Text style={styles.managementSub}>Track and record member BDT offline payment logs</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.light.accent} />
            </View>
          </Card>
        )}

        {/* Summary Card */}
        <Card style={[styles.summaryCard, dueAmount < 0 && { backgroundColor: '#10B981' }]} elevation="md">
          <Text style={styles.summaryTitle}>Balance Overview</Text>

          <View style={styles.duesOverviewContainer}>
            <View style={styles.dueSummaryBox}>
              <Text style={styles.dueSummaryLabel}>Yearly Due ({new Date().getFullYear()})</Text>
              <Text style={[styles.dueSummaryValue, memberYearlyDue > 0 && { color: '#F87171' }]}>৳{memberYearlyDue}</Text>
            </View>
            <View style={styles.dueSummaryDivider} />
            <View style={styles.dueSummaryBox}>
              <Text style={styles.dueSummaryLabel}>Yearly Rate</Text>
              <Text style={styles.dueSummaryValue}>৳{yearlyFee}/yr</Text>
            </View>
          </View>

          <Text style={[styles.outstandingAmount, dueAmount <= 0 && styles.noOutstanding]}>
            ৳{Math.abs(dueAmount).toLocaleString()}
          </Text>
          <Text style={styles.outstandingLabel}>
            {dueAmount < 0 ? 'Surplus Credit / Advance Paid' : 'Total Outstanding Dues (All Time)'}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>৳{totalDues}</Text>
              <Text style={styles.statLabel}>Total Owed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>৳{totalPaid}</Text>
              <Text style={styles.statLabel}>Total Paid</Text>
            </View>
          </View>

          {/* Background decoration icon */}
          <Ionicons name="card-outline" size={80} color="#FFFFFF" style={styles.cardBackgroundIcon as any} />
        </Card>

        {/* Payment Instructions Card */}
        <Card style={styles.instructionCard}>
          <View style={styles.instructionHeader}>
            <Ionicons name="information-circle" size={20} color={Colors.light.accent} />
            <Text style={styles.instructionHeading}>Payment Settlement Info</Text>
          </View>
          <Text style={styles.instructionBody}>
            {paymentInstructions || 'Please pay your outstanding dues directly to our association Treasurer to settle accounts.'}
          </Text>
        </Card>

        <Text style={styles.listTitle}>Payment History Logs</Text>
      </View>
    );
  };


  return (
    <View style={styles.container}>
      <CustomHeader title="Annual Fees" />

      <FlatList
        onScroll={handleScroll}
        scrollEventThrottle={16}
        data={payments}
        keyExtractor={item => item.id}
        renderItem={renderPaymentItem}
        ListHeaderComponent={renderHeader}
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
            <Ionicons name="wallet-outline" size={48} color={Colors.light.textLight} />
            <Text style={styles.emptyText}>No payment records found.</Text>
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
    paddingBottom: 100,
  },
  headerWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  managementBanner: {
    backgroundColor: Colors.light.accentLight,
    borderColor: '#C7D2FE',
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  managementContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  managementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  managementText: {
    flex: 1,
  },
  managementTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  managementSub: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#1E293B',
    padding: Spacing.xl,
    borderRadius: 20,
    marginBottom: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  duesOverviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dueSummaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  dueSummaryLabel: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dueSummaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  dueSummaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: Spacing.xs,
  },
  summaryTitle: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  outstandingAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.light.error,
    marginTop: Spacing.xs,
  },
  noOutstanding: {
    color: Colors.light.success,
  },
  outstandingLabel: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: Spacing.md,
  },
  statBox: {
    flex: 1,
  },
  statValue: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statLabel: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: Spacing.md,
  },
  cardBackgroundIcon: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    opacity: 0.06,
  },
  instructionCard: {
    padding: Spacing.lg,
    backgroundColor: Colors.light.surface,
    marginBottom: Spacing.lg,
    borderRadius: 16,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  instructionHeading: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  instructionBody: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  listTitle: {
    ...Typography.h3,
    color: Colors.light.primary,
    fontWeight: '800',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  paymentCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 12,
  },
  paymentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  checkIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTextContainer: {
    flex: 1,
  },
  paymentAmount: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.light.success,
  },
  paymentNote: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentDate: {
    ...Typography.bodySmall,
    color: Colors.light.text,
    fontWeight: '600',
  },
  auditedText: {
    fontSize: 9,
    color: Colors.light.textLight,
    marginTop: 2,
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
