import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, Typography, Shadows } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { cloudinaryService } from '../../services/cloudinary';
import { CONFIG } from '../../services/config';
import { dbService } from '../../services/dbService';
import { Area } from '../../services/mockData';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { getFirebaseErrorMessage } from '../../utils/firebaseErrors';

export default function CompleteProfile() {
  const { user, updateProfile, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const isGoogleUser = user?.authProvider === 'google';
  const isPhoneUser = user?.authProvider === 'phone';

  // Pre-fill what Firebase already gave us
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [license, setLicense] = useState('');
  const [vehicle, setVehicle] = useState('');

  // Area selector state
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [showAreaDropdown, setShowAreaDropdown] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(true);

  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch areas on mount
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
        console.error('Failed to load areas in complete profile onboarding:', err);
      } finally {
        setLoadingAreas(false);
      }
    }
    loadAreas();
  }, []);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photos to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPendingPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (isPhoneUser && !email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (isGoogleUser && !phone.trim()) {
      setError('Phone number is required.');
      return;
    }
    if (isGoogleUser && !phone.trim().startsWith('+')) {
      setError('Please include the country code in your phone number (e.g. +8801700000000).');
      return;
    }
    if (areas.length > 0 && !selectedArea) {
      setError('Please select your Area.');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      let photoUrl = user?.photoUrl ?? null;

      // Upload new photo if selected
      if (pendingPhotoUri && CONFIG.cloudinary.cloudName !== 'your-cloud-name') {
        photoUrl = await cloudinaryService.uploadImage(pendingPhotoUri);
      }

      await updateProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        drivingLicense: license.trim(),
        registrationNumber: vehicle.trim(),
        photoUrl,
        area: selectedArea,
        profileComplete: true,
      });

      // The router guard in _layout.tsx will automatically redirect
      // to the pending screen once profileComplete becomes true.
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const avatarUri = pendingPhotoUri || user?.photoUrl;
  const avatarInitial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Dark Hero Header */}
      <View style={[styles.heroHeader, { paddingTop: insets.top + 12 }]}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroTitle}>Complete Your Profile</Text>
            <Text style={styles.heroSubtitle}>
              {isGoogleUser ? 'Signed in with Google' : 'Signed in with Phone'}
            </Text>
          </View>
          <View style={[
            styles.providerBadge,
            { backgroundColor: isGoogleUser ? 'rgba(234,67,53,0.15)' : 'rgba(79,70,229,0.15)' }
          ]}>
            <Ionicons
              name={isGoogleUser ? 'logo-google' : 'call'}
              size={16}
              color={isGoogleUser ? '#EA4335' : Colors.light.accent}
            />
          </View>
        </View>

        {/* Avatar picker */}
        <View style={styles.avatarSection}>
          <TouchableOpacity activeOpacity={0.85} onPress={handlePickPhoto} style={styles.avatarWrapper}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarInitial}>
                <Text style={styles.avatarInitialText}>{avatarInitial}</Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to add a photo</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.light.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Personal Info</Text>

          <Input
            label="Full Name *"
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
            leftIcon="person-outline"
            autoCapitalize="words"
          />

          {/* Phone users need to give their email */}
          {isPhoneUser && (
            <Input
              label="Email Address *"
              placeholder="e.g. yourname@gmail.com"
              value={email}
              onChangeText={setEmail}
              leftIcon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}

          {/* Google users need to give their phone number */}
          {isGoogleUser && (
            <Input
              label="Phone Number *"
              placeholder="e.g. +8801700000000"
              value={phone}
              onChangeText={setPhone}
              leftIcon="call-outline"
              keyboardType="phone-pad"
              helperText="Include country code (+880 for Bangladesh)"
            />
          )}

          {/* Area Selector */}
          <View style={styles.selectorContainer}>
            <Text style={styles.selectorLabel}>Select Area *</Text>
            <TouchableOpacity
              activeOpacity={loadingAreas ? 1 : 0.8}
              onPress={() => {
                if (loadingAreas || areas.length === 0) return;
                setShowAreaDropdown(!showAreaDropdown);
              }}
              style={[styles.selectorValueBox, loadingAreas && styles.selectorDisabled]}
            >
              {loadingAreas ? (
                <Text style={styles.selectorPlaceholderText}>Loading areas...</Text>
              ) : areas.length === 0 ? (
                <Text style={styles.selectorPlaceholderText}>No areas found (Create them in Admin console)</Text>
              ) : (
                <Text style={styles.selectorValueText}>{selectedArea || 'Select Area'}</Text>
              )}
              {!loadingAreas && areas.length > 0 && (
                <Ionicons name={showAreaDropdown ? "chevron-up" : "chevron-down"} size={20} color={Colors.light.textSecondary} />
              )}
            </TouchableOpacity>

            {!loadingAreas && showAreaDropdown && areas.length > 0 && (
              <View style={styles.selectorDropdown}>
                {areas.map((area, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedArea(area.name);
                      setShowAreaDropdown(false);
                    }}
                    style={[
                      styles.selectorDropdownItem,
                      selectedArea === area.name && styles.selectorDropdownItemActive
                    ]}
                  >
                    <Text style={[
                      styles.selectorDropdownText,
                      selectedArea === area.name && styles.selectorDropdownTextActive
                    ]}>{area.name}</Text>
                    {selectedArea === area.name && <Ionicons name="checkmark" size={18} color={Colors.light.accent} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Registration Info (Optional)</Text>

          <Input
            label="Driving License Number"
            placeholder="e.g. DL-1234567"
            value={license}
            onChangeText={setLicense}
            leftIcon="card-outline"
            autoCapitalize="characters"
          />

          <Input
            label="Registration Number"
            placeholder="e.g. Dhaka Metro GA 12-3456"
            value={vehicle}
            onChangeText={setVehicle}
            leftIcon="car-outline"
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={18} color={Colors.light.info} />
          <Text style={styles.infoText}>
            {"Your application will be reviewed by the association president. You'll be able to access the full app once approved."}
          </Text>
        </View>

        <Button
          title="Submit Application"
          variant="primary"
          onPress={handleSave}
          loading={saving}
          style={styles.submitBtn}
        />

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={logout}
          style={styles.logoutLink}
        >
          <Text style={styles.logoutText}>Sign out and use a different account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  heroHeader: {
    backgroundColor: '#1E293B',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  providerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    position: 'relative',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: Colors.light.accent,
  },
  avatarInitial: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.light.accent,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  avatarHint: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.45)',
    marginTop: Spacing.sm,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: 40,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.errorLight,
    borderWidth: 1,
    borderColor: Colors.light.error,
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.light.error,
    flex: 1,
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.light.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.light.infoLight,
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  infoText: {
    ...Typography.bodySmall,
    color: Colors.light.info,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  submitBtn: {
    marginBottom: Spacing.md,
  },
  logoutLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  logoutText: {
    ...Typography.bodySmall,
    color: Colors.light.textLight,
    textDecorationLine: 'underline',
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
  selectorValueBox: {
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
  selectorValueText: {
    ...Typography.bodyMedium,
    color: Colors.light.text,
  },
  selectorDropdown: {
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 12,
    marginTop: Spacing.xs,
    backgroundColor: Colors.light.surface,
    overflow: 'hidden',
  },
  selectorDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  selectorDropdownItemActive: {
    backgroundColor: Colors.light.accentLight,
  },
  selectorDropdownText: {
    ...Typography.bodyMedium,
    color: Colors.light.text,
  },
  selectorDropdownTextActive: {
    color: Colors.light.accent,
    fontWeight: '700',
  },
  selectorDisabled: {
    backgroundColor: Colors.light.surfaceDarker,
    opacity: 0.7,
  },
  selectorPlaceholderText: {
    ...Typography.bodyMedium,
    color: Colors.light.textLight,
  },
});
