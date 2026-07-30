import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors, Spacing, Typography } from '../constants/theme';
import { Announcement } from '../services/mockData';
import { Ionicons } from '@expo/vector-icons';
import RoleBadge from './RoleBadge';

interface AnnouncementCardProps {
  announcement: Announcement;
}

export default function AnnouncementCard({ announcement }: AnnouncementCardProps) {

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.card}>
      {/* Left accent strip */}
      <View style={styles.accentStrip} />

      <View style={styles.innerContent}>
        {/* Dark navy header */}
        <View style={styles.noticeHeader}>
          <View style={styles.bellContainer}>
            <View style={styles.megaphoneIconBg}>
              <Ionicons name="megaphone" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.noticeLabel}>ANNOUNCEMENT</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(announcement.createdAt)}</Text>
        </View>

        {/* White content area */}
        <View style={styles.contentArea}>
          <Text style={styles.title}>{announcement.title}</Text>
          <Text style={styles.content}>{announcement.content}</Text>

          <View style={styles.divider} />

          <View style={styles.posterContainer}>
            <Text style={styles.postedLabel}>Posted by:</Text>
            <View style={styles.badgeWrapper}>
              <Text style={styles.posterName}>{announcement.postedByName}</Text>
              <RoleBadge roleOrStatus={announcement.postedByRole as any} style={styles.badge} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.09,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  accentStrip: {
    width: 4,
    backgroundColor: '#4F46E5',
  },
  innerContent: {
    flex: 1,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
  },
  bellContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  megaphoneIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(79,70,229,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  noticeLabel: {
    ...Typography.label,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  dateText: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
  },
  contentArea: {
    padding: Spacing.lg,
  },
  title: {
    ...Typography.h3,
    color: Colors.light.primary,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  content: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.surfaceDarker,
    marginVertical: Spacing.md,
  },
  posterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postedLabel: {
    ...Typography.bodySmall,
    color: Colors.light.textLight,
    marginRight: Spacing.sm,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  posterName: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: Colors.light.text,
    marginRight: Spacing.sm,
  },
  badge: {
    paddingVertical: 1,
    paddingHorizontal: Spacing.xs + 2,
    borderRadius: 6,
  },
});
