import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import Input from '../../components/Input';
import RoleBadge from '../../components/RoleBadge';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { useTabBarVisibility } from '../../context/TabBarVisibilityContext';
import { cloudinaryService } from '../../services/cloudinary';
import { dbService } from '../../services/dbService';
import { HomepageSettings } from '../../services/mockData';
import { Spacing } from '../../constants/theme';
import Card from '../../components/Card';

// ─────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────
const D = {
  navy: '#0F172A',
  navyMid: '#1E293B',
  indigoDark: '#312E81',
  indigo: '#4F46E5',
  indigoSoft: '#818CF8',
  indigoLight: '#EEF2FF',
  indigoPale: '#C7D2FE',
  green: '#34D399',
  greenDark: '#065F46',
  greenLight: '#D1FAE5',
  amber: '#F59E0B',
  red: '#EF4444',
  redDark: '#991B1B',
  redLight: '#FEE2E2',
  white: '#FFFFFF',
  surface: '#F1F5F9',
  card: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textOnDark: 'rgba(255,255,255,0.5)',
};

export default function UserProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const { handleScroll } = useTabBarVisibility();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [license, setLicense] = useState(user?.drivingLicense || '');
  const [vehicle, setVehicle] = useState(user?.registrationNumber || '');
  const [area, setArea] = useState(user?.area || '');
  
  const [areas, setAreas] = useState<any[]>([]);
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);

  useEffect(() => {
    async function loadAreas() {
      try {
        const fetched = await dbService.getAreas();
        setAreas(fetched);
      } catch (err) {
        console.error('Failed to load areas in profile:', err);
      }
    }
    loadAreas();
  }, []);

  const [imageUploading, setImageUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null | undefined>(undefined);

  // Change Password state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState<string | null>(null);

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={D.indigo} />
      </View>
    );
  }

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload profile photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setPendingPhotoUri(result.assets[0].uri);
    }
  };

  const handlePickAndUploadPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload profile photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const uri = result.assets[0].uri;
      setPendingPhotoUri(uri);
      setImageUploading(true);
      try {
        const photoUrl = await cloudinaryService.uploadImage(uri);
        await updateProfile({ photoUrl });
        Alert.alert('Success', 'Profile photo updated successfully.');
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Failed to upload profile photo.');
      } finally {
        setImageUploading(false);
        setPendingPhotoUri(undefined);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!name || !phone) {
      Alert.alert('Error', 'Name and Phone are required.');
      return;
    }
    setSaving(true);
    try {
      let photoUrl = user.photoUrl;
      if (pendingPhotoUri === null) {
        photoUrl = null;
      } else if (pendingPhotoUri) {
        setImageUploading(true);
        photoUrl = await cloudinaryService.uploadImage(pendingPhotoUri);
        setImageUploading(false);
      }
      await updateProfile({ name, phone, drivingLicense: license, registrationNumber: vehicle, area, photoUrl });
      setIsEditing(false);
      setPendingPhotoUri(undefined);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
      setImageUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setChangeError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError('Passwords do not match.');
      return;
    }
    setChangeLoading(true);
    setChangeError(null);
    try {
      await authService.changePassword(newPassword);
      setChangeSuccess('Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setChangeError('For security, this action requires a recent login. Please sign out and sign back in, then try again.');
      } else {
        setChangeError(err.message || 'Failed to update password.');
      }
    } finally {
      setChangeLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out from Lalmai Upozila Rent A Car?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const displayPhotoUri =
    pendingPhotoUri === null ? undefined : pendingPhotoUri || user.photoUrl || undefined;
  const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';

  return (
    <View style={styles.container}>
      {/* ── Dark Profile Header ── */}
      <View style={[styles.profileHeader, { paddingTop: insets.top + 12 }]}>
        {/* Edit button */}
        {!isEditing && (user.role !== 'General Member' || user.isOwner === true) && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsEditing(true)}
            style={styles.editBtn}
          >
            <Ionicons name="pencil" size={13} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}

        {/* Avatar */}
        <TouchableOpacity 
          activeOpacity={0.85} 
          onPress={(user.role === 'General Member' && !user.isOwner) ? handlePickAndUploadPhoto : (isEditing ? handlePickImage : undefined)}
        >
          <View style={styles.avatarRing}>
            {displayPhotoUri ? (
              <Image source={{ uri: displayPhotoUri }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <View style={styles.avatarInitialCircle}>
                <Text style={styles.avatarInitialText}>{initial}</Text>
              </View>
            )}
            {(isEditing || (user.role === 'General Member' && !user.isOwner)) && (
              <View style={styles.cameraOverlay}>
                <Ionicons name="camera" size={11} color={D.white} />
              </View>
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.profileName}>{user.name}</Text>

        {/* Role pill */}
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{user.role.toUpperCase()}</Text>
        </View>

        {/* Active status */}
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Active Member</Text>
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Membership Card ── */}
        <Text style={styles.sectionLabel}>Membership Card</Text>
        <View style={styles.membershipCard}>
          {/* decorative orb */}
          <View style={styles.cardOrb} />

          <View style={styles.cardHeader}>
            <View style={styles.cardLogoRow}>
              <Ionicons name="car-sport" size={16} color="#A5B4FC" />
              <Text style={styles.cardLogoText}>LRC MEMBER</Text>
            </View>
            <Ionicons name="qr-code-outline" size={18} color="rgba(255,255,255,0.25)" />
          </View>

          <View style={styles.cardBody}>
            {displayPhotoUri ? (
              <Image source={{ uri: displayPhotoUri }} style={styles.cardAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.cardAvatar, styles.cardAvatarInitial]}>
                <Text style={styles.cardAvatarInitialText}>{initial}</Text>
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{user.name}</Text>
              <Text style={styles.cardRole}>{user.role.toUpperCase()}</Text>
              <View style={styles.cardDetailRow}>
                <Text style={styles.cardDetailLabel}>ID </Text>
                <Text style={styles.cardDetailVal}>{user.uid.slice(0, 8).toUpperCase()}</Text>
              </View>
              {user.drivingLicense && (
                <View style={styles.cardDetailRow}>
                  <Text style={styles.cardDetailLabel}>LIC </Text>
                  <Text style={styles.cardDetailVal}>{user.drivingLicense}</Text>
                </View>
              )}
              {user.registrationNumber && (
                <View style={styles.cardDetailRow}>
                  <Text style={styles.cardDetailLabel}>REG </Text>
                  <Text style={styles.cardDetailVal} numberOfLines={1}>{user.registrationNumber}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.cardDate}>
              JOINED {new Date(user.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
            </Text>
            <Text style={styles.verifiedTag}>● VERIFIED</Text>
          </View>
        </View>

        {/* ── Account Info / Edit ── */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Text style={styles.infoCardTitle}>
              {isEditing ? 'Edit Profile' : 'Account Information'}
            </Text>
            {!isEditing && (user.role !== 'General Member' || user.isOwner === true) && (
              <TouchableOpacity activeOpacity={0.7} onPress={() => setIsEditing(true)}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <View>
              {/* Photo selector */}
              {displayPhotoUri ? (
                <View style={styles.photoPreviewRow}>
                  <Image source={{ uri: displayPhotoUri }} style={styles.photoPreview} contentFit="cover" />
                  <View style={styles.photoPreviewActions}>
                    <TouchableOpacity activeOpacity={0.7} onPress={handlePickImage} style={styles.photoActionBtn}>
                      <Ionicons name="refresh" size={14} color={D.indigo} />
                      <Text style={styles.photoActionText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setPendingPhotoUri(null)}
                      style={[styles.photoActionBtn, styles.photoActionDanger]}
                    >
                      <Ionicons name="trash-outline" size={14} color={D.red} />
                      <Text style={[styles.photoActionText, { color: D.red }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity activeOpacity={0.8} onPress={handlePickImage} style={styles.photoUploadBtn}>
                  <Ionicons name="camera" size={18} color={D.indigo} />
                  <Text style={styles.photoUploadText}>Select Profile Photo</Text>
                </TouchableOpacity>
              )}

              {imageUploading && (
                <View style={styles.photoUploadBtn}>
                  <ActivityIndicator size="small" color={D.indigo} />
                  <Text style={[styles.photoUploadText, { marginLeft: 8 }]}>Uploading…</Text>
                </View>
              )}

              <Input label="Full Name" placeholder="Name" value={name} onChangeText={setName} />
              <Input label="Phone Number" placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Input label="Driving License" placeholder="License number" value={license} onChangeText={setLicense} />
              <Input label="Registration Number" placeholder="e.g. Dhaka Metro-Ga-11-22" value={vehicle} onChangeText={setVehicle} />

              {/* Area Selector */}
              <View style={{ marginBottom: Spacing.sm }}>
                <Text style={styles.selectorLabel}>Area / Address</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowAreaDropdown(!showAreaDropdown)}
                  style={styles.selectorValueBox}
                >
                  <Text style={styles.selectorValueText}>{area || 'Select Area'}</Text>
                  <Ionicons name={showAreaDropdown ? "chevron-up" : "chevron-down"} size={20} color={D.textSecondary} />
                </TouchableOpacity>

                {showAreaDropdown && areas.length > 0 && (
                  <View style={styles.selectorDropdown}>
                    {areas.map((a, idx) => (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.7}
                        onPress={() => {
                          setArea(a.name);
                          setShowAreaDropdown(false);
                        }}
                        style={[
                          styles.selectorDropdownItem,
                          area === a.name && styles.selectorDropdownItemActive
                        ]}
                      >
                        <Text style={[
                          styles.selectorDropdownText,
                          area === a.name && styles.selectorDropdownTextActive
                        ]}>{a.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.editActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    setIsEditing(false);
                    setPendingPhotoUri(undefined);
                    setName(user.name);
                    setPhone(user.phone);
                    setLicense(user.drivingLicense || '');
                    setVehicle(user.registrationNumber || '');
                    setArea(user.area || '');
                    setShowAreaDropdown(false);
                  }}
                  style={styles.editBtnHalf}
                />
                <Button
                  title="Save"
                  variant="primary"
                  size="sm"
                  onPress={handleSaveProfile}
                  loading={saving}
                  style={styles.editBtnHalf}
                />
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <Text style={styles.fieldVal}>{user.name}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <Text style={styles.fieldVal}>{user.email}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <Text style={styles.fieldVal}>{user.phone}</Text>
              </View>
              <View style={[styles.field, { borderBottomWidth: 0 }]}>
                <Text style={styles.fieldLabel}>Role</Text>
                <RoleBadge roleOrStatus={user.role as any} style={{ marginTop: 4 }} />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Driving License</Text>
                <Text style={styles.fieldVal}>{user.drivingLicense || 'Not added'}</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Registration Number</Text>
                <Text style={styles.fieldVal}>{user.registrationNumber || 'Not added'}</Text>
              </View>
              <View style={[styles.field, { borderBottomWidth: 0 }]}>
                <Text style={styles.fieldLabel}>Area / Address</Text>
                <Text style={styles.fieldVal}>{user.area || 'Not added'}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Attendance Calendar Shortcut */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/attendance/calendar' as any)}
          style={styles.calendarShortcutBtn}
        >
          <Ionicons name="calendar-clear-outline" size={16} color={D.indigo} />
          <Text style={styles.calendarShortcutBtnText}>My Attendance Calendar</Text>
          <Ionicons name="chevron-forward" size={14} color={D.textMuted} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

         {/* Change Password (only for email/mock accounts) */}
        {(!user.authProvider || user.authProvider === 'email' || user.uid === 'google_mock_user') && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setChangeError(null);
              setChangeSuccess(null);
              setNewPassword('');
              setConfirmPassword('');
              setShowChangePasswordModal(true);
            }}
            style={styles.calendarShortcutBtn}
          >
            <Ionicons name="key-outline" size={16} color={D.indigo} />
            <Text style={styles.calendarShortcutBtnText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={14} color={D.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        {/* Admin Console (Admin / Super Admin Only) */}
        {(user.role === 'Admin' || user.role === 'Super Admin') && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(admin)/dashboard')}
            style={styles.calendarShortcutBtn}
          >
            <Ionicons name="settings-outline" size={16} color={D.indigo} />
            <Text style={styles.calendarShortcutBtnText}>Admin Console Dashboard</Text>
            <Ionicons name="chevron-forward" size={14} color={D.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        {/* Manage Landing Page (Super Admin Only) */}
        {user.role === 'Super Admin' && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(admin)/landing-settings')}
            style={styles.calendarShortcutBtn}
          >
            <Ionicons name="desktop-outline" size={16} color={D.indigo} />
            <Text style={styles.calendarShortcutBtnText}>Manage Landing Page</Text>
            <Ionicons name="chevron-forward" size={14} color={D.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        {/* Logout */}
        <TouchableOpacity activeOpacity={0.8} onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={16} color={D.redDark} />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showChangePasswordModal}
        onRequestClose={() => setShowChangePasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.modalSubtitle}>Update your account login password</Text>

            {/* Error & Success banners inside modal */}
            {changeError && (
              <View style={styles.modalErrorContainer}>
                <Ionicons name="alert-circle" size={16} color={D.red} />
                <Text style={styles.modalErrorText}>{changeError}</Text>
              </View>
            )}

            {changeSuccess && (
              <View style={styles.modalSuccessContainer}>
                <Ionicons name="checkmark-circle" size={16} color={D.green} />
                <Text style={styles.modalSuccessText}>{changeSuccess}</Text>
              </View>
            )}

            {!changeSuccess && (
              <View style={styles.modalForm}>
                <Input
                  label="New Password"
                  placeholder="Enter new password (min 6 chars)"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  leftIcon="lock-closed-outline"
                  secureTextEntry
                />
                <Input
                  label="Confirm New Password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  leftIcon="lock-closed-outline"
                  secureTextEntry
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <Button
                title={changeSuccess ? "Close" : "Cancel"}
                variant="outline"
                onPress={() => setShowChangePasswordModal(false)}
                style={styles.modalBtn}
              />
              {!changeSuccess && (
                <Button
                  title="Update Password"
                  variant="primary"
                  onPress={handleChangePassword}
                  style={styles.modalBtn}
                  loading={changeLoading}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: D.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: D.surface,
  },

  // ── Profile header ──
  profileHeader: {
    backgroundColor: D.navy,
    alignItems: 'center',
    paddingBottom: 20,
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14 },
      android: { elevation: 12 },
    }),
  },
  editBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: D.indigo,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: D.indigo, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10 },
      android: { elevation: 8 },
    }),
  },
  avatarImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  avatarInitialCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: D.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    color: D.white,
    fontSize: 28,
    fontWeight: '700',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: D.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: D.white,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: D.white,
    marginTop: 10,
    letterSpacing: 0.2,
  },
  rolePill: {
    marginTop: 6,
    backgroundColor: 'rgba(79,70,229,0.25)',
    borderWidth: 0.5,
    borderColor: 'rgba(79,70,229,0.4)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  rolePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#A5B4FC',
    letterSpacing: 0.7,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: D.green,
  },
  statusText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },

  // ── Scroll content ──
  scrollContent: {
    padding: 14,
    paddingBottom: 100,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: D.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  // Membership card
  membershipCard: {
    backgroundColor: D.navy,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    padding: 14,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  cardOrb: {
    position: 'absolute',
    top: -24,
    right: -24,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(79,70,229,0.07)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    paddingBottom: 10,
    marginBottom: 12,
  },
  cardLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardLogoText: {
    fontSize: 10,
    fontWeight: '800',
    color: D.white,
    letterSpacing: 1,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: D.indigo,
    marginRight: 12,
    backgroundColor: D.navyMid,
  },
  cardAvatarInitial: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: D.indigo,
  },
  cardAvatarInitialText: {
    color: D.white,
    fontSize: 20,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '800',
    color: D.white,
  },
  cardRole: {
    fontSize: 9,
    fontWeight: '700',
    color: '#818CF8',
    letterSpacing: 0.6,
    marginTop: 2,
    marginBottom: 6,
  },
  cardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  cardDetailLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
  },
  cardDetailVal: {
    fontSize: 9,
    color: D.white,
    fontWeight: '700',
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingTop: 10,
    marginTop: 10,
  },
  cardDate: {
    fontSize: 9,
    color: '#64748B',
  },
  verifiedTag: {
    fontSize: 9,
    color: D.green,
    fontWeight: '800',
  },

  // Info card
  infoCard: {
    backgroundColor: D.card,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: D.border,
    padding: 14,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: D.borderLight,
    paddingBottom: 10,
    marginBottom: 12,
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: D.textPrimary,
  },
  editLink: {
    fontSize: 12,
    fontWeight: '700',
    color: D.indigo,
  },
  field: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: D.borderLight,
  },
  fieldLabel: {
    fontSize: 10,
    color: D.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  fieldVal: {
    fontSize: 13,
    fontWeight: '600',
    color: D.textPrimary,
  },

  // Photo editing
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.surface,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: D.border,
  },
  photoPreview: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: D.indigo,
  },
  photoPreviewActions: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 7,
    borderWidth: 0.5,
    borderColor: D.indigo,
    backgroundColor: D.indigoLight,
  },
  photoActionDanger: {
    borderColor: D.red,
    backgroundColor: D.redLight,
  },
  photoActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: D.indigo,
  },
  photoUploadBtn: {
    backgroundColor: D.indigoLight,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  photoUploadText: {
    fontSize: 12,
    fontWeight: '700',
    color: D.indigo,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  editBtnHalf: {
    flex: 1,
  },

  // Logout
  logoutBtn: {
    backgroundColor: D.redLight,
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 0.5,
    borderColor: '#FECACA',
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: D.redDark,
  },
  calendarShortcutBtn: {
    backgroundColor: D.card,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 0.5,
    borderColor: D.border,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  calendarShortcutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: D.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: D.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 0.5,
    borderColor: D.border,
  },
  modalTitle: {
    fontSize: 16,
    color: D.textPrimary,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    color: D.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  modalForm: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
  },
  modalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: D.redLight,
    borderWidth: 0.5,
    borderColor: D.red,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  modalErrorText: {
    fontSize: 12,
    color: D.redDark,
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
  },
  modalSuccessContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: D.greenLight,
    borderWidth: 0.5,
    borderColor: D.green,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  modalSuccessText: {
    fontSize: 12,
    color: D.greenDark,
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  selectorValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    marginBottom: Spacing.sm,
  },
  selectorValueText: {
    fontSize: 14,
    color: D.textPrimary,
    fontWeight: '600',
  },
  selectorDropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  selectorDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectorDropdownItemActive: {
    backgroundColor: '#EEF2FF',
  },
  selectorDropdownText: {
    fontSize: 14,
    color: D.textSecondary,
  },
  selectorDropdownTextActive: {
    color: D.indigo,
    fontWeight: '700',
  },
});