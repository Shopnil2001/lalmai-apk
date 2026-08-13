import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { dbService } from '../../../services/dbService';
import { useAuth } from '../../../context/AuthContext';
import CustomHeader from '../../../components/CustomHeader';
import Card from '../../../components/Card';
import Input from '../../../components/Input';
import Button from '../../../components/Button';
import * as notificationService from '../../../services/notificationService';

export default function CreateAnnouncement() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePublishAnnouncement = async () => {
    if (!title || !content) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await dbService.createAnnouncement({
        title,
        content,
        postedBy: user?.uid || 'admin',
        postedByName: user?.name || 'Administrator',
        postedByRole: user?.role || 'Super Admin',
      });

      // Notify all members
      await notificationService.sendLocalNotification('📢 New Announcement', title);
      notificationService.sendPushToAllMembers('📢 New Announcement', title).catch(() => {});

      Alert.alert(
        'Success', 
        'Announcement published successfully.',
        [{ text: 'OK', onPress: () => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(admin)/dashboard');
          }
        } }]
      );
    } catch (err: any) {
      setError(err.message || 'Failed to publish announcement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <CustomHeader title="Post Announcement" showBack fallbackRoute="/(admin)/dashboard" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.formCard} elevation="sm">
          <Text style={styles.formInstructions}>
            Publish important alerts, meeting recaps, or policy changes. Notifications will be sent to all active members immediately.
          </Text>

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={Colors.light.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Input
            label="Announcement Title *"
            placeholder="e.g. Traffic Alert or Monthly Subscription Due"
            value={title}
            onChangeText={setTitle}
            leftIcon="megaphone-outline"
          />

          <Input
            label="Notification Content *"
            placeholder="Write the full announcement message here..."
            value={content}
            onChangeText={setContent}
            leftIcon="chatbox-ellipses-outline"
            multiline
            numberOfLines={6}
            inputStyle={styles.textArea}
          />

          <Button
            title="Broadcast Announcement"
            variant="primary"
            onPress={handlePublishAnnouncement}
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
  textArea: {
    height: 150,
    textAlignVertical: 'top',
    paddingTop: Spacing.xs,
  },
  submitBtn: {
    marginTop: Spacing.md,
  },
});
