import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { dbService } from '../../services/dbService';
import { Area } from '../../services/mockData';
import { Colors, Spacing, Typography } from '../../constants/theme';
import CustomHeader from '../../components/CustomHeader';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

export default function AreasManagement() {
  const router = useRouter();
  const { user, isSuperAdmin } = useAuth();
  
  const [areas, setAreas] = useState<Area[]>([]);
  const [newAreaName, setNewAreaName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadAreas = async () => {
    try {
      const fetched = await dbService.getAreas();
      // Sort alphabetically by name
      fetched.sort((a, b) => a.name.localeCompare(b.name));
      setAreas(fetched);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load areas list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Security check: Only Super Admin can access
    if (user && !isSuperAdmin) {
      Alert.alert('Access Denied', 'Only the Super Admin can manage areas.', [
        { text: 'OK', onPress: () => router.replace('/(admin)/dashboard') }
      ]);
      return;
    }
    loadAreas();
  }, [user]);

  const handleAddArea = async () => {
    if (!newAreaName.trim()) {
      Alert.alert('Invalid Input', 'Please enter a valid area name.');
      return;
    }
    
    // Check duplication
    const cleanName = newAreaName.trim();
    if (areas.some(a => a.name.toLowerCase() === cleanName.toLowerCase())) {
      Alert.alert('Duplicate Area', 'An area with this name already exists.');
      return;
    }

    setSubmitting(true);
    try {
      await dbService.createArea(cleanName);
      setNewAreaName('');
      await loadAreas();
      Alert.alert('Success', `Area "${cleanName}" added successfully.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to create area.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteArea = async (areaId: string, name: string) => {
    Alert.alert(
      'Delete Area',
      `Are you sure you want to delete "${name}"? Members assigned to this area will remain but their area reference will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await dbService.deleteArea(areaId);
              await loadAreas();
              Alert.alert('Success', `Area "${name}" deleted.`);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete area.');
            } finally {
              setLoading(false);
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
    <View style={styles.container}>
      <CustomHeader title="Manage Areas" showBack fallbackRoute="/(admin)/dashboard" />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Add Area Section */}
        <Card style={styles.addCard} elevation="sm">
          <Text style={styles.sectionHeading}>Create New Area</Text>
          <Text style={styles.sectionSubtitle}>
            Input a region or branch name. General members will select from this list during sign up.
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Lalmai Sadar"
              placeholderTextColor={Colors.light.textLight}
              value={newAreaName}
              onChangeText={setNewAreaName}
              maxLength={40}
            />
            <Button
              title="Add"
              variant="primary"
              onPress={handleAddArea}
              loading={submitting}
              style={styles.addBtn}
            />
          </View>
        </Card>

        {/* Areas Directory */}
        <View style={styles.listSection}>
          <Text style={styles.listHeading}>Regional Areas Directory ({areas.length})</Text>
          {areas.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="map-outline" size={48} color={Colors.light.textLight} />
              <Text style={styles.emptyText}>No areas registered. Create one above to get started.</Text>
            </Card>
          ) : (
            areas.map(item => (
              <Card key={item.id} style={styles.areaItemCard} elevation="sm">
                <View style={styles.areaDetails}>
                  <Ionicons name="location-sharp" size={20} color={Colors.light.accent} style={styles.locationIcon} />
                  <Text style={styles.areaName}>{item.name}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleDeleteArea(item.id, item.name)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.light.error} />
                </TouchableOpacity>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  addCard: {
    padding: Spacing.xl,
    backgroundColor: Colors.light.surface,
    marginBottom: Spacing.xl,
  },
  sectionHeading: {
    ...Typography.h3,
    color: Colors.light.primary,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    ...Typography.bodyMedium,
    color: Colors.light.text,
    backgroundColor: Colors.light.surface,
  },
  addBtn: {
    height: 48,
    width: 80,
    justifyContent: 'center',
  },
  listSection: {
    marginBottom: Spacing.lg,
  },
  listHeading: {
    ...Typography.label,
    color: Colors.light.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
    paddingLeft: 2,
  },
  areaItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.light.surface,
    marginBottom: Spacing.sm,
  },
  areaDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIcon: {
    marginRight: Spacing.sm,
  },
  areaName: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surface,
    gap: Spacing.md,
  },
  emptyText: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 240,
  },
});
