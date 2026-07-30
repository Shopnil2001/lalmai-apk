import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView
} from 'react-native';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import CustomHeader from '../../../components/CustomHeader';
import Input from '../../../components/Input';
import RoleBadge from '../../../components/RoleBadge';
import { Colors, Shadows, Spacing, Typography } from '../../../constants/theme';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { dbService } from '../../../services/dbService';
import { PaymentRecord, UserProfile, OtherIncomeRecord, ExpenseRecord } from '../../../services/mockData';
import { calculateTotalDues, calculateYearlyDues, calculateCumulativeDues } from '../../../utils/feeUtils';

export default function FeeCollections() {
  const router = useRouter();
  const { user, isSuperAdmin } = useAuth();
  const { showToast } = useToast();
  
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [otherIncomeList, setOtherIncomeList] = useState<OtherIncomeRecord[]>([]);
  const [expensesList, setExpensesList] = useState<ExpenseRecord[]>([]);
  
  const [activeTab, setActiveTab] = useState<'member' | 'dues_summary' | 'income' | 'expense'>('member');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Yearly dues state
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showYearPickerModal, setShowYearPickerModal] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearsRange: number[] = [];
  for (let y = 2020; y <= currentYear + 2; y++) {
    yearsRange.push(y);
  }

  // Payment instructions state
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [instructionsInput, setInstructionsInput] = useState('');
  const [savingInstructions, setSavingInstructions] = useState(false);

  // Quick Record Payment state
  const [selectedMemberForPayment, setSelectedMemberForPayment] = useState<UserProfile | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Other Income state
  const [showOtherIncomeModal, setShowOtherIncomeModal] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [otherIncomeSource, setOtherIncomeSource] = useState('');
  const [otherIncomeAmount, setOtherIncomeAmount] = useState('');
  const [otherIncomeDate, setOtherIncomeDate] = useState('');
  const [otherIncomeNote, setOtherIncomeNote] = useState('');
  const [savingOtherIncome, setSavingOtherIncome] = useState(false);

  // Expense state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const loadCollections = async () => {
    try {
      const [fetchedUsers, fetchedPayments, instructions, fetchedOtherIncome, fetchedExpenses] = await Promise.all([
        dbService.getUsers(),
        dbService.getPayments(),
        dbService.getPaymentInstructions(),
        dbService.getOtherIncome(),
        dbService.getExpenses()
      ]);
      // Filter members to show only active members
      const activeUsers = fetchedUsers.filter(u => u.status === 'active');
      
      // If Admin user, restrict visibility to their assigned areas
      let scopedDrivers = activeUsers;
      if (user && user.role === 'Admin') {
        const assignedArea = user.assignedArea;
        const assignedAreas = user.assignedAreas || [];
        scopedDrivers = activeUsers.filter(
          d => d.area && (d.area === assignedArea || assignedAreas.includes(d.area))
        );
      }

      setMembers(scopedDrivers);
      setPayments(fetchedPayments);
      setPaymentInstructions(instructions);
      setInstructionsInput(instructions);
      setOtherIncomeList(fetchedOtherIncome);
      setExpensesList(fetchedExpenses);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load ledger collections.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadCollections();
      }
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadCollections();
  };

  const handleOpenInstructions = () => {
    setInstructionsInput(paymentInstructions);
    setShowInstructionsModal(true);
  };

  const handleSaveInstructions = async () => {
    try {
      setSavingInstructions(true);
      await dbService.updatePaymentInstructions(instructionsInput);
      setPaymentInstructions(instructionsInput);
      setShowInstructionsModal(false);
      showToast('Payment instructions note updated successfully.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to save instructions note.', 'error');
    } finally {
      setSavingInstructions(false);
    }
  };

  const handleOpenQuickPayment = (member: UserProfile) => {
    setSelectedMemberForPayment(member);
    setPaymentAmount('');
    setPaymentDate(getTodayStr());
    setPaymentNote('');
    setShowPaymentModal(true);
  };

  const handleConfirmQuickPayment = async () => {
    if (!selectedMemberForPayment || !user) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid BDT payment amount.');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(paymentDate)) {
      Alert.alert('Error', 'Please enter date in YYYY-MM-DD format.');
      return;
    }

    try {
      setRecordingPayment(true);
      await dbService.recordMemberPayment(
        selectedMemberForPayment.uid,
        amount,
        paymentDate,
        paymentNote,
        user.uid
      );
      showToast(`Logged payment of ৳${amount} for ${selectedMemberForPayment.name}.`, 'success');
      setShowPaymentModal(false);
      loadCollections(); // Reload
    } catch (error) {
      console.error(error);
      showToast('Failed to record payment.', 'error');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Other Income Handlers
  const handleOpenOtherIncomeModal = (existing?: OtherIncomeRecord) => {
    if (existing) {
      // Edit mode — pre-fill fields
      setEditingIncomeId(existing.id);
      setOtherIncomeSource(existing.source);
      setOtherIncomeAmount(String(existing.amount));
      setOtherIncomeDate(existing.dateStr);
      setOtherIncomeNote(existing.note || '');
    } else {
      // Add mode
      setEditingIncomeId(null);
      setOtherIncomeSource('');
      setOtherIncomeAmount('');
      setOtherIncomeDate(getTodayStr());
      setOtherIncomeNote('');
    }
    setShowOtherIncomeModal(true);
  };

  const handleConfirmOtherIncome = async () => {
    if (!user) return;
    const amount = parseFloat(otherIncomeAmount);
    if (!otherIncomeSource.trim()) {
      Alert.alert('Error', 'Please enter a valid source name.');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(otherIncomeDate)) {
      Alert.alert('Error', 'Please enter date in YYYY-MM-DD format.');
      return;
    }

    try {
      setSavingOtherIncome(true);
      if (editingIncomeId) {
        // Update existing record
        await dbService.updateOtherIncome(editingIncomeId, {
          source: otherIncomeSource.trim(),
          amount,
          dateStr: otherIncomeDate,
          note: otherIncomeNote.trim(),
        });
        showToast(`Updated income record for ${otherIncomeSource}.`, 'success');
      } else {
        await dbService.recordOtherIncome(
          otherIncomeSource.trim(),
          amount,
          otherIncomeDate,
          otherIncomeNote.trim(),
          user.uid
        );
        showToast(`Logged other income of ৳${amount} from ${otherIncomeSource}.`, 'success');
      }
      setShowOtherIncomeModal(false);
      loadCollections();
    } catch (error) {
      console.error(error);
      showToast('Failed to save other income record.', 'error');
    } finally {
      setSavingOtherIncome(false);
    }
  };

  const handleDeleteOtherIncome = (id: string, source: string) => {
    Alert.alert(
      'Delete Income Record',
      `Are you sure you want to delete the record for "${source}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dbService.deleteOtherIncome(id);
              showToast('Record deleted.', 'success');
              loadCollections();
            } catch (error) {
              console.error(error);
              showToast('Failed to delete record.', 'error');
            }
          }
        }
      ]
    );
  };

  // Expense Handlers
  const handleOpenExpenseModal = (existing?: ExpenseRecord) => {
    if (existing) {
      // Edit mode — pre-fill fields
      setEditingExpenseId(existing.id);
      setExpenseDesc(existing.description);
      setExpenseAmount(String(existing.amount));
      setExpenseDate(existing.dateStr);
      setExpenseNote(existing.note || '');
    } else {
      // Add mode
      setEditingExpenseId(null);
      setExpenseDesc('');
      setExpenseAmount('');
      setExpenseDate(getTodayStr());
      setExpenseNote('');
    }
    setShowExpenseModal(true);
  };

  const handleConfirmExpense = async () => {
    if (!user) return;
    const amount = parseFloat(expenseAmount);
    if (!expenseDesc.trim()) {
      Alert.alert('Error', 'Please enter a description.');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(expenseDate)) {
      Alert.alert('Error', 'Please enter date in YYYY-MM-DD format.');
      return;
    }

    try {
      setSavingExpense(true);
      if (editingExpenseId) {
        // Update existing record
        await dbService.updateExpense(editingExpenseId, {
          description: expenseDesc.trim(),
          amount,
          dateStr: expenseDate,
          note: expenseNote.trim(),
        });
        showToast(`Updated expense record for ${expenseDesc}.`, 'success');
      } else {
        await dbService.recordExpense(
          expenseDesc.trim(),
          amount,
          expenseDate,
          expenseNote.trim(),
          user.uid
        );
        showToast(`Logged expense of ৳${amount} for ${expenseDesc}.`, 'success');
      }
      setShowExpenseModal(false);
      loadCollections();
    } catch (error) {
      console.error(error);
      showToast('Failed to save expense record.', 'error');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = (id: string, desc: string) => {
    Alert.alert(
      'Delete Expense Record',
      `Are you sure you want to delete the expense record for "${desc}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dbService.deleteExpense(id);
              showToast('Expense record deleted.', 'success');
              loadCollections();
            } catch (error) {
              console.error(error);
              showToast('Failed to delete expense record.', 'error');
            }
          }
        }
      ]
    );
  };

  // Filter lists based on search
  const filteredMembers = members.filter(m => {
    const query = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(query) ||
      m.phone.includes(query) ||
      (m.area && m.area.toLowerCase().includes(query))
    );
  });

  const filteredOtherIncome = otherIncomeList.filter(inc => {
    const query = searchQuery.toLowerCase();
    return (
      inc.source.toLowerCase().includes(query) ||
      (inc.note && inc.note.toLowerCase().includes(query)) ||
      inc.dateStr.includes(query)
    );
  });

  const filteredExpenses = expensesList.filter(exp => {
    const query = searchQuery.toLowerCase();
    return (
      exp.description.toLowerCase().includes(query) ||
      (exp.note && exp.note.toLowerCase().includes(query)) ||
      exp.dateStr.includes(query)
    );
  });

  // Calculations
  const totalOwedAll = members.reduce((sum, m) => sum + calculateTotalDues(m.joinedAt, m.yearlyFee), 0);
  const totalPaidAll = payments.reduce((sum, p) => {
    const isScoped = members.some(m => m.uid === p.userId);
    return sum + (isScoped ? p.amount : 0);
  }, 0);

  // Outstanding dues should only sum actual unpaid dues (ignoring negative dues of advance paid members)
  const totalDueAll = members.reduce((sum, m) => {
    const totalDues = calculateTotalDues(m.joinedAt, m.yearlyFee);
    const memberPayments = payments.filter(p => p.userId === m.uid);
    const paidAmount = memberPayments.reduce((total, p) => total + p.amount, 0);
    const due = totalDues - paidAmount;
    return sum + (due > 0 ? due : 0);
  }, 0);

  // Sum total advance/surplus payments across all members
  const totalAdvanceAll = members.reduce((sum, m) => {
    const totalDues = calculateTotalDues(m.joinedAt, m.yearlyFee);
    const memberPayments = payments.filter(p => p.userId === m.uid);
    const paidAmount = memberPayments.reduce((total, p) => total + p.amount, 0);
    const due = totalDues - paidAmount;
    return sum + (due < 0 ? Math.abs(due) : 0);
  }, 0);

  const getEndDateStr = (year: number) => {
    const currentYear = new Date().getFullYear();
    if (year >= currentYear) {
      return new Date().toISOString().split('T')[0];
    }
    return `${year}-12-31`;
  };

  const endDateStr = getEndDateStr(selectedYear);

  // Yearly calculations for targetYear (cumulative running balance)
  const totalExpectedInYear = members.reduce((sum, m) => {
    return sum + calculateCumulativeDues(m.joinedAt, m.yearlyFee, selectedYear);
  }, 0);

  const totalPaidInYear = payments.reduce((sum, p) => {
    const isScoped = members.some(m => m.uid === p.userId);
    return sum + (isScoped && p.dateStr <= endDateStr ? p.amount : 0);
  }, 0);

  const totalDueInYear = members.reduce((sum, m) => {
    const exp = calculateCumulativeDues(m.joinedAt, m.yearlyFee, selectedYear);
    const memberPayments = payments.filter(p => p.userId === m.uid && p.dateStr <= endDateStr);
    const paid = memberPayments.reduce((total, p) => total + p.amount, 0);
    const due = exp - paid;
    return sum + (due > 0 ? due : 0);
  }, 0);

  const totalAdvanceInYear = members.reduce((sum, m) => {
    const exp = calculateCumulativeDues(m.joinedAt, m.yearlyFee, selectedYear);
    const memberPayments = payments.filter(p => p.userId === m.uid && p.dateStr <= endDateStr);
    const paid = memberPayments.reduce((total, p) => total + p.amount, 0);
    const due = exp - paid;
    return sum + (due < 0 ? Math.abs(due) : 0);
  }, 0);

  const totalOtherIncomeSum = otherIncomeList.reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpensesSum = expensesList.reduce((sum, exp) => sum + exp.amount, 0);

  // Renderers
  const renderMemberLedgerItem = ({ item }: { item: UserProfile }) => {
    const totalDues = calculateTotalDues(item.joinedAt, item.yearlyFee);
    const memberPayments = payments.filter(p => p.userId === item.uid);
    const paidAmount = memberPayments.reduce((sum, p) => sum + p.amount, 0);
    const dueAmount = totalDues - paidAmount;

    const currentYear = new Date().getFullYear();
    const expectedDuesThisYear = calculateCumulativeDues(item.joinedAt, item.yearlyFee, currentYear);
    const yearlyDue = Math.max(0, expectedDuesThisYear - paidAmount);

    return (
      <Card style={styles.ledgerCard} elevation="sm">
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.memberNameText}>
              {item.name}
              {item.area ? ` • ${item.area}` : ''}
            </Text>
            <Text style={styles.memberRateText}>Rate: ৳{item.yearlyFee ?? 1200}/yr • Yearly Due: ৳{yearlyDue}</Text>
          </View>
          <RoleBadge roleOrStatus={item.status as any} />
        </View>

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

        <View style={styles.actionButtons}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push({
              pathname: '/(admin)/members/[id]',
              params: { id: item.uid }
            })}
            style={[styles.actionBtn, styles.profileBtn]}
          >
            <Ionicons name="person-outline" size={14} color={Colors.light.primary} />
            <Text style={styles.profileBtnText}>Profile & History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleOpenQuickPayment(item)}
            style={[styles.actionBtn, styles.paymentBtn]}
          >
            <Ionicons name="cash-outline" size={14} color="#FFFFFF" />
            <Text style={styles.paymentBtnText}>Log Payment</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderYearlyDueItem = ({ item }: { item: UserProfile }) => {
    const expectedDues = calculateCumulativeDues(item.joinedAt, item.yearlyFee, selectedYear);
    const memberPayments = payments.filter(p => p.userId === item.uid && p.dateStr <= endDateStr);
    const paidAmount = memberPayments.reduce((sum, p) => sum + p.amount, 0);
    const dueAmount = expectedDues - paidAmount;

    return (
      <Card style={styles.ledgerCard} elevation="sm">
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.memberNameText}>
              {item.name}
              {item.area ? ` • ${item.area}` : ''}
            </Text>
            <Text style={styles.memberRateText}>Yearly Rate: ৳{item.yearlyFee ?? 1200}</Text>
          </View>
          <RoleBadge roleOrStatus={item.status as any} />
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>Expected (to {selectedYear})</Text>
            <Text style={[styles.statValue, styles.totalValue]}>৳{expectedDues}</Text>
          </View>
          <View style={[styles.statColumn, styles.borderLeftRight]}>
            <Text style={styles.statLabel}>Paid (to {selectedYear})</Text>
            <Text style={[styles.statValue, styles.paidValue]}>৳{paidAmount}</Text>
          </View>
          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>{dueAmount < 0 ? 'Advance' : 'Due'}</Text>
            <Text style={[
              styles.statValue, 
              dueAmount < 0 ? styles.paidValue : styles.dueValue
            ]}>
              ৳{Math.abs(dueAmount)}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push({
              pathname: '/(admin)/members/[id]',
              params: { id: item.uid }
            })}
            style={[styles.actionBtn, styles.profileBtn]}
          >
            <Ionicons name="person-outline" size={14} color={Colors.light.primary} />
            <Text style={styles.profileBtnText}>Profile & History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleOpenQuickPayment(item)}
            style={[styles.actionBtn, styles.paymentBtn]}
          >
            <Ionicons name="cash-outline" size={14} color="#FFFFFF" />
            <Text style={styles.paymentBtnText}>Log Payment</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderOtherIncomeItem = ({ item }: { item: OtherIncomeRecord }) => {
    return (
      <Card style={styles.ledgerCard} elevation="sm">
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1, paddingRight: Spacing.sm }}>
            <Text style={styles.memberNameText}>{item.source}</Text>
            <Text style={styles.memberRateText}>Date: {item.dateStr}</Text>
            {item.note ? <Text style={styles.noteText}>Note: {item.note}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <Text style={[styles.statValue, styles.paidValue, { fontSize: 16 }]}>৳{item.amount}</Text>
            {isSuperAdmin && (
              <View style={styles.rowActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleOpenOtherIncomeModal(item)}
                  style={[styles.rowActionBtn, styles.editBtn]}
                >
                  <Ionicons name="pencil" size={14} color={Colors.light.accent} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleDeleteOtherIncome(item.id, item.source)}
                  style={[styles.rowActionBtn, styles.deleteBtn]}
                >
                  <Ionicons name="trash-outline" size={14} color={Colors.light.error} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Card>
    );
  };

  const renderExpenseItem = ({ item }: { item: ExpenseRecord }) => {
    return (
      <Card style={styles.ledgerCard} elevation="sm">
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1, paddingRight: Spacing.sm }}>
            <Text style={styles.memberNameText}>{item.description}</Text>
            <Text style={styles.memberRateText}>Date: {item.dateStr}</Text>
            {item.note ? <Text style={styles.noteText}>Note: {item.note}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <Text style={[styles.statValue, styles.dueValue, { fontSize: 16 }]}>৳{item.amount}</Text>
            {isSuperAdmin && (
              <View style={styles.rowActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleOpenExpenseModal(item)}
                  style={[styles.rowActionBtn, styles.editBtn]}
                >
                  <Ionicons name="pencil" size={14} color={Colors.light.accent} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleDeleteExpense(item.id, item.description)}
                  style={[styles.rowActionBtn, styles.deleteBtn]}
                >
                  <Ionicons name="trash-outline" size={14} color={Colors.light.error} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Fee Collections" showBack fallbackRoute="/(admin)/dashboard" />

      {/* Segmented Tab Headers */}
      {!loading && (
        <View style={styles.tabContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContent}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setActiveTab('member'); setSearchQuery(''); }}
              style={[styles.tabButton, activeTab === 'member' && styles.activeTabButton]}
            >
              <Ionicons 
                name="people" 
                size={14} 
                color={activeTab === 'member' ? '#FFFFFF' : Colors.light.textSecondary} 
              />
              <Text style={[styles.tabButtonText, activeTab === 'member' && styles.activeTabButtonText]}>
                Member Ledger
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setActiveTab('dues_summary'); setSearchQuery(''); }}
              style={[styles.tabButton, activeTab === 'dues_summary' && styles.activeTabButton]}
            >
              <Ionicons 
                name="calendar" 
                size={14} 
                color={activeTab === 'dues_summary' ? '#FFFFFF' : Colors.light.textSecondary} 
              />
              <Text style={[styles.tabButtonText, activeTab === 'dues_summary' && styles.activeTabButtonText]}>
                Due Summary
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setActiveTab('income'); setSearchQuery(''); }}
              style={[styles.tabButton, activeTab === 'income' && styles.activeTabButton]}
            >
              <Ionicons 
                name="cash" 
                size={14} 
                color={activeTab === 'income' ? '#FFFFFF' : Colors.light.textSecondary} 
              />
              <Text style={[styles.tabButtonText, activeTab === 'income' && styles.activeTabButtonText]}>
                Other Income
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setActiveTab('expense'); setSearchQuery(''); }}
              style={[styles.tabButton, activeTab === 'expense' && styles.activeTabButton]}
            >
              <Ionicons 
                name="trending-down" 
                size={14} 
                color={activeTab === 'expense' ? '#FFFFFF' : Colors.light.textSecondary} 
              />
              <Text style={[styles.tabButtonText, activeTab === 'expense' && styles.activeTabButtonText]}>
                Expenses
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.accent} />
          <Text style={styles.loadingText}>Loading ledger accounts...</Text>
        </View>
      ) : (
        <FlatList
          data={(activeTab === 'member' ? filteredMembers : activeTab === 'dues_summary' ? filteredMembers : activeTab === 'income' ? filteredOtherIncome : filteredExpenses) as any[]}
          keyExtractor={(item: any) => item.id || item.uid}
          renderItem={(activeTab === 'member' ? renderMemberLedgerItem : activeTab === 'dues_summary' ? renderYearlyDueItem : activeTab === 'income' ? renderOtherIncomeItem : renderExpenseItem) as any}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.light.accent]}
              tintColor={Colors.light.accent}
            />
          }
          ListHeaderComponent={
            <View>
              {activeTab === 'member' && (
                <>
                  <Card style={styles.statsCard} elevation="md">
                    <Text style={styles.statsCardTitle}>Outstanding Collections Summary</Text>
                    <Text style={styles.statsCardAmount}>৳{totalDueAll.toLocaleString()}</Text>
                    <Text style={styles.statsCardSubtitle}>Total Outstanding Unpaid Dues Balance</Text>
 
                    <View style={styles.statsBoardRow}>
                      <View style={styles.statsBoardColumn}>
                        <Text style={styles.boardLabel}>Total Owed</Text>
                        <Text style={styles.boardValue}>৳{totalOwedAll.toLocaleString()}</Text>
                      </View>
                      <View style={styles.boardDivider} />
                      <View style={styles.statsBoardColumn}>
                        <Text style={styles.boardLabel}>Collected</Text>
                        <Text style={styles.boardValue}>৳{totalPaidAll.toLocaleString()}</Text>
                      </View>
                      <View style={styles.boardDivider} />
                      <View style={styles.statsBoardColumn}>
                        <Text style={styles.boardLabel}>Advance</Text>
                        <Text style={[styles.boardValue, { color: '#34D399' }]}>৳{totalAdvanceAll.toLocaleString()}</Text>
                      </View>
                    </View>
                  </Card>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleOpenInstructions}
                    style={styles.instructionsBanner}
                  >
                    <View style={styles.bannerLeft}>
                      <Ionicons name="create-outline" size={18} color={Colors.light.accent} />
                      <Text style={styles.bannerText}>Edit Payment Settlement Instructions</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.light.accent} />
                  </TouchableOpacity>

                  <Text style={styles.listSectionTitle}>Member Dues Ledger</Text>
                  
                  <Input
                    placeholder="Search ledger by name, phone or area..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    leftIcon="search-outline"
                    containerStyle={styles.searchInput}
                  />
                </>
              )}

              {activeTab === 'dues_summary' && (
                <>
                  {/* Selectable Year Row */}
                  <View style={styles.yearRowWrapper}>
                    <Text style={styles.yearRowLabel}>Select Year</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.yearRowScroll}
                    >
                      {yearsRange.map((yr) => (
                        <TouchableOpacity
                          key={yr}
                          activeOpacity={0.8}
                          onPress={() => setSelectedYear(yr)}
                          style={[
                            styles.yearRowButton,
                            selectedYear === yr && styles.yearRowButtonActive
                          ]}
                        >
                          <Text style={[
                            styles.yearRowButtonText,
                            selectedYear === yr && styles.yearRowButtonTextActive
                          ]}>
                            {yr}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <Card style={styles.statsCard} elevation="md">
                    <View style={styles.yearPickerHeaderRow}>
                      <Text style={styles.statsCardTitle}>Yearly Dues Summary</Text>
                    </View>
                    
                    <Text style={styles.statsCardAmount}>৳{totalDueInYear.toLocaleString()}</Text>
                    <Text style={styles.statsCardSubtitle}>Total Outstanding Unpaid Dues for {selectedYear}</Text>
 
                    <View style={styles.statsBoardRow}>
                      <View style={styles.statsBoardColumn}>
                        <Text style={styles.boardLabel}>Expected</Text>
                        <Text style={styles.boardValue}>৳{totalExpectedInYear.toLocaleString()}</Text>
                      </View>
                      <View style={styles.boardDivider} />
                      <View style={styles.statsBoardColumn}>
                        <Text style={styles.boardLabel}>Collected</Text>
                        <Text style={styles.boardValue}>৳{totalPaidInYear.toLocaleString()}</Text>
                      </View>
                      <View style={styles.boardDivider} />
                      <View style={styles.statsBoardColumn}>
                        <Text style={styles.boardLabel}>Advance</Text>
                        <Text style={[styles.boardValue, { color: '#34D399' }]}>৳{totalAdvanceInYear.toLocaleString()}</Text>
                      </View>
                    </View>
                  </Card>

                  <Text style={styles.listSectionTitle}>Dues Records for {selectedYear}</Text>
                  
                  <Input
                    placeholder="Search dues ledger by name, phone or area..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    leftIcon="search-outline"
                    containerStyle={styles.searchInput}
                  />
                </>
              )}

              {activeTab === 'income' && (
                <>
                  <Card style={styles.statsCard} elevation="md">
                    <Text style={styles.statsCardTitle}>Other Income Summary</Text>
                    <Text style={[styles.statsCardAmount, { color: Colors.light.success }]}>
                      ৳{totalOtherIncomeSum.toLocaleString()}
                    </Text>
                    <Text style={styles.statsCardSubtitle}>Total central earnings from other resources</Text>
                  </Card>

                  <Button 
                    title="Record Other Income" 
                    variant="primary" 
                    onPress={handleOpenOtherIncomeModal} 
                    leftIcon="add-circle-outline"
                    style={{ marginBottom: Spacing.md }}
                  />

                  <Text style={styles.listSectionTitle}>Other Income Register</Text>
                  
                  <Input
                    placeholder="Search other income by source or note..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    leftIcon="search-outline"
                    containerStyle={styles.searchInput}
                  />
                </>
              )}

              {activeTab === 'expense' && (
                <>
                  <Card style={styles.statsCard} elevation="md">
                    <Text style={styles.statsCardTitle}>Expenses Summary</Text>
                    <Text style={[styles.statsCardAmount, { color: Colors.light.error }]}>
                      ৳{totalExpensesSum.toLocaleString()}
                    </Text>
                    <Text style={styles.statsCardSubtitle}>Total central outflows logged</Text>
                  </Card>

                  <Button 
                    title="Add Expense" 
                    variant="danger" 
                    onPress={handleOpenExpenseModal} 
                    leftIcon="add-circle-outline"
                    style={{ marginBottom: Spacing.md }}
                  />

                  <Text style={styles.listSectionTitle}>Expenses Register</Text>
                  
                  <Input
                    placeholder="Search expenses by description or note..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    leftIcon="search-outline"
                    containerStyle={styles.searchInput}
                  />
                </>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons 
                name={
                  activeTab === 'member' || activeTab === 'dues_summary'
                    ? "people-outline" 
                    : activeTab === 'income' 
                      ? "cash-outline" 
                      : "trending-down-outline"
                } 
                size={48} 
                color={Colors.light.textLight} 
              />
              <Text style={styles.emptyText}>
                {activeTab === 'member' || activeTab === 'dues_summary'
                  ? "No members found matching query." 
                  : activeTab === 'income' 
                    ? "No other income records found." 
                    : "No expenses found."}
              </Text>
            </View>
          }
        />
      )}

      {/* Instructions Modal */}
      <Modal
        visible={showInstructionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInstructionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <Text style={styles.modalTitle}>Payment Instructions</Text>
            <Text style={styles.modalSubtitle}>Configure payment note displayed to driver members</Text>

            <Input
              placeholder="Enter manual payment bank information, bkash details, rocket numbers etc."
              value={instructionsInput}
              onChangeText={setInstructionsInput}
              multiline
              containerStyle={styles.modalInputArea}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowInstructionsModal(false)}
                style={styles.modalBtn}
                disabled={savingInstructions}
              />
              <Button
                title="Save Info"
                variant="primary"
                onPress={handleSaveInstructions}
                style={styles.modalBtn}
                loading={savingInstructions}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Quick Record Payment Modal */}
      {selectedMemberForPayment && (
        <Modal
          visible={showPaymentModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPaymentModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard} elevation="lg">
              <Text style={styles.modalTitle}>Record Payment</Text>
              <Text style={styles.modalSubtitle}>Settle dues for {selectedMemberForPayment.name}</Text>

              <Input
                label="Amount (৳) *"
                placeholder="e.g. 500"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                leftIcon="cash-outline"
                keyboardType="number-pad"
                containerStyle={styles.modalInput}
              />

              <Input
                label="Payment Date (YYYY-MM-DD) *"
                placeholder="YYYY-MM-DD"
                value={paymentDate}
                onChangeText={setPaymentDate}
                leftIcon="calendar-outline"
                containerStyle={styles.modalInput}
              />

              <Input
                label="Note / Reference"
                placeholder="e.g. Cash payment"
                value={paymentNote}
                onChangeText={setPaymentNote}
                leftIcon="document-text-outline"
                containerStyle={styles.modalInput}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowPaymentModal(false)}
                  style={styles.modalBtn}
                  disabled={recordingPayment}
                />
                <Button
                  title="Record"
                  variant="primary"
                  onPress={handleConfirmQuickPayment}
                  style={styles.modalBtn}
                  loading={recordingPayment}
                />
              </View>
            </Card>
          </View>
        </Modal>
      )}

      {/* Record Other Income Modal */}
      <Modal
        visible={showOtherIncomeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOtherIncomeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <Text style={styles.modalTitle}>{editingIncomeId ? 'Edit Income Record' : 'Other Income'}</Text>
            <Text style={styles.modalSubtitle}>{editingIncomeId ? 'Update the income entry below' : 'Record non-dues central revenues'}</Text>

            <Input
              label="Source / Category *"
              placeholder="e.g. Lalmai Hotel Rent, Donation"
              value={otherIncomeSource}
              onChangeText={setOtherIncomeSource}
              leftIcon="business-outline"
              containerStyle={styles.modalInput}
            />

            <Input
              label="Amount (৳) *"
              placeholder="e.g. 15000"
              value={otherIncomeAmount}
              onChangeText={setOtherIncomeAmount}
              leftIcon="cash-outline"
              keyboardType="number-pad"
              containerStyle={styles.modalInput}
            />

            <Input
              label="Date (YYYY-MM-DD) *"
              placeholder="YYYY-MM-DD"
              value={otherIncomeDate}
              onChangeText={setOtherIncomeDate}
              leftIcon="calendar-outline"
              containerStyle={styles.modalInput}
            />

            <Input
              label="Description / Note"
              placeholder="e.g. Received from manager"
              value={otherIncomeNote}
              onChangeText={setOtherIncomeNote}
              leftIcon="document-text-outline"
              containerStyle={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowOtherIncomeModal(false)}
                style={styles.modalBtn}
                disabled={savingOtherIncome}
              />
              <Button
                title={editingIncomeId ? 'Save Changes' : 'Record'}
                variant="primary"
                onPress={handleConfirmOtherIncome}
                style={styles.modalBtn}
                loading={savingOtherIncome}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Add Expense Modal */}
      <Modal
        visible={showExpenseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExpenseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <Text style={styles.modalTitle}>{editingExpenseId ? 'Edit Expense Record' : 'Add Expense'}</Text>
            <Text style={styles.modalSubtitle}>{editingExpenseId ? 'Update the expense entry below' : 'Record association outflows'}</Text>

            <Input
              label="Description / Purpose *"
              placeholder="e.g. repair: 200tk, Electricity Bill"
              value={expenseDesc}
              onChangeText={setExpenseDesc}
              leftIcon="construct-outline"
              containerStyle={styles.modalInput}
            />

            <Input
              label="Amount (৳) *"
              placeholder="e.g. 200"
              value={expenseAmount}
              onChangeText={setExpenseAmount}
              leftIcon="cash-outline"
              keyboardType="number-pad"
              containerStyle={styles.modalInput}
            />

            <Input
              label="Date (YYYY-MM-DD) *"
              placeholder="YYYY-MM-DD"
              value={expenseDate}
              onChangeText={setExpenseDate}
              leftIcon="calendar-outline"
              containerStyle={styles.modalInput}
            />

            <Input
              label="Additional Note"
              placeholder="e.g. Settle fan repair bills"
              value={expenseNote}
              onChangeText={setExpenseNote}
              leftIcon="document-text-outline"
              containerStyle={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowExpenseModal(false)}
                style={styles.modalBtn}
                disabled={savingExpense}
              />
              <Button
                title={editingExpenseId ? 'Save Changes' : 'Record'}
                variant="primary"
                onPress={handleConfirmExpense}
                style={styles.modalBtn}
                loading={savingExpense}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Year Picker Modal */}
      <Modal
        visible={showYearPickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowYearPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <Text style={styles.modalTitle}>Select Year</Text>
            <Text style={styles.modalSubtitle}>Pick a calendar year to view dues records</Text>
            
            <ScrollView style={styles.yearScrollContainer}>
              {yearsRange.map((yr) => (
                <TouchableOpacity
                  key={yr}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedYear(yr);
                    setShowYearPickerModal(false);
                  }}
                  style={[
                    styles.yearSelectorItem,
                    selectedYear === yr && styles.yearSelectorItemActive
                  ]}
                >
                  <Text style={[
                    styles.yearSelectorItemText,
                    selectedYear === yr && styles.yearSelectorItemTextActive
                  ]}>{yr}</Text>
                  {selectedYear === yr && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.light.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Button
              title="Close"
              variant="outline"
              onPress={() => setShowYearPickerModal(false)}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        </View>
      </Modal>
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
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    marginTop: Spacing.sm,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: Colors.light.accent,
  },
  tabButtonText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  activeTabButtonText: {
    color: '#FFFFFF',
  },
  statsCard: {
    backgroundColor: '#0F172A',
    padding: Spacing.xl,
    borderRadius: 20,
    marginBottom: Spacing.md,
  },
  statsCardTitle: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsCardAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.light.error,
    marginTop: Spacing.xs,
    marginBottom: 2,
  },
  statsCardSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: Spacing.lg,
  },
  statsBoardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: Spacing.md,
  },
  statsBoardColumn: {
    flex: 1,
  },
  boardLabel: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  boardValue: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  boardDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: Spacing.md,
  },
  instructionsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.accentLight,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: Spacing.lg,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bannerText: {
    ...Typography.bodyMedium,
    color: Colors.light.accent,
    fontWeight: '600',
  },
  listSectionTitle: {
    ...Typography.h3,
    color: Colors.light.primary,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  searchInput: {
    marginBottom: Spacing.lg,
  },
  ledgerCard: {
    padding: Spacing.md,
    borderRadius: 16,
    marginBottom: Spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  memberNameText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  memberRateText: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  noteText: {
    ...Typography.bodySmall,
    color: Colors.light.textLight,
    marginTop: 4,
    fontStyle: 'italic',
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
  paymentBtn: {
    backgroundColor: Colors.light.primary,
  },
  paymentBtnText: {
    ...Typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '700',
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
  modalInput: {
    marginBottom: Spacing.sm,
  },
  modalInputArea: {
    minHeight: 120,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalBtn: {
    flex: 1,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  rowActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    gap: 4,
  },
  editBtn: {
    backgroundColor: Colors.light.accentLight,
    borderWidth: 1,
    borderColor: Colors.light.accent,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.accent,
  },
  deleteBtn: {
    backgroundColor: Colors.light.errorLight,
    borderWidth: 1,
    borderColor: Colors.light.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tabScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  yearPickerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  yearPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  yearPickerButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  yearScrollContainer: {
    maxHeight: 240,
    marginVertical: Spacing.sm,
  },
  yearSelectorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.surfaceDarker,
    paddingHorizontal: Spacing.sm,
  },
  yearSelectorItemActive: {
    backgroundColor: Colors.light.accentLight,
    borderRadius: 10,
  },
  yearSelectorItemText: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '500',
  },
  yearSelectorItemTextActive: {
    color: Colors.light.accent,
    fontWeight: '700',
  },
  yearRowWrapper: {
    marginBottom: Spacing.md,
    paddingHorizontal: 2,
  },
  yearRowLabel: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  yearRowScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  yearRowButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: Colors.light.border,
    minWidth: 75,
    alignItems: 'center',
    marginRight: 6,
  },
  yearRowButtonActive: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  yearRowButtonText: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    fontWeight: '700',
  },
  yearRowButtonTextActive: {
    color: '#FFFFFF',
  },
});
