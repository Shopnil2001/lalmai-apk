import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
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
import { Area, MemberAttendance, PaymentRecord, UserProfile } from '../../../services/mockData';
import { calculateTotalDues, calculateCumulativeDues } from '../../../utils/feeUtils';

export default function MemberDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, hasPermission } = useAuth();
  
  const [member, setMember] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Stats and histories
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<string[]>([]); // Array of dateStr

  // Role and settings states
  const [selectedRole, setSelectedRole] = useState<UserProfile['role']>('General Member');
  const [selectedStatus, setSelectedStatus] = useState<UserProfile['status']>('pending');
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedAssignedAreas, setSelectedAssignedAreas] = useState<string[]>([]);
  const [permissions, setPermissions] = useState({
    viewDues: false,
    generateDues: false,
    manageMeetings: false,
    manageEvents: false,
    viewAttendance: true,
    takeAttendance: false,
    logPayment: false,
    viewPayment: false,
    editYearlyFee: false,
    editUser: false,
  });

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDrivingLicense, setEditDrivingLicense] = useState('');
  const [editRegistrationNumber, setEditRegistrationNumber] = useState('');

  const [yearlyFeeInput, setYearlyFeeInput] = useState('1200');
  
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Attendance calendar states
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const roles: UserProfile['role'][] = [
    'Super Admin',
    'Admin',
    'General Member'
  ];

  const statuses: UserProfile['status'][] = ['pending', 'active', 'suspended'];

  const loadMember = async () => {
    if (!id) return;
    try {
      const [allUsers, allAreas, allPayments, allAttendance] = await Promise.all([
        dbService.getUsers(),
        dbService.getAreas(),
        dbService.getPayments(),
        dbService.getMemberAttendance(id as string)
      ]);
      
      setAreas(allAreas);
      setPayments(allPayments.filter(p => p.userId === id));
      setAttendanceRecords(allAttendance.map(a => a.dateStr));

      const found = allUsers.find(u => u.uid === id);
      if (found) {
        setMember(found);
        setSelectedRole(found.role);
        setSelectedStatus(found.status);
        setSelectedArea(found.area || '');
        setSelectedAssignedAreas(found.assignedAreas || (found.assignedArea ? [found.assignedArea] : []));
        setYearlyFeeInput(String(found.yearlyFee ?? 1200));
        
        if (found.permissions) {
          setPermissions({
            viewDues: !!found.permissions.viewDues,
            generateDues: !!found.permissions.generateDues,
            manageMeetings: !!found.permissions.manageMeetings,
            manageEvents: !!found.permissions.manageEvents,
            viewAttendance: !!found.permissions.viewAttendance,
            takeAttendance: !!found.permissions.takeAttendance,
            logPayment: !!found.permissions.logPayment,
            viewPayment: !!found.permissions.viewPayment,
            editYearlyFee: !!found.permissions.editYearlyFee,
            editUser: !!found.permissions.editUser,
          });
        } else {
          setPermissions({
            viewDues: false,
            generateDues: false,
            manageMeetings: false,
            manageEvents: false,
            viewAttendance: true,
            takeAttendance: false,
            logPayment: false,
            viewPayment: false,
            editYearlyFee: false,
            editUser: false,
          });
        }

        setEditName(found.name || '');
        setEditPhone(found.phone || '');
        setEditEmail(found.email || '');
        setEditDrivingLicense(found.drivingLicense || '');
        setEditRegistrationNumber(found.registrationNumber || '');
      } else {
        Alert.alert('Error', 'Member not found.', [
          {
            text: 'OK',
            onPress: () => router.replace('/(admin)/dashboard')
          }
        ]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load member profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && user) {
      loadMember();
    }
  }, [id, user]);

  const handleUpdateMember = async () => {
    if (!member) return;

    // Owner protection: only the owner themselves can update the owner account
    if (member.isOwner && !user?.isOwner) {
      Alert.alert(
        'Protected Account',
        'The Owner account can only be edited by the Owner themselves. Other admins cannot modify this account.'
      );
      return;
    }

    setSaving(true);
    try {
      const feeNum = parseFloat(yearlyFeeInput);
      if (isNaN(feeNum) || feeNum < 0) {
        Alert.alert('Error', 'Please enter a valid yearly fee rate.');
        setSaving(false);
        return;
      }

      if (!editName.trim() || !editPhone.trim() || !editEmail.trim()) {
        Alert.alert('Error', 'Name, Phone, and Email are required.');
        setSaving(false);
        return;
      }

      let updates: Partial<UserProfile> = {};
      if (user?.role === 'Super Admin') {
        updates = {
          name: editName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim().toLowerCase(),
          drivingLicense: editDrivingLicense.trim(),
          registrationNumber: editRegistrationNumber.trim(),
          role: selectedRole,
          status: selectedStatus,
          yearlyFee: feeNum,
          area: selectedArea || undefined,
          assignedArea: selectedRole === 'Admin' ? (selectedAssignedAreas[0] || undefined) : undefined,
          assignedAreas: selectedRole === 'Admin' ? selectedAssignedAreas : undefined,
          permissions: selectedRole === 'Admin' ? permissions : undefined,
        };
      } else if (user?.role === 'Admin') {
        updates = {
          name: editName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim().toLowerCase(),
          drivingLicense: editDrivingLicense.trim(),
          registrationNumber: editRegistrationNumber.trim(),
          yearlyFee: feeNum,
          area: selectedArea || undefined,
        };
      }

      await dbService.adminUpdateUser(member.uid, updates, user?.uid);
      
      Alert.alert('Success', 'Member profile updated successfully.', [
        {
          text: 'OK',
          onPress: () => loadMember()
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update member credentials.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMonthlyFeeOnly = async () => {
    if (!member) return;
    setSaving(true);
    try {
      const feeNum = parseFloat(yearlyFeeInput);
      if (isNaN(feeNum) || feeNum < 0) {
        Alert.alert('Error', 'Please enter a valid yearly fee rate.');
        setSaving(false);
        return;
      }
      await dbService.adminUpdateUser(member.uid, { yearlyFee: feeNum }, user?.uid);
      Alert.alert('Success', 'Yearly fee rate updated successfully.', [
        { text: 'OK', onPress: () => loadMember() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update monthly fee rate.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPayment = () => {
    setPaymentAmount('');
    setPaymentDate(getTodayStr());
    setPaymentNote('');
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!member || !user) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid positive payment amount.');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(paymentDate)) {
      Alert.alert('Error', 'Please enter a valid date in YYYY-MM-DD format.');
      return;
    }

    try {
      setRecordingPayment(true);
      await dbService.recordMemberPayment(member.uid, amount, paymentDate, paymentNote, user.uid);
      Alert.alert('Success', 'Payment recorded successfully.');
      setShowPaymentModal(false);
      loadMember(); // Reload profiles and balances
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save payment record.');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleDeleteMember = () => {
    if (!member) return;

    // Owner protection: owner account can never be deleted
    if (member.isOwner) {
      Alert.alert(
        'Protected Account',
        'The Owner account cannot be deleted from the system.'
      );
      return;
    }
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to permanently delete ${member.name}? This will delete their profile, payment records, and attendance logs. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await dbService.deleteUser(member.uid);
              Alert.alert('Success', 'Member account successfully deleted.', [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(admin)/members')
                }
              ]);
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to delete member account.');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleDayPress = async (dateStr: string) => {
    if (!member || !user) return;
    // Standard access check: Super Admin or Admin can toggle
    const isAuthorized = user.role === 'Super Admin' || user.role === 'Admin';
    if (!isAuthorized) return;

    try {
      const isPresent = await dbService.toggleMemberAttendance(member.uid, dateStr, user.uid);
      if (isPresent) {
        setAttendanceRecords(prev => [...prev, dateStr]);
      } else {
        setAttendanceRecords(prev => prev.filter(d => d !== dateStr));
      }
    } catch (error) {
      console.error('Failed to toggle day attendance', error);
      Alert.alert('Error', 'Failed to toggle attendance.');
    }
  };

  // Calendar Math
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarCells: { day: number | null; dateString: string | null }[] = [];

  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ day: null, dateString: null });
  }
  for (let d = 1; d <= totalDays; d++) {
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ day: d, dateString });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  if (!member) return null;

  // Calculate balances
  const totalDues = calculateTotalDues(member.joinedAt, member.yearlyFee);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const dueAmount = totalDues - totalPaid;

  const canRecordPayment = user?.role === 'Super Admin' || (user?.role === 'Admin' && (hasPermission('logPayment') || hasPermission('generateDues')));
  const canViewPayments = user?.role === 'Super Admin' || (user?.role === 'Admin' && (hasPermission('viewPayment') || hasPermission('viewDues')));
  const canToggleAttendance = user?.role === 'Super Admin' || (user?.role === 'Admin' && hasPermission('takeAttendance'));

  return (
    <View style={styles.container}>
      <CustomHeader title="Member Profile" showBack fallbackRoute="/(admin)/members" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <Card style={styles.profileHeaderCard} elevation="sm">
          <View style={styles.headerRow}>
            <Ionicons name="person-circle-outline" size={72} color={Colors.light.textLight} />
            <View style={styles.headerInfo}>
              <Text style={styles.name}>{member.name}</Text>
              {member.area && <Text style={styles.areaLabel}>{member.area}</Text>}
              <Text style={styles.email}>{member.email}</Text>
              <Text style={styles.phone}>{member.phone}</Text>
              <View style={styles.badges}>
                <RoleBadge roleOrStatus={member.role as any} style={styles.badge} />
                <RoleBadge roleOrStatus={member.status as any} style={styles.badge} />
              </View>
            </View>
          </View>
        </Card>

        {/* Stats Grid & Record Payment */}
        {(canViewPayments || canRecordPayment) && (
          <Card style={styles.statsCard} elevation="sm">
            {canViewPayments && (
              <>
                <Text style={styles.detailsHeading}>Dues Summary</Text>
                <View style={styles.divider} />
                
                <View style={styles.statsRow}>
                  <View style={styles.statColumn}>
                    <Text style={styles.statLabel}>Paid</Text>
                    <Text style={[styles.statValue, styles.paidValue]}>৳{totalPaid}</Text>
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
              </>
            )}

            {canRecordPayment && (
              <Button
                title="Record Payment"
                variant="primary"
                onPress={handleOpenPayment}
                style={styles.recordPaymentBtn}
                leftIcon="cash-outline"
              />
            )}
          </Card>
        )}

        {/* Attendance Calendar Widget */}
        {canToggleAttendance && (
          <Card style={styles.calendarCard} elevation="sm">
            <Text style={styles.detailsHeading}>Attendance Calendar</Text>
            <View style={styles.divider} />
            {canToggleAttendance && (
              <Text style={styles.calendarInstruction}>
                Tap on any date cell below to toggle presence (teal highlights present).
              </Text>
            )}

            {/* Month Navigator */}
            <View style={styles.monthNavigator}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrow}>
                <Ionicons name="chevron-back" size={20} color={Colors.light.primary} />
              </TouchableOpacity>
              <Text style={styles.monthText}>
                {monthNames[currentMonth]} {currentYear}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.navArrow}>
                <Ionicons name="chevron-forward" size={20} color={Colors.light.primary} />
              </TouchableOpacity>
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {/* Days header */}
              <View style={styles.gridRow}>
                {dayNames.map(day => (
                  <View key={day} style={styles.gridHeaderCell}>
                    <Text style={styles.gridHeaderText}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Days content */}
              <View style={styles.gridDays}>
                {calendarCells.map((cell, idx) => {
                  const isDay = cell.day !== null;
                  const isHighlighted = cell.dateString && attendanceRecords.includes(cell.dateString);
                  
                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={canToggleAttendance ? 0.7 : 1}
                      disabled={!isDay || !canToggleAttendance}
                      onPress={() => cell.dateString && handleDayPress(cell.dateString)}
                      style={[
                        styles.gridDayCell,
                        isHighlighted && styles.presentCell
                      ]}
                    >
                      {isDay ? (
                        <Text style={[
                          styles.gridDayText,
                          isHighlighted && styles.presentDayText
                        ]}>
                          {cell.day}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Card>
        )}

        {/* Member Details */}
        <Card style={styles.detailsCard} elevation="sm">
          <Text style={styles.detailsHeading}>Account & Registration Details</Text>
          <View style={styles.divider} />
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Driving License:</Text>
            <Text style={styles.detailVal}>{member.drivingLicense || 'N/A'}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Registration Number:</Text>
            <Text style={styles.detailVal}>{member.registrationNumber || 'N/A'}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Yearly Dues Rate:</Text>
            <Text style={styles.detailVal}>৳{member.yearlyFee ?? 1200}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Yearly Due ({new Date().getFullYear()}):</Text>
            <Text style={styles.detailVal}>৳{Math.max(0, calculateCumulativeDues(member.joinedAt, member.yearlyFee, new Date().getFullYear()) - payments.reduce((sum, p) => sum + p.amount, 0))}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Joined Date:</Text>
            <Text style={styles.detailVal}>{new Date(member.joinedAt).toLocaleDateString()}</Text>
          </View>
        </Card>

        {/* Payment Records History */}
        {canViewPayments && (
          <Card style={styles.paymentsHistoryCard} elevation="sm">
            <Text style={styles.detailsHeading}>Payment Logs</Text>
            <View style={styles.divider} />
            
            {payments.length === 0 ? (
              <Text style={styles.emptyHistoryText}>No payments recorded yet.</Text>
            ) : (
              payments.map((p, idx) => (
                <View key={p.id || idx} style={styles.paymentLogItem}>
                  <View style={styles.paymentLogHeader}>
                    <Text style={styles.paymentLogAmount}>+৳{p.amount}</Text>
                    <Text style={styles.paymentLogDate}>{p.dateStr}</Text>
                  </View>
                  {p.note ? <Text style={styles.paymentLogNote}>{p.note}</Text> : null}
                </View>
              ))
            )}
          </Card>
        )}

        {/* If target member is the Owner, show warning banner */}
        {member.isOwner && (
          <Card style={[styles.managementCard, { borderColor: Colors.light.error, borderWidth: 1 }]} elevation="sm">
            <Text style={[styles.detailsHeading, { color: Colors.light.error }]}>Owner Account Protection</Text>
            <View style={styles.divider} />
            <Text style={{ color: Colors.light.textSecondary, fontWeight: '600', lineHeight: 20 }}>
              {user?.isOwner
                ? 'This account is the system Owner. Other admins cannot modify or delete this account, but you can edit your own details below.'
                : 'This account is the system Owner. Its profile details, role, permissions, status, and credentials cannot be modified or deleted by other admins.'}
            </Text>
          </Card>
        )}

        {/* Permissions & Roles Manager */}
        {((!member.isOwner && (user?.role === 'Super Admin' || (user?.role === 'Admin' && hasPermission('editUser') && member.role !== 'Super Admin' && (!member.area || member.area === user.assignedArea || (user.assignedAreas && user.assignedAreas.includes(member.area)))))) || (member.isOwner && user?.isOwner)) && (
          <Card style={styles.managementCard} elevation="sm">
            <Text style={styles.detailsHeading}>Edit Profile & Settings</Text>
            <View style={styles.divider} />

            {/* Basic Profile Info Editor Inputs */}
            <Text style={styles.subHeading}>Basic Registration Info</Text>
            <Input
              label="Full Name *"
              placeholder="Enter name"
              value={editName}
              onChangeText={setEditName}
              leftIcon="person-outline"
            />
            <Input
              label="Phone Number *"
              placeholder="Enter phone"
              value={editPhone}
              onChangeText={setEditPhone}
              leftIcon="phone-portrait-outline"
              keyboardType="phone-pad"
            />
            <Input
              label="Email Address *"
              placeholder="Enter email"
              value={editEmail}
              onChangeText={setEditEmail}
              leftIcon="mail-outline"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Input
              label="Driving License Number"
              placeholder="e.g. DL-XXXXXXXX"
              value={editDrivingLicense}
              onChangeText={setEditDrivingLicense}
              leftIcon="card-outline"
            />
            <Input
              label="Registration Number"
              placeholder="e.g. Dhaka Metro-Ga-XX-XXXX"
              value={editRegistrationNumber}
              onChangeText={setEditRegistrationNumber}
              leftIcon="car-outline"
            />

            <Input
              label="Assigned Yearly Fee Rate (৳)"
              placeholder="e.g. 1200"
              value={yearlyFeeInput}
              onChangeText={setYearlyFeeInput}
              leftIcon="cash-outline"
              keyboardType="number-pad"
            />

            {/* Resident Area Dropdown */}
            <View style={styles.selectorContainer}>
              <Text style={styles.subHeading}>Resident Area</Text>
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => {
                  setShowAreaDropdown(!showAreaDropdown);
                  setShowRoleDropdown(false);
                  setShowStatusDropdown(false);
                }}
                style={styles.selectorBox}
              >
                <Text style={styles.selectorText}>
                  {selectedArea || 'Select Resident Area'}
                </Text>
                <Ionicons name={showAreaDropdown ? "chevron-up" : "chevron-down"} size={20} color={Colors.light.textSecondary} />
              </TouchableOpacity>

              {showAreaDropdown && (
                <View style={styles.dropdown}>
                  {areas.map((area, idx) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedArea(area.name);
                        setShowAreaDropdown(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        selectedArea === area.name && styles.dropdownItemActive
                      ]}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        selectedArea === area.name && styles.dropdownItemTextActive
                      ]}>{area.name}</Text>
                      {selectedArea === area.name && <Ionicons name="checkmark" size={18} color={Colors.light.accent} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Role & Status (Super Admin Only, Non-Owner) */}
            {user?.role === 'Super Admin' && !member.isOwner && (
              <>
                {/* Role Dropdown Selector */}
                <View style={styles.selectorContainer}>
                  <Text style={styles.selectorLabel}>Access Level / System Role</Text>
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => {
                      setShowRoleDropdown(!showRoleDropdown);
                      setShowStatusDropdown(false);
                      setShowAreaDropdown(false);
                    }}
                    style={styles.selectorBox}
                  >
                    <Text style={styles.selectorText}>{selectedRole}</Text>
                    <Ionicons name={showRoleDropdown ? "chevron-up" : "chevron-down"} size={20} color={Colors.light.textSecondary} />
                  </TouchableOpacity>

                  {showRoleDropdown && (
                    <View style={styles.dropdown}>
                      {roles.map((role, idx) => (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.7}
                          onPress={() => {
                            setSelectedRole(role);
                            setShowRoleDropdown(false);
                          }}
                          style={[
                            styles.dropdownItem,
                            selectedRole === role && styles.dropdownItemActive
                          ]}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            selectedRole === role && styles.dropdownItemTextActive
                          ]}>{role}</Text>
                          {selectedRole === role && <Ionicons name="checkmark" size={18} color={Colors.light.accent} />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Status Dropdown Selector */}
                <View style={styles.selectorContainer}>
                  <Text style={styles.selectorLabel}>Membership Verification Status</Text>
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => {
                      setShowStatusDropdown(!showStatusDropdown);
                      setShowRoleDropdown(false);
                      setShowAreaDropdown(false);
                    }}
                    style={styles.selectorBox}
                  >
                    <Text style={styles.selectorText}>{selectedStatus.toUpperCase()}</Text>
                    <Ionicons name={showStatusDropdown ? "chevron-up" : "chevron-down"} size={20} color={Colors.light.textSecondary} />
                  </TouchableOpacity>

                  {showStatusDropdown && (
                    <View style={styles.dropdown}>
                      {statuses.map((status, idx) => (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.7}
                          onPress={() => {
                            setSelectedStatus(status);
                            setShowStatusDropdown(false);
                          }}
                          style={[
                            styles.dropdownItem,
                            selectedStatus === status && styles.dropdownItemActive
                          ]}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            selectedStatus === status && styles.dropdownItemTextActive
                          ]}>{status.toUpperCase()}</Text>
                          {selectedStatus === status && <Ionicons name="checkmark" size={18} color={Colors.light.accent} />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Area Assignment & Permissions Section */}
                {selectedRole === 'Admin' && (
                  <View style={styles.adminSettingsContainer}>
                    <Text style={styles.subHeading}>Admin Assigned Areas (Select Multiple)</Text>
                    <View style={{ marginBottom: Spacing.sm }}>
                      {areas.map((area) => {
                        const isSelected = selectedAssignedAreas.includes(area.name);
                        return (
                          <TouchableOpacity
                            key={area.id}
                            activeOpacity={0.8}
                            onPress={() => {
                              setSelectedAssignedAreas(prev => 
                                prev.includes(area.name)
                                  ? prev.filter(a => a !== area.name)
                                  : [...prev, area.name]
                              );
                            }}
                            style={styles.checkboxRow}
                          >
                            <Ionicons
                              name={isSelected ? "checkbox" : "square-outline"}
                              size={22}
                              color={isSelected ? Colors.light.accent : Colors.light.textSecondary}
                            />
                            <Text style={styles.checkboxLabel}>{area.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={[styles.subHeading, { marginTop: Spacing.md }]}>Granular Permissions</Text>
                    
                    <TouchableOpacity 
                      style={styles.checkboxRow} 
                      onPress={() => setPermissions(p => ({ ...p, viewDues: !p.viewDues }))}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name={permissions.viewDues ? "checkbox" : "square-outline"} 
                        size={22} 
                        color={permissions.viewDues ? Colors.light.accent : Colors.light.textSecondary} 
                      />
                      <Text style={styles.checkboxLabel}>View Dues & Fees</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.checkboxRow} 
                      onPress={() => setPermissions(p => ({ ...p, generateDues: !p.generateDues }))}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name={permissions.generateDues ? "checkbox" : "square-outline"} 
                        size={22} 
                        color={permissions.generateDues ? Colors.light.accent : Colors.light.textSecondary} 
                      />
                      <Text style={styles.checkboxLabel}>Generate Monthly Dues</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.checkboxRow} 
                      onPress={() => setPermissions(p => ({ ...p, manageMeetings: !p.manageMeetings }))}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name={permissions.manageMeetings ? "checkbox" : "square-outline"} 
                        size={22} 
                        color={permissions.manageMeetings ? Colors.light.accent : Colors.light.textSecondary} 
                      />
                      <Text style={styles.checkboxLabel}>Create/Manage Meetings</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.checkboxRow} 
                      onPress={() => setPermissions(p => ({ ...p, manageEvents: !p.manageEvents }))}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name={permissions.manageEvents ? "checkbox" : "square-outline"} 
                        size={22} 
                        color={permissions.manageEvents ? Colors.light.accent : Colors.light.textSecondary} 
                      />
                      <Text style={styles.checkboxLabel}>Create/Manage Events</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.checkboxRow} 
                      onPress={() => setPermissions(p => ({ ...p, viewAttendance: !p.viewAttendance }))}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name={permissions.viewAttendance ? "checkbox" : "square-outline"} 
                        size={22} 
                        color={permissions.viewAttendance ? Colors.light.accent : Colors.light.textSecondary} 
                      />
                      <Text style={styles.checkboxLabel}>View Attendance Records</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.checkboxRow} 
                      onPress={() => setPermissions(p => ({ ...p, takeAttendance: !p.takeAttendance }))}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name={permissions.takeAttendance ? "checkbox" : "square-outline"} 
                        size={22} 
                        color={permissions.takeAttendance ? Colors.light.accent : Colors.light.textSecondary} 
                      />
                      <Text style={styles.checkboxLabel}>Take/Mark Attendance</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.checkboxRow} 
                      onPress={() => setPermissions(p => ({ ...p, logPayment: !p.logPayment }))}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name={permissions.logPayment ? "checkbox" : "square-outline"} 
                        size={22} 
                        color={permissions.logPayment ? Colors.light.accent : Colors.light.textSecondary} 
                      />
                      <Text style={styles.checkboxLabel}>Log/Entry Payment</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.checkboxRow} 
                      onPress={() => setPermissions(p => ({ ...p, viewPayment: !p.viewPayment }))}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name={permissions.viewPayment ? "checkbox" : "square-outline"} 
                        size={22} 
                        color={permissions.viewPayment ? Colors.light.accent : Colors.light.textSecondary} 
                      />
                      <Text style={styles.checkboxLabel}>View Payments & Logs</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.checkboxRow} 
                      onPress={() => setPermissions(p => ({ ...p, editYearlyFee: !p.editYearlyFee }))}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name={permissions.editYearlyFee ? "checkbox" : "square-outline"} 
                        size={22} 
                        color={permissions.editYearlyFee ? Colors.light.accent : Colors.light.textSecondary} 
                      />
                      <Text style={styles.checkboxLabel}>Edit Member Yearly Fee Rate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.checkboxRow} 
                      onPress={() => setPermissions(p => ({ ...p, editUser: !p.editUser }))}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name={permissions.editUser ? "checkbox" : "square-outline"} 
                        size={22} 
                        color={permissions.editUser ? Colors.light.accent : Colors.light.textSecondary} 
                      />
                      <Text style={styles.checkboxLabel}>Edit Member Profiles</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            <Button 
              title="Save Member Configuration" 
              variant="primary"
              onPress={handleUpdateMember}
              loading={saving}
              style={styles.saveBtn}
            />

            {/* Danger Zone only for Super Admins on non-owner accounts */}
            {user?.role === 'Super Admin' && !member.isOwner && (
              <>
                <View style={styles.dangerZoneDivider} />
                <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
                <Button 
                  title="Delete Member Account" 
                  variant="danger"
                  onPress={handleDeleteMember}
                  loading={saving}
                  leftIcon="trash-outline"
                />
              </>
            )}
          </Card>
        )}

        {/* Admin Yearly Fee Control Card (for Admins with editYearlyFee permission who do not have editUser permission) */}
        {user?.role === 'Admin' && hasPermission('editYearlyFee') && !hasPermission('editUser') && (
          <Card style={styles.managementCard} elevation="sm">
            <Text style={styles.detailsHeading}>Update Yearly Fee Rate</Text>
            <View style={styles.divider} />
            <Input
              label="Assigned Yearly Fee Rate (৳)"
              placeholder="e.g. 1200"
              value={yearlyFeeInput}
              onChangeText={setYearlyFeeInput}
              leftIcon="cash-outline"
              keyboardType="number-pad"
            />
            <Button 
              title="Save Yearly Fee Rate" 
              variant="primary"
              onPress={handleUpdateMonthlyFeeOnly}
              loading={saving}
              style={styles.saveBtn}
            />
          </Card>
        )}
      </ScrollView>

      {/* Record Payment Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showPaymentModal}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <Text style={styles.modalTitle}>Record Payment</Text>
            <Text style={styles.modalSubtitle}>Enter payment details for {member.name}</Text>

            <Input
              label="Amount (৳) *"
              placeholder="e.g. 1000"
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
              placeholder="e.g. June monthly fee"
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
                title="Confirm"
                variant="primary"
                onPress={handleConfirmPayment}
                style={styles.modalBtn}
                loading={recordingPayment}
              />
            </View>
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
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  profileHeaderCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  name: {
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  areaLabel: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  email: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  phone: {
    ...Typography.bodyMedium,
    color: Colors.light.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
  },
  badge: {
    marginRight: Spacing.xs,
  },
  statsCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: 16,
  },
  statsRow: {
    flexDirection: 'row',
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
    ...Typography.bodyLarge,
    fontWeight: '800',
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
  recordPaymentBtn: {
    marginTop: Spacing.sm,
  },
  calendarCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: 16,
  },
  calendarInstruction: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  navArrow: {
    padding: Spacing.sm,
    backgroundColor: Colors.light.surfaceDarker,
    borderRadius: 8,
  },
  monthText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  calendarGrid: {
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  gridHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  gridHeaderText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.light.textLight,
  },
  gridDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridDayCell: {
    width: '14.28%', // 100 / 7
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 999,
  },
  gridDayText: {
    ...Typography.bodyMedium,
    color: Colors.light.text,
    fontWeight: '600',
  },
  presentCell: {
    backgroundColor: '#0D9488', // Teal
  },
  presentDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  detailsCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: 16,
  },
  detailsHeading: {
    ...Typography.h3,
    color: Colors.light.primary,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.surfaceDarker,
    marginVertical: Spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  detailLabel: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    marginRight: Spacing.md,
  },
  detailVal: {
    ...Typography.bodyLarge,
    color: Colors.light.primary,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  paymentsHistoryCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: 16,
  },
  emptyHistoryText: {
    ...Typography.bodyMedium,
    color: Colors.light.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: Spacing.sm,
  },
  paymentLogItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.surfaceDarker,
  },
  paymentLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLogAmount: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.light.success,
  },
  paymentLogDate: {
    ...Typography.bodySmall,
    color: Colors.light.textLight,
  },
  paymentLogNote: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  managementCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: 16,
  },
  selectorContainer: {
    marginBottom: Spacing.md,
  },
  selectorLabel: {
    ...Typography.label,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
    paddingLeft: 2,
  },
  selectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.surfaceDarker,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: Spacing.md,
  },
  selectorText: {
    ...Typography.bodyMedium,
    color: Colors.light.text,
    fontWeight: '600',
  },
  dropdown: {
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 12,
    marginTop: Spacing.xs,
    backgroundColor: Colors.light.surface,
    overflow: 'hidden',
    ...Shadows.md,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.surfaceDarker,
  },
  dropdownItemActive: {
    backgroundColor: Colors.light.accentLight,
  },
  dropdownItemText: {
    ...Typography.bodyMedium,
    color: Colors.light.text,
  },
  dropdownItemTextActive: {
    color: Colors.light.accent,
    fontWeight: '700',
  },
  saveBtn: {
    marginTop: Spacing.md,
  },
  dangerZoneDivider: {
    height: 1.5,
    backgroundColor: Colors.light.border,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  dangerZoneTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.light.error,
    marginBottom: Spacing.sm,
  },
  adminSettingsContainer: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: Spacing.md,
  },
  subHeading: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.light.primary,
    marginBottom: Spacing.xs,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm - 2,
    marginBottom: 2,
  },
  checkboxLabel: {
    ...Typography.bodyMedium,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
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
  modalInput: {
    marginBottom: Spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalBtn: {
    flex: 1,
  },
});
