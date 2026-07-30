import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert,
  TouchableOpacity
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography, Shadows } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { dbService } from '@/services/dbService';
import { cloudinaryService } from '@/services/cloudinary';
import { useAuth } from '@/context/AuthContext';
import { Event, Area } from '@/services/mockData';
import CustomHeader from '@/components/CustomHeader';
import Card from '@/components/Card';
import Input from '../../../../components/Input';
import Button from '../../../../components/Button';
import DateTimePicker from '../../../../components/DateTimePicker';

export default function EditEvent() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [originalUrls, setOriginalUrls] = useState<string[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvent = async () => {
    try {
      const [allEvents, allAreas] = await Promise.all([
        dbService.getEvents(),
        dbService.getAreas()
      ]);
      setAreas(allAreas);
      
      const found = allEvents.find((e: Event) => e.id === id);
      if (found) {
        setEvent(found);
        setTitle(found.title);
        setDescription(found.description);
        
        const dateObj = new Date(found.dateTime);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const hh = String(dateObj.getHours()).padStart(2, '0');
        const min = String(dateObj.getMinutes()).padStart(2, '0');
        
        setDate(`${yyyy}-${mm}-${dd}`);
        setTime(`${hh}:${min}`);
        setLocation(found.location);
        setSelectedAreas(found.targetAreas || []);
        
        const urls = found.bannerUrls || (found.bannerUrl ? [found.bannerUrl] : []);
        setImageUrls(urls);
        setOriginalUrls(urls);
      } else {
        Alert.alert('Error', 'Event not found.');
        router.replace('/(tabs)/events');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load event details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

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
      setImageUrls(prev => [...prev, ...uris].slice(0, 5));
    }
  };

  const handleRemoveBanner = (index: number) => {
    setImageUrls(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateEvent = async () => {
    if (!event || !title || !description || !date || !time || !location) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const dateParts = date.split('-');
      const timeParts = time.split(':');
      if (dateParts.length !== 3 || timeParts.length !== 2) {
        setError('Invalid date or time format.');
        setSaving(false);
        return;
      }
      const [year, month, day] = dateParts.map(Number);
      const [hours, minutes] = timeParts.map(Number);
      const timestamp = new Date(year, month - 1, day, hours, minutes).getTime();
      
      if (isNaN(timestamp)) {
        setError('Invalid date or time value.');
        setSaving(false);
        return;
      }

      // 1. Identify which original images were removed
      const deletedUrls = originalUrls.filter(url => !imageUrls.includes(url));
      
      // 2. Identify which images are local (need upload) vs remote
      const localUris = imageUrls.filter(url => !url.includes('cloudinary.com'));
      const existingRemoteUrls = imageUrls.filter(url => url.includes('cloudinary.com'));

      // 3. Upload new banners
      let newlyUploadedUrls: string[] = [];
      if (localUris.length > 0) {
        setImageUploading(true);
        newlyUploadedUrls = await Promise.all(
          localUris.map(uri => cloudinaryService.uploadImage(uri))
        );
        setImageUploading(false);
      }

      // 4. Delete removed banners from Cloudinary
      if (deletedUrls.length > 0) {
        await Promise.all(
          deletedUrls.map(url => cloudinaryService.deleteImage(url))
        );
      }

      // 5. Construct final lists
      const finalImageUrls = [...existingRemoteUrls, ...newlyUploadedUrls];

      await dbService.updateEvent({
        ...event,
        title,
        description,
        dateTime: timestamp,
        location,
        bannerUrl: finalImageUrls.length > 0 ? finalImageUrls[0] : null,
        bannerUrls: finalImageUrls,
        targetAreas: selectedAreas.length > 0 ? selectedAreas : undefined
      });

      Alert.alert(
        'Success', 
        'Event details updated successfully.',
        [{ text: 'OK', onPress: () => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/events');
          }
        } }]
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update event.');
    } finally {
      setSaving(false);
      setImageUploading(false);
    }
  };

  const handleDeleteEvent = () => {
    if (!event) return;
    Alert.alert(
      'Cancel & Delete Event',
      'Are you sure you want to cancel and delete this event? This will delete all banner images.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Delete It', 
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              // Delete all banners from Cloudinary
              if (imageUrls.length > 0) {
                await Promise.all(
                  imageUrls.map(url => cloudinaryService.deleteImage(url))
                );
              }

              await dbService.deleteEvent(event.id);
              Alert.alert('Success', 'Event cancelled and deleted.');
              router.replace('/(tabs)/events');
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel event.');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <CustomHeader title="Edit Event" showBack fallbackRoute="/(tabs)/events" />

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
            {imageUrls.map((uri, index) => (
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
            
            {imageUrls.length < 5 && (
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
              <Text style={styles.uploadText}>Uploading banners to Cloudinary...</Text>
            </View>
          )}

          <Input
            label="Event Title *"
            value={title}
            onChangeText={setTitle}
            leftIcon="flag-outline"
          />

          <Input
            label="Event Description *"
            placeholder="Write event description here..."
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
              leftIcon="calendar-outline"
              containerStyle={styles.halfInput}
            />

            <DateTimePicker
              label="Time *"
              value={time}
              onChange={setTime}
              type="time"
              leftIcon="time-outline"
              containerStyle={styles.halfInput}
            />
          </View>

          <Input
            label="Location/Venue *"
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
            title="Save Changes"
            variant="primary"
            onPress={handleUpdateEvent}
            loading={saving}
            style={styles.submitBtn}
          />

          <Button
            title="Cancel & Delete Event"
            variant="danger"
            onPress={handleDeleteEvent}
            style={styles.deleteBtn}
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
  deleteBtn: {
    marginTop: Spacing.sm,
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
