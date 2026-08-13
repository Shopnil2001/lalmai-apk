import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert 
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, Shadows } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { dbService } from '../../../services/dbService';
import { cloudinaryService } from '../../../services/cloudinary';
import { useAuth } from '../../../context/AuthContext';
import { Area } from '../../../services/mockData';
import CustomHeader from '../../../components/CustomHeader';
import Card from '../../../components/Card';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import DateTimePicker from '../../../components/DateTimePicker';
import * as notificationService from '../../../services/notificationService';

export default function CreateEvent() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(''); // YYYY-MM-DD
  const [time, setTime] = useState(''); // HH:MM
  const [location, setLocation] = useState('');
  const [localUris, setLocalUris] = useState<string[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const fetched = await dbService.getAreas();
        setAreas(fetched);
      } catch (err) {
        console.error('Failed to load areas', err);
      }
    };
    fetchAreas();
  }, []);

  const handlePickBanners = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permissions are required to select photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uris = result.assets.map(asset => asset.uri);
      setLocalUris(prev => [...prev, ...uris].slice(0, 5));
    }
  };

  const handleRemoveBanner = (index: number) => {
    setLocalUris(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateEvent = async () => {
    if (!title || !description || !date || !time || !location) {
      setError('Please fill in all fields.');
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;

    if (!dateRegex.test(date) || !timeRegex.test(time)) {
      setError('Check Date (YYYY-MM-DD) and Time (HH:MM) formats.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const dateParts = date.split('-');
      const timeParts = time.split(':');
      if (dateParts.length !== 3 || timeParts.length !== 2) {
        setError('Invalid date or time format.');
        setLoading(false);
        return;
      }
      const [year, month, day] = dateParts.map(Number);
      const [hours, minutes] = timeParts.map(Number);
      const timestamp = new Date(year, month - 1, day, hours, minutes).getTime();
      
      if (isNaN(timestamp)) {
        setError('Invalid date or time value.');
        setLoading(false);
        return;
      }

      let uploadedUrls: string[] = [];
      if (localUris.length > 0) {
        setImageUploading(true);
        uploadedUrls = await Promise.all(
          localUris.map(uri => cloudinaryService.uploadImage(uri))
        );
        setImageUploading(false);
      }

      await dbService.createEvent({
        title,
        description,
        dateTime: timestamp,
        location,
        bannerUrl: uploadedUrls.length > 0 ? uploadedUrls[0] : null,
        bannerUrls: uploadedUrls,
        status: 'active',
        createdBy: user?.uid || 'admin',
        targetAreas: selectedAreas.length > 0 ? selectedAreas : undefined
      });

      // Notify all members matching target areas
      await notificationService.sendLocalNotification('🎉 New Event', title);
      notificationService.sendPushToAllMembers(
        '🎉 New Event',
        title,
        selectedAreas.length > 0 ? selectedAreas : undefined
      ).catch(() => {});

      Alert.alert(
        'Success', 
        'Event created successfully.',
        [{ text: 'OK', onPress: () => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(admin)/dashboard');
          }
        } }]
      );
    } catch (err: any) {
      setError(err.message || 'Failed to create event.');
    } finally {
      setLoading(false);
      setImageUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <CustomHeader title="Create Event" showBack fallbackRoute="/(admin)/dashboard" />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Card style={styles.formCard} elevation="sm">
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={Colors.light.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Multiple Banner Picker */}
          <Text style={styles.sectionLabel}>Event Banners (Max 5)</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.photoListContainer}
            contentContainerStyle={styles.photoListContent}
          >
            {localUris.map((uri, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.previewPhoto} />
                <TouchableOpacity 
                  activeOpacity={0.7} 
                  onPress={() => handleRemoveBanner(index)}
                  style={styles.photoRemoveBadge}
                >
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
            
            {localUris.length < 5 && (
              <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={handlePickBanners}
                style={styles.addPhotoBtn}
              >
                <Ionicons name="camera-outline" size={28} color={Colors.light.textLight} />
                <Text style={styles.addPhotoBtnText}>Add Banner</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {imageUploading && (
            <View style={styles.uploadProgress}>
              <ActivityIndicator size="small" color={Colors.light.accent} />
              <Text style={styles.uploadText}>Uploading image to Cloudinary...</Text>
            </View>
          )}

          <Input
            label="Event Title *"
            placeholder="e.g. LRC Annual Family Picnic"
            value={title}
            onChangeText={setTitle}
            leftIcon="flag-outline"
          />

          <Input
            label="Event Description *"
            placeholder="Write full details about the activities, food, schedule, and participation guidelines..."
            value={description}
            onChangeText={setDescription}
            leftIcon="document-text-outline"
            multiline
            numberOfLines={5}
            inputStyle={styles.textArea}
          />

          <View style={styles.row}>
            <DateTimePicker
              label="Date *"
              value={date}
              onChange={setDate}
              type="date"
              placeholder="e.g. 2026-06-25"
              leftIcon="calendar-outline"
              containerStyle={styles.halfInput}
            />

            <DateTimePicker
              label="Time (HH:MM) *"
              value={time}
              onChange={setTime}
              type="time"
              placeholder="e.g. 09:30"
              leftIcon="time-outline"
              containerStyle={styles.halfInput}
            />
          </View>

          <Input
            label="Location/Venue *"
            placeholder="e.g. Shalban Picnic Spot, Comilla"
            value={location}
            onChangeText={setLocation}
            leftIcon="location-outline"
          />

          {/* Target Area Pill Selection */}
          <Text style={styles.sectionLabel}>Target Areas (General if none selected)</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.areaScroll}
            contentContainerStyle={styles.areaScrollContent}
          >
            {areas.map((area) => {
              const isSelected = selectedAreas.includes(area.name);
              return (
                <TouchableOpacity
                  key={area.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedAreas(prev => 
                      prev.includes(area.name)
                        ? prev.filter(a => a !== area.name)
                        : [...prev, area.name]
                    );
                  }}
                  style={[
                    styles.areaPill,
                    isSelected && styles.areaPillActive
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={12} color="#FFF" style={{ marginRight: 4 }} />}
                  <Text style={[
                    styles.areaPillText,
                    isSelected && styles.areaPillTextActive
                  ]}>
                    {area.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Button
            title="Publish Event"
            variant="primary"
            onPress={handleCreateEvent}
            loading={loading}
            style={styles.submitBtn}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  formCard: {
    padding: Spacing.xl,
    backgroundColor: Colors.light.surface,
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
  photoListContainer: {
    marginVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  photoListContent: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingRight: Spacing.md,
  },
  photoWrapper: {
    position: 'relative',
  },
  previewPhoto: {
    width: 110,
    height: 110,
    borderRadius: 12,
    backgroundColor: Colors.light.surfaceDarker,
  },
  photoRemoveBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.light.error,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  addPhotoBtn: {
    width: 110,
    height: 110,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.light.surfaceDarker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBtnText: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: '700',
  },
  uploadProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  uploadText: {
    ...Typography.bodySmall,
    color: Colors.light.accent,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  textArea: {
    height: 150,
    textAlignVertical: 'top',
    paddingTop: Spacing.xs,
  },
  submitBtn: {
    marginTop: Spacing.md,
  },
  areaScroll: {
    marginVertical: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  areaScrollContent: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingRight: Spacing.md,
  },
  areaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  areaPillActive: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  areaPillText: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  areaPillTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
});
