import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  TouchableOpacity
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { dbService } from '../../../services/dbService';
import { useAuth } from '../../../context/AuthContext';
import { Area } from '../../../services/mockData';
import CustomHeader from '../../../components/CustomHeader';
import Card from '../../../components/Card';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import DateTimePicker from '../../../components/DateTimePicker';
import * as notificationService from '../../../services/notificationService';

export default function CreateMeeting() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(''); // e.g. YYYY-MM-DD
  const [time, setTime] = useState(''); // e.g. HH:MM
  const [location, setLocation] = useState('');
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
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

  const handleCreateMeeting = async () => {
    if (!title || !description || !date || !time || !location) {
      setError('Please fill in all fields.');
      return;
    }

    // Basic date parsing validation YYYY-MM-DD and HH:MM
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;

    if (!dateRegex.test(date)) {
      setError('Date must be in YYYY-MM-DD format.');
      return;
    }

    if (!timeRegex.test(time)) {
      setError('Time must be in HH:MM format (24-hour style).');
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

      await dbService.createMeeting({
        title,
        description,
        dateTime: timestamp,
        location,
        status: 'upcoming',
        createdBy: user?.uid || 'admin',
        targetAreas: selectedAreas.length > 0 ? selectedAreas : undefined
      });

      // Notify all members matching target areas
      await notificationService.sendLocalNotification('📅 Meeting Scheduled', title);
      notificationService.sendPushToAllMembers(
        '📅 Meeting Scheduled',
        title,
        selectedAreas.length > 0 ? selectedAreas : undefined
      ).catch(() => {});

      Alert.alert(
        'Success', 
        'Meeting scheduled successfully.',
        [{ text: 'OK', onPress: () => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(admin)/dashboard');
          }
        } }]
      );
    } catch (err: any) {
      setError(err.message || 'Failed to schedule meeting.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <CustomHeader title="Schedule Meeting" showBack fallbackRoute="/(admin)/dashboard" />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Card style={styles.formCard} elevation="sm">
          <Text style={styles.formInstructions}>
            Provide detail requirements for the general assembly or committee meeting. A push notification will be sent to all active members.
          </Text>

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={Colors.light.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Input
            label="Meeting Title *"
            placeholder="e.g. Monthly General Assembly"
            value={title}
            onChangeText={setTitle}
            leftIcon="bookmark-outline"
          />

          <Input
            label="Meeting Description *"
            placeholder="Outline agenda items..."
            value={description}
            onChangeText={setDescription}
            leftIcon="document-text-outline"
            multiline
            numberOfLines={4}
            inputStyle={styles.textArea}
          />

          <View style={styles.row}>
            <DateTimePicker
              label="Date *"
              value={date}
              onChange={setDate}
              type="date"
              placeholder="e.g. 2026-06-15"
              leftIcon="calendar-outline"
              containerStyle={styles.halfInput}
            />

            <DateTimePicker
              label="Time (HH:MM) *"
              value={time}
              onChange={setTime}
              type="time"
              placeholder="e.g. 17:30"
              leftIcon="time-outline"
              containerStyle={styles.halfInput}
            />
          </View>

          <Input
            label="Location/Venue *"
            placeholder="e.g. Lalmai Upozila Rent A Car Office Hall"
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
            title="Create & Schedule Meeting"
            variant="primary"
            onPress={handleCreateMeeting}
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
  formInstructions: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
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
  submitBtn: {
    marginTop: Spacing.md,
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
});
