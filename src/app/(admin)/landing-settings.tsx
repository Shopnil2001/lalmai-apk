import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
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
import Button from '../../components/Button';
import Card from '../../components/Card';
import CustomHeader from '../../components/CustomHeader';
import Input from '../../components/Input';
import { Colors, Shadows, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { cloudinaryService } from '../../services/cloudinary';
import { dbService } from '../../services/dbService';
import { HomepageSettings } from '../../services/mockData';

export default function LandingSettings() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  // Form States
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [contactFacebook, setContactFacebook] = useState('');
  const [sliders, setSliders] = useState<{ imageUrl: string; text: string }[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await dbService.getHomepageSettings();
        if (data) {
          setContactPhone(data.contactInfo?.phone || '');
          setContactWhatsapp(data.contactInfo?.whatsapp || '');
          setContactFacebook(data.contactInfo?.facebook || '');
          setSliders(data.sliders || []);
          setGallery(data.gallery || []);
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to load landing page configuration settings.');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleAddSlide = () => {
    // Append a placeholder slide that must be customized
    setSliders([
      ...sliders,
      {
        imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800',
        text: 'Lalmai Upozila Rent A Car Service'
      }
    ]);
  };

  const handleRemoveSlide = (idx: number) => {
    setSliders(sliders.filter((_, i) => i !== idx));
  };

  const handleUpdateSlideText = (idx: number, text: string) => {
    setSliders(
      sliders.map((item, i) => (i === idx ? { ...item, text } : item))
    );
  };

  const handlePickSlideImage = async (idx: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Media library permissions are required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setSliders(
        sliders.map((item, i) => (i === idx ? { ...item, imageUrl: uri } : item))
      );
    }
  };

  const handleAddGalleryImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Media library permissions are required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setGallery([...gallery, uri]);
    }
  };

  const handleRemoveGalleryImage = (idx: number) => {
    setGallery(gallery.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Upload newly picked slide images to Cloudinary
      const finalSliders = [...sliders];
      for (let i = 0; i < finalSliders.length; i++) {
        const url = finalSliders[i].imageUrl;
        // If image is local URI
        if (url.startsWith('file:') || url.startsWith('content:') || !url.startsWith('http')) {
          setUploadProgressText(`Uploading Welcome Slide #${i + 1} to cloud storage...`);
          const uploadedUrl = await cloudinaryService.uploadImage(url);
          finalSliders[i].imageUrl = uploadedUrl;
        }
      }

      // 2. Upload newly picked gallery images to Cloudinary
      const finalGallery = [...gallery];
      for (let i = 0; i < finalGallery.length; i++) {
        const url = finalGallery[i];
        if (url.startsWith('file:') || url.startsWith('content:') || !url.startsWith('http')) {
          setUploadProgressText(`Uploading Gallery Photo #${i + 1} to cloud storage...`);
          const uploadedUrl = await cloudinaryService.uploadImage(url);
          finalGallery[i] = uploadedUrl;
        }
      }

      // 3. Save to database
      setUploadProgressText('Updating configuration settings document...');
      const payload: HomepageSettings = {
        sliders: finalSliders,
        gallery: finalGallery,
        contactInfo: {
          phone: contactPhone.trim(),
          whatsapp: contactWhatsapp.trim(),
          facebook: contactFacebook.trim()
        }
      };

      await dbService.updateHomepageSettings(payload);
      showToast('Landing page settings updated successfully!', 'success');
      router.replace('/(tabs)/profile');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to save configuration settings.');
    } finally {
      setSaving(false);
      setUploadProgressText('');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <CustomHeader title="Manage Landing Page" showBack fallbackRoute="/(tabs)/profile" />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.accent} />
          <Text style={styles.loadingText}>Fetching page configuration...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Support contacts card */}
          <View style={styles.sectionHeader}>
            <Ionicons name="call-outline" size={20} color={Colors.light.accent} />
            <Text style={styles.sectionTitle}>1. Support Contacts & Social Info</Text>
          </View>
          
          <Card style={styles.card} elevation="sm">
            <Input
              label="Support Hotline Call"
              placeholder="e.g. +88017XXXXXXXX"
              value={contactPhone}
              onChangeText={setContactPhone}
              leftIcon="call-outline"
            />
            <Input
              label="WhatsApp Support Number"
              placeholder="e.g. +88017XXXXXXXX"
              value={contactWhatsapp}
              onChangeText={setContactWhatsapp}
              leftIcon="logo-whatsapp"
            />
            <Input
              label="Facebook Fan Page URL"
              placeholder="e.g. https://facebook.com/lalmairentcar"
              value={contactFacebook}
              onChangeText={setContactFacebook}
              leftIcon="logo-facebook"
              autoCapitalize="none"
            />
          </Card>

          {/* Welcome sliders carousel section */}
          <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
            <Ionicons name="images-outline" size={20} color={Colors.light.accent} />
            <Text style={styles.sectionTitle}>2. Welcome Carousel Sliders</Text>
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={handleAddSlide}
              style={styles.addSectionBtn}
            >
              <Ionicons name="add-circle" size={20} color={Colors.light.accent} />
              <Text style={styles.addSectionBtnText}>Add Slide</Text>
            </TouchableOpacity>
          </View>

          {sliders.length === 0 ? (
            <Card style={styles.emptyCard} elevation="sm">
              <Ionicons name="images" size={32} color={Colors.light.textLight} />
              <Text style={styles.emptyText}>No welcome slides active. Click &quot;Add Slide&quot; to customize.</Text>
            </Card>
          ) : (
            sliders.map((slide, idx) => (
              <Card key={idx} style={styles.slideCard} elevation="sm">
                <View style={styles.slideCardHeader}>
                  <Text style={styles.slideNumber}>Slide #{idx + 1}</Text>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => handleRemoveSlide(idx)}>
                    <Ionicons name="trash-outline" size={18} color={Colors.light.error} />
                  </TouchableOpacity>
                </View>

                <View style={styles.slideEditorContainer}>
                  {/* Photo picker preview */}
                  <TouchableOpacity 
                    activeOpacity={0.8} 
                    onPress={() => handlePickSlideImage(idx)}
                    style={styles.slideImageWrapper}
                  >
                    <Image source={{ uri: slide.imageUrl }} style={styles.slideImage} />
                    <View style={styles.imageOverlayBadge}>
                      <Ionicons name="camera" size={16} color="#FFFFFF" />
                      <Text style={styles.imageOverlayBadgeText}>Change</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Caption input */}
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Slide Text Caption"
                      placeholder="Welcome text shown on top..."
                      value={slide.text}
                      onChangeText={(val) => handleUpdateSlideText(idx, val)}
                      containerStyle={{ marginBottom: 0 }}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>
              </Card>
            ))
          )}

          {/* Photo gallery grid section */}
          <View style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>
            <Ionicons name="grid-outline" size={20} color={Colors.light.accent} />
            <Text style={styles.sectionTitle}>3. Image Gallery Register</Text>
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={handleAddGalleryImage}
              style={styles.addSectionBtn}
            >
              <Ionicons name="add-circle" size={20} color={Colors.light.accent} />
              <Text style={styles.addSectionBtnText}>Add Photo</Text>
            </TouchableOpacity>
          </View>

          <Card style={styles.card} elevation="sm">
            {gallery.length === 0 ? (
              <View style={{ alignItems: 'center', padding: Spacing.lg }}>
                <Ionicons name="images-outline" size={32} color={Colors.light.textLight} />
                <Text style={[styles.emptyText, { marginTop: 4 }]}>No gallery photos listed.</Text>
              </View>
            ) : (
              <View style={styles.galleryGrid}>
                {gallery.map((url, idx) => (
                  <View key={idx} style={styles.galleryItem}>
                    <Image source={{ uri: url }} style={styles.galleryPhoto} />
                    <TouchableOpacity 
                      activeOpacity={0.8} 
                      onPress={() => handleRemoveGalleryImage(idx)}
                      style={styles.deleteBadge}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* Sticky buttons bottom container */}
          <View style={styles.actionsContainer}>
            <Button
              title="Discard / Go Back"
              variant="outline"
              onPress={() => router.back()}
              style={styles.btnHalf}
              disabled={saving}
            />
            <Button
              title="Save Changes"
              variant="primary"
              onPress={handleSave}
              style={styles.btnHalf}
              loading={saving}
            />
          </View>

        </ScrollView>
      )}

      {/* Cloudinary Uploading Overlay Modal */}
      <Modal visible={saving} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.loadingCard} elevation="md">
            <ActivityIndicator size="large" color={Colors.light.accent} style={{ marginBottom: Spacing.md }} />
            <Text style={styles.loadingCardTitle}>Saving Settings</Text>
            <Text style={styles.loadingCardDesc}>{uploadProgressText}</Text>
          </Card>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    fontWeight: '600',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.bodyMedium,
    fontWeight: '800',
    color: Colors.light.primary,
    marginLeft: 8,
    flex: 1,
  },
  addSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addSectionBtnText: {
    ...Typography.bodySmall,
    color: Colors.light.accent,
    fontWeight: '700',
  },
  card: {
    padding: Spacing.md,
    backgroundColor: Colors.light.surface,
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  slideCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.light.surface,
  },
  slideCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  slideNumber: {
    ...Typography.bodyMedium,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  slideEditorContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  slideImageWrapper: {
    width: 120,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.light.surfaceDarker,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  imageOverlayBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  galleryItem: {
    width: '29%',
    aspectRatio: 4 / 3,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.light.surfaceDarker,
  },
  galleryPhoto: {
    width: '100%',
    height: '100%',
  },
  deleteBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.light.error,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  btnHalf: {
    width: '48%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 320,
    padding: Spacing.xl,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCardTitle: {
    ...Typography.bodyLarge,
    fontWeight: '800',
    color: Colors.light.primary,
    marginBottom: Spacing.xs,
  },
  loadingCardDesc: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
