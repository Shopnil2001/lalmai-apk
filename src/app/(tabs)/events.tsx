import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  Dimensions,
  ScrollView,
  Platform
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = screenWidth - 32;
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, Typography, Shadows } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useTabBarVisibility } from '../../context/TabBarVisibilityContext';
import { dbService } from '../../services/dbService';
import { Event } from '../../services/mockData';
import CustomHeader from '../../components/CustomHeader';
import Card from '../../components/Card';
import RoleBadge from '../../components/RoleBadge';

function EventCardItem({
  item,
  canManageEvents,
  formatEventDate,
  router,
}: {
  item: Event;
  canManageEvents: boolean;
  formatEventDate: (timestamp: number) => string;
  router: any;
}) {
  const hasMultipleBanners = item.bannerUrls && item.bannerUrls.length > 0;
  const [activeSlide, setActiveSlide] = useState(0);

  return (
    <Card style={styles.eventCard} elevation="sm">
      {/* Banner Image or Carousel */}
      {hasMultipleBanners ? (
        <View style={styles.carouselWrapper}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            style={styles.carouselContainer}
            onMomentumScrollEnd={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
              if (slide >= 0 && slide < item.bannerUrls!.length) {
                setActiveSlide(slide);
              }
            }}
          >
            {item.bannerUrls!.map((url, idx) => (
              <Image 
                key={idx}
                source={{ uri: url }} 
                style={styles.bannerImage} 
                contentFit="cover"
                transition={200}
              />
            ))}
          </ScrollView>

          {/* Top-Right Page Indicator Badge */}
          <View style={styles.carouselBadge}>
            <Ionicons name="images" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.carouselBadgeText}>
              {activeSlide + 1} / {item.bannerUrls!.length}
            </Text>
          </View>

          {/* Bottom Pagination Dots */}
          <View style={styles.paginationDotsContainer}>
            {item.bannerUrls!.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.paginationDot,
                  activeSlide === idx ? styles.activePaginationDot : styles.inactivePaginationDot,
                ]}
              />
            ))}
          </View>
        </View>
      ) : item.bannerUrl ? (
        <Image 
          source={{ uri: item.bannerUrl }} 
          style={styles.bannerImage} 
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={styles.placeholderBanner}>
          <Ionicons name="image-outline" size={40} color={Colors.light.textLight} />
        </View>
      )}

      {/* Text Details */}
      <View style={styles.cardContent}>
        <View style={styles.titleRow}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          {item.status === 'cancelled' && (
            <RoleBadge roleOrStatus="suspended" style={styles.statusBadge} />
          )}
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={Colors.light.accent} />
          <Text style={styles.infoText}>{formatEventDate(item.dateTime)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color={Colors.light.accent} />
          <Text style={styles.infoText} numberOfLines={1}>{item.location}</Text>
        </View>

        <Text style={styles.description} numberOfLines={3}>{item.description}</Text>

        {canManageEvents && (
          <View style={styles.adminFooter}>
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => router.push({
                pathname: '/(admin)/events/[id]/attendance',
                params: { id: item.id }
              })}
              style={styles.attendanceButton}
            >
              <Ionicons name="people-outline" size={18} color={Colors.light.accent} />
              <Text style={styles.attendanceButtonText}>Attendance</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => router.push({
                pathname: '/(admin)/events/[id]/edit',
                params: { id: item.id }
              })}
              style={styles.editButton}
            >
              <Ionicons name="create-outline" size={18} color={Colors.light.textSecondary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Card>
  );
}

export default function EventsList() {
  const router = useRouter();
  const { user, isAdmin, isSuperAdmin, hasPermission } = useAuth();
  const { handleScroll } = useTabBarVisibility();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Can the current user create/edit events?
  const canManageEvents = isSuperAdmin || hasPermission('manageEvents');

  const loadEvents = async () => {
    try {
      const fetchedEvents = await dbService.getEvents();
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Failed to load events', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const formatEventDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const formatted = date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${formatted} at ${time}`;
  };

  const upcomingEvents = events.filter(e => {
    if (e.status === 'cancelled') return false;
    if (e.dateTime < Date.now()) return false;
    if (user && user.role === 'General Member') {
      if (e.targetAreas && e.targetAreas.length > 0) {
        return !!(user.area && e.targetAreas.includes(user.area));
      }
    }
    return true;
  });
  
  const pastEvents = events.filter(e => {
    if (e.status === 'cancelled') return false;
    if (e.dateTime >= Date.now() && e.status !== 'completed') return false;
    if (user && user.role === 'General Member') {
      if (e.targetAreas && e.targetAreas.length > 0) {
        return !!(user.area && e.targetAreas.includes(user.area));
      }
    }
    return true;
  });

  const filteredEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Events" 
        rightIcon={canManageEvents ? "add-circle" : undefined}
        onRightPress={canManageEvents ? () => router.push('/(admin)/events/create') : undefined}
      />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => setActiveTab('upcoming')}
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming ({upcomingEvents.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => setActiveTab('past')}
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past Events ({pastEvents.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        onScroll={handleScroll}
        scrollEventThrottle={16}
        data={filteredEvents}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <EventCardItem
            item={item}
            canManageEvents={canManageEvents}
            formatEventDate={formatEventDate}
            router={router}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[Colors.light.accent]}
            tintColor={Colors.light.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="flag-outline" size={48} color={Colors.light.textLight} />
            <Text style={styles.emptyText}>No events found in this section.</Text>
            {canManageEvents && activeTab === 'upcoming' && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/(admin)/events/create')}
                style={styles.emptyButton}
              >
                <Text style={styles.emptyButtonText}>Create New Event</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  tabText: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  eventCard: {
    padding: 0, // No padding on the outer card to allow full-bleed image
    marginBottom: Spacing.lg,
  },
  bannerImage: {
    width: cardWidth,
    height: 180,
    backgroundColor: Colors.light.surfaceDarker,
  },
  carouselWrapper: {
    width: '100%',
    height: 180,
    overflow: 'hidden',
    position: 'relative',
  },
  carouselContainer: {
    width: '100%',
    height: 180,
  },
  carouselBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 5,
  },
  carouselBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  paginationDotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 5,
  },
  paginationDot: {
    height: 6,
    borderRadius: 3,
  },
  activePaginationDot: {
    width: 16,
    backgroundColor: '#FFFFFF',
  },
  inactivePaginationDot: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  placeholderBanner: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.light.surfaceDarker,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: Spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  eventTitle: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.light.primary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  statusBadge: {
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  infoText: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    marginLeft: Spacing.sm,
  },
  description: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  adminFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.surfaceDarker,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  attendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.accentLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  attendanceButtonText: {
    ...Typography.bodySmall,
    color: Colors.light.accent,
    fontWeight: '700',
    marginLeft: Spacing.xs,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceDarker,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  editButtonText: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    fontWeight: '700',
    marginLeft: Spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl + Spacing.xl,
  },
  emptyText: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  emptyButton: {
    backgroundColor: Colors.light.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  emptyButtonText: {
    ...Typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
