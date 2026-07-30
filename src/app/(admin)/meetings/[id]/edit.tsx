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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography, Shadows } from '../../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { dbService } from '../../../../services/dbService';
import { useAuth } from '../../../../context/AuthContext';
import { Meeting, Area } from '../../../../services/mockData';
import CustomHeader from '../../../../components/CustomHeader';
import Card from '../../../../components/Card';
import Input from '../../../../components/Input';
import Button from '../../../../components/Button';
import DateTimePicker from '../../../../components/DateTimePicker';

export default function EditMeeting() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMeetingAndAreas = async () => {
    try {
      const [allMeetings, allAreas] = await Promise.all([
        dbService.getMeetings(),
        dbService.getAreas()
      ]);
      
      setAreas(allAreas);
      
      const found = allMeetings.find((m: Meeting) => m.id === id);
      if (found) {
        setMeeting(found);
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
      } else {
        Alert.alert('Error', 'Meeting not found.');
        router.replace('/(tabs)/meetings');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load meeting details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadMeetingAndAreas();
    }
  }, [id]);

  const handleToggleArea = (areaName: string) => {
    setSelectedAreas(prev => 
      prev.includes(areaName)
        ? prev.filter(a => a !== areaName)
        : [...prev, areaName]
    );
  };

  const handleUpdateMeeting = async () => {
    if (!meeting || !title || !description || !date || !time || !location) {
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

      await dbService.updateMeeting({
        ...meeting,
        title,
        description,
        dateTime: timestamp,
        location,
        targetAreas: selectedAreas.length > 0 ? selectedAreas : undefined
      });

      Alert.alert(
        'Success', 
        'Meeting details updated successfully.',
        [{ text: 'OK', onPress: () => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/meetings');
          }
        } }]
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update meeting.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMeeting = () => {
    if (!meeting) return;
    Alert.alert(
      'Cancel & Delete Meeting',
      'Are you sure you want to cancel and delete this meeting? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Delete It', 
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await dbService.deleteMeeting(meeting.id);
              Alert.alert('Success', 'Meeting cancelled and deleted.');
              router.replace('/(tabs)/meetings');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete meeting.');
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
      <CustomHeader title="Edit Meeting" showBack fallbackRoute="/(tabs)/meetings" />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Card style={styles.formCard} elevation="sm">
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={Colors.light.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Input
            label="Meeting Title *"
            value={title}
            onChangeText={setTitle}
            leftIcon="bookmark-outline"
          />

          <Input
            label="Meeting Description *"
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
                  onPress={() => handleToggleArea(area.name)}
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
            onPress={handleUpdateMeeting}
            loading={saving}
            style={styles.submitBtn}
          />

          <Button
            title="Cancel & Delete Meeting"
            variant="danger"
            onPress={handleDeleteMeeting}
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
  sectionLabel: {
    ...Typography.label,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: '700',
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
  submitBtn: {
    marginTop: Spacing.md,
  },
  deleteBtn: {
    marginTop: Spacing.sm,
  },
});
