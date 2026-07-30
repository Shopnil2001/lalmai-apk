import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, Spacing, Typography } from '../constants/theme';

type BadgeType = 
  | 'Super Admin' 
  | 'Admin'
  | 'General Member'
  | 'Driver / General Member'
  | 'active'
  | 'pending'
  | 'suspended'
  | 'paid'
  | 'unpaid';

interface RoleBadgeProps {
  roleOrStatus: BadgeType;
  style?: ViewStyle;
}

export default function RoleBadge({ roleOrStatus, style }: RoleBadgeProps) {
  
  const getBadgeColors = (): { bg: string; text: string } => {
    switch (roleOrStatus) {
      case 'Super Admin':
        return { bg: '#FEE2E2', text: '#EF4444' }; // Red
      case 'Admin':
        return { bg: '#F5F3FF', text: '#7C3AED' }; // Purple/Violet
      case 'General Member':
      case 'Driver / General Member':
        return { bg: '#EFF6FF', text: '#2563EB' }; // Blue
      case 'active':
      case 'paid':
        return { bg: '#ECFDF5', text: '#10B981' }; // Success green
      case 'pending':
        return { bg: '#FFFBEB', text: '#D97706' }; // Pending orange/amber
      case 'suspended':
      case 'unpaid':
        return { bg: '#FEF2F2', text: '#EF4444' }; // Suspended/Unpaid red
      default:
        return { bg: '#F1F5F9', text: '#64748B' }; // Gray
    }
  };

  const { bg, text } = getBadgeColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: text }]}>{roleOrStatus}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...Typography.bodySmall,
    fontWeight: '600',
    fontSize: 11,
  },
});
