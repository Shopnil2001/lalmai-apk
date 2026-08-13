import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { Colors, Spacing, Typography } from '../../../constants/theme';
import { useAuth } from '../../../context/AuthContext';
import { dbService } from '../../../services/dbService';
import { Area, UserProfile } from '../../../services/mockData';
import { getFirebaseErrorMessage } from '../../../utils/firebaseErrors';

export default function CreateMember() {
  const router = useRouter();
  const { user } = useAuth();

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password'); // Default password for simplicity, changeable
  const [phone, setPhone] = useState('');
  const [license, setLicense] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [carType, setCarType] = useState<UserProfile['carType']>('none');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<'Super Admin' | 'Admin' | 'General Member'>('General Member');
  const [status, setStatus] = useState<'pending' | 'active' | 'suspended'>('active');
  const [yearlyFee, setYearlyFee] = useState('1200');
  const [paidAmount, setPaidAmount] = useState('0');

  // Areas list
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCarDropdown, setShowCarDropdown] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAreas() {
      try {
        setLoadingAreas(true);
        const fetched = await dbService.getAreas();
        setAreas(fetched);
        if (fetched.length > 0) {
          setSelectedArea(fetched[0].name);
        }
      } catch (err) {
        console.error('Failed to load areas in creation form', err);
      } finally {
        setLoadingAreas(false);
      }
    }
    loadAreas();
  }, []);

  const handleCreate = async () => {
    if (!name || !phone) {
      setError('Please fill in Name and Phone number.');
      return;
    }

    const feeNum = parseFloat(yearlyFee);
    if (isNaN(feeNum) || feeNum <= 0) {
      setError('Please enter a valid yearly fee rate.');
      return;
    }

    const paidNum = parseFloat(paidAmount || '0');
    if (isNaN(paidNum) || paidNum < 0) {
      setError('Please enter a valid initial paid amount.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const createdUser = await dbService.createUserByAdmin({
        name,
        email: email || undefined,
        phone,
        drivingLicense: license || undefined,
        registrationNumber: vehicle || undefined,
        area: selectedArea || undefined,
        role,
        status,
        yearlyFee: feeNum,
        photoUrl: null,
        carType,
        address: address || undefined,
      });

      if (paidNum > 0 && createdUser && createdUser.uid) {
        const todayStr = new Date().toISOString().split('T')[0];
        await dbService.recordMemberPayment(
          createdUser.uid,
          paidNum,
          todayStr,
          'Initial payment at registration',
          user?.uid || 'admin'
        );
      }

      router.back();
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Add Member" showBack fallbackRoute="/(admin)/members" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Card style={styles.formCard} elevation="sm">
            <Text style={styles.sectionTitle}>Account Details</Text>
            
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={Colors.light.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Input
              label="Full Name *"
              placeholder="Enter full name"
              value={name}
              onChangeText={setName}
              leftIcon="person-outline"
            />

            <Input
              label="Email Address (Optional)"
              placeholder="e.g. member@lrc.com"
              value={email}
              onChangeText={setEmail}
              leftIcon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Phone Number *"
              placeholder="e.g. +88017xxxxxxxx"
              value={phone}
              onChangeText={setPhone}
              leftIcon="call-outline"
              keyboardType="phone-pad"
            />

            {/* Resident Area Dropdown */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Resident Area</Text>
              <TouchableOpacity
                activeOpacity={loadingAreas ? 1 : 0.8}
                onPress={() => {
                  if (loadingAreas || areas.length === 0) return;
                  setShowAreaDropdown(!showAreaDropdown);
                  setShowRoleDropdown(false);
                  setShowStatusDropdown(false);
                }}
                style={[styles.dropdownValueBox, loadingAreas && styles.dropdownDisabled]}
              >
                {loadingAreas ? (
                  <Text style={styles.dropdownPlaceholderText}>Loading areas...</Text>
                ) : (
                  <Text style={styles.dropdownValueText}>{selectedArea || 'Select Area'}</Text>
                )}
                {!loadingAreas && areas.length > 0 && (
                  <Ionicons name={showAreaDropdown ? "chevron-up" : "chevron-down"} size={20} color={Colors.light.textSecondary} />
                )}
              </TouchableOpacity>

              {showAreaDropdown && areas.length > 0 && (
                <View style={styles.dropdownList}>
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

            {/* Car Type Selector */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Car Type</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setShowCarDropdown(!showCarDropdown);
                  setShowAreaDropdown(false);
                  setShowRoleDropdown(false);
                  setShowStatusDropdown(false);
                }}
                style={styles.dropdownValueBox}
              >
                <Text style={styles.dropdownValueText}>
                  {carType === 'none' ? 'None (Not a Car Owner)' : carType}
                </Text>
                <Ionicons name={showCarDropdown ? "chevron-up" : "chevron-down"} size={20} color={Colors.light.textSecondary} />
              </TouchableOpacity>

              {showCarDropdown && (
                <View style={styles.dropdownList}>
                  {['none', 'NOAH', 'TRX', 'Private Car'].map((c, idx) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.7}
                      onPress={() => {
                        setCarType(c as any);
                        setShowCarDropdown(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        carType === c && styles.dropdownItemActive
                      ]}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        carType === c && styles.dropdownItemTextActive
                      ]}>
                        {c === 'none' ? 'None (Not a Car Owner)' : c}
                      </Text>
                      {carType === c && <Ionicons name="checkmark" size={18} color={Colors.light.accent} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Detailed Address */}
            <Input
              label="Detailed Address"
              placeholder="Enter detailed address"
              value={address}
              onChangeText={setAddress}
              leftIcon="location-outline"
            />

            {/* Role Dropdown */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Role *</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setShowRoleDropdown(!showRoleDropdown);
                  setShowAreaDropdown(false);
                  setShowStatusDropdown(false);
                }}
                style={styles.dropdownValueBox}
              >
                <Text style={styles.dropdownValueText}>{role}</Text>
                <Ionicons name={showRoleDropdown ? "chevron-up" : "chevron-down"} size={20} color={Colors.light.textSecondary} />
              </TouchableOpacity>

              {showRoleDropdown && (
                <View style={styles.dropdownList}>
                  {([ 'General Member', 'Admin', 'Super Admin' ] as const).map((r, idx) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.7}
                      onPress={() => {
                        setRole(r);
                        setShowRoleDropdown(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        role === r && styles.dropdownItemActive
                      ]}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        role === r && styles.dropdownItemTextActive
                      ]}>{r}</Text>
                      {role === r && <Ionicons name="checkmark" size={18} color={Colors.light.accent} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Status Dropdown */}
            <View style={styles.dropdownContainer}>
              <Text style={styles.dropdownLabel}>Status *</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setShowStatusDropdown(!showStatusDropdown);
                  setShowAreaDropdown(false);
                  setShowRoleDropdown(false);
                }}
                style={styles.dropdownValueBox}
              >
                <Text style={styles.dropdownValueText}>{status}</Text>
                <Ionicons name={showStatusDropdown ? "chevron-up" : "chevron-down"} size={20} color={Colors.light.textSecondary} />
              </TouchableOpacity>

              {showStatusDropdown && (
                <View style={styles.dropdownList}>
                  {([ 'active', 'pending', 'suspended' ] as const).map((s, idx) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.7}
                      onPress={() => {
                        setStatus(s);
                        setShowStatusDropdown(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        status === s && styles.dropdownItemActive
                      ]}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        status === s && styles.dropdownItemTextActive
                      ]}>{s === 'active' ? 'Active' : s === 'pending' ? 'Pending Approval' : 'Suspended'}</Text>
                      {status === s && <Ionicons name="checkmark" size={18} color={Colors.light.accent} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <Input
              label="Yearly Fee (৳) *"
              placeholder="e.g. 1200"
              value={yearlyFee}
              onChangeText={setYearlyFee}
              leftIcon="cash-outline"
              keyboardType="number-pad"
            />

            <Input
              label="Initial Amount Paid (৳)"
              placeholder="e.g. 0"
              value={paidAmount}
              onChangeText={setPaidAmount}
              leftIcon="wallet-outline"
              keyboardType="number-pad"
            />

            <View style={styles.driverSection}>
              <Text style={styles.sectionTitle}>Driver / Registration Details (Optional)</Text>
              <Input
                label="Driving License Number"
                placeholder="e.g. DL-XXXXXXXX"
                value={license}
                onChangeText={setLicense}
                leftIcon="card-outline"
              />
              <Input
                label="Registration Number"
                placeholder="e.g. Dhaka Metro-Ga-XX-XXXX"
                value={vehicle}
                onChangeText={setVehicle}
                leftIcon="car-outline"
              />
            </View>

            <Button
              title="Create Member"
              variant="primary"
              onPress={handleCreate}
              loading={loading}
              style={styles.submitBtn}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
  },
  formCard: {
    padding: Spacing.xl,
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.light.primary,
    fontWeight: '700',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.errorLight,
    borderWidth: 1,
    borderColor: Colors.light.error,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    ...Typography.bodyMedium,
    color: Colors.light.error,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  dropdownContainer: {
    marginBottom: Spacing.md,
  },
  dropdownLabel: {
    ...Typography.label,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
    paddingLeft: 2,
  },
  dropdownValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.surface,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: Spacing.md,
  },
  dropdownValueText: {
    ...Typography.bodyMedium,
    color: Colors.light.text,
  },
  dropdownList: {
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 12,
    marginTop: Spacing.xs,
    backgroundColor: Colors.light.surface,
    overflow: 'hidden',
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
    fontWeight: '600',
  },
  dropdownDisabled: {
    backgroundColor: Colors.light.surfaceDarker,
    opacity: 0.7,
  },
  dropdownPlaceholderText: {
    ...Typography.bodyMedium,
    color: Colors.light.textLight,
  },
  driverSection: {
    marginTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: Spacing.lg,
  },
  submitBtn: {
    marginTop: Spacing.lg,
  },
});
