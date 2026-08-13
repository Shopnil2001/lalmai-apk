import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Card from '../../components/Card';
import CustomHeader from '../../components/CustomHeader';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Colors, Shadows, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/dbService';
import { MemberAttendance, UserProfile } from '../../services/mockData';

const { width } = Dimensions.get('window');

const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AttendanceCalendar() {
  const router = useRouter();
  const { user, isSuperAdmin, hasPermission } = useAuth();
  const { userId } = useLocalSearchParams<{ userId?: string }>();

  // Navigation / Date states
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // Member selection states
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [membersList, setMembersList] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Data states
  const [attendanceRecords, setAttendanceRecords] = useState<MemberAttendance[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(getLocalDateString());
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Calendar Helper Info
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Access rights
  const canSearch = isSuperAdmin || hasPermission('viewAttendance');

  // Load initial member
  useEffect(() => {
    const initializeUser = async () => {
      if (user) {
        let targetUser = user;
        if (userId && userId !== user.uid) {
          try {
            const fetched = await dbService.getUsers();
            const found = fetched.find(u => u.uid === userId);
            if (found) {
              targetUser = found;
            }
          } catch (error) {
            console.error('Failed to find user profile for calendar inspect', error);
          }
        }
        setSelectedMember(targetUser);
        if (canSearch) {
          loadMembers();
        }
      }
    };
    initializeUser();
  }, [user, userId]);

  // Load attendance when selected member changes
  useEffect(() => {
    if (selectedMember) {
      fetchAttendanceData(selectedMember.uid);
    }
  }, [selectedMember, currentDate]);

  const loadMembers = async () => {
    setMembersLoading(true);
    try {
      const fetched = await dbService.getUsers();
      // Only show general members for directory check
      let filtered = fetched.filter(m => m.role === 'General Member');
      // If Admin, filter by assigned area
      if (user && user.role === 'Admin') {
        const assignedArea = user.assignedArea;
        const assignedAreas = user.assignedAreas || [];
        filtered = filtered.filter(
          m => m.area && (m.area === assignedArea || assignedAreas.includes(m.area))
        );
      }
      setMembersList(filtered);
    } catch (error) {
      console.error('Failed to load members for search', error);
    } finally {
      setMembersLoading(false);
    }
  };

  const fetchAttendanceData = async (memberId: string) => {
    setLoading(true);
    try {
      const records = await dbService.getMemberAttendance(memberId);
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Failed to fetch attendance logs', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAttendance = async () => {
    if (!selectedMember || !selectedDateStr || !user) return;
    try {
      setToggling(true);
      const isPresent = await dbService.toggleMemberAttendance(selectedMember.uid, selectedDateStr, user.uid);
      if (isPresent) {
        const record: MemberAttendance = {
          id: `${selectedMember.uid}_${selectedDateStr}`,
          userId: selectedMember.uid,
          dateStr: selectedDateStr,
          markedBy: user.uid,
          markedAt: Date.now()
        };
        setAttendanceRecords(prev => [...prev, record]);
      } else {
        setAttendanceRecords(prev => prev.filter(r => r.dateStr !== selectedDateStr));
      }
    } catch (error) {
      console.error('Failed to toggle attendance', error);
      Alert.alert('Error', 'Failed to update attendance status.');
    } finally {
      setToggling(false);
    }
  };

  // Autocomplete search filter
  const filteredSearchMembers = membersList.filter(m => {
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.area && m.area.toLowerCase().includes(q))
    );
  });

  // Calculate calendar days
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const calendarCells: { day: number | null; dateString: string | null }[] = [];

  // Fill empty spots for first week offset
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ day: null, dateString: null });
  }

  // Fill active days
  for (let d = 1; d <= totalDays; d++) {
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ day: d, dateString });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleDaySelect = (day: number | null, dateString: string | null) => {
    if (!day || !dateString) return;
    setSelectedDateStr(dateString);
  };

  // Find attendance record for selected date
  const selectedDayRecord = attendanceRecords.find(r => r.dateStr === selectedDateStr);

  const canEdit = isSuperAdmin || user?.role === 'Admin';

  return (
    <View style={styles.container}>
      <CustomHeader title="Attendance Calendar" showBack fallbackRoute="/(tabs)/fees" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Admin Member Directory Search */}
        {canSearch && (
          <Card style={styles.searchCard} elevation="sm">
            <Text style={styles.searchTitle}>Inspect Member Attendance</Text>
            <Input
              placeholder="Search by member name or area..."
              value={searchQuery}
              onChangeText={(txt) => {
                setSearchQuery(txt);
                setShowSearchResults(txt.trim().length > 0);
              }}
              leftIcon="search-outline"
              rightIcon={searchQuery ? "close-circle" : undefined}
              onRightIconPress={() => {
                setSearchQuery('');
                setShowSearchResults(false);
              }}
            />

            {showSearchResults && (
              <View style={styles.searchResultsDropdown}>
                {membersLoading ? (
                  <ActivityIndicator size="small" color={Colors.light.accent} style={styles.searchSpinner} />
                ) : filteredSearchMembers.length > 0 ? (
                  filteredSearchMembers.map(item => (
                    <TouchableOpacity
                      key={item.uid}
                      activeOpacity={0.7}
                      style={styles.searchItem}
                      onPress={() => {
                        setSelectedMember(item);
                        setSearchQuery('');
                        setShowSearchResults(false);
                      }}
                    >
                      <Ionicons name="person-circle" size={24} color={Colors.light.textSecondary} />
                      <View style={styles.searchItemDetails}>
                        <Text style={styles.searchItemName}>{item.name}</Text>
                        <Text style={styles.searchItemSub}>{item.area || 'No Resident Area'}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noSearchText}>No matching members found.</Text>
                )}
              </View>
            )}

            {/* Currently Selected User Details */}
            {selectedMember && (
              <View style={styles.activeUserContainer}>
                <Ionicons name="eye-outline" size={18} color={Colors.light.accent} />
                <Text style={styles.activeUserText}>
                  Viewing: <Text style={styles.boldText}>{selectedMember.name}</Text>
                  {selectedMember.area ? ` (${selectedMember.area})` : ''}
                </Text>
                {selectedMember.uid !== user?.uid && (
                  <TouchableOpacity
                    style={styles.resetBtn}
                    onPress={() => setSelectedMember(user)}
                  >
                    <Text style={styles.resetBtnText}>Reset to Me</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Card>
        )}

        {/* Legend Bar */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, styles.presentIndicator]} />
            <Text style={styles.legendLabel}>Present</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, styles.absentIndicator]} />
            <Text style={styles.legendLabel}>Not Marked</Text>
          </View>
        </View>

        {/* Custom Calendar Card */}
        <Card style={styles.calendarCard} elevation="md">
          {/* Calendar Header Month switcher */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowBtn}>
              <Ionicons name="chevron-back" size={20} color={Colors.light.primary} />
            </TouchableOpacity>
            
            <Text style={styles.monthLabel}>
              {monthNames[currentMonth]} {currentYear}
            </Text>

            <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn}>
              <Ionicons name="chevron-forward" size={20} color={Colors.light.primary} />
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View style={styles.daysOfWeekContainer}>
            {dayNames.map(dName => (
              <Text key={dName} style={styles.dayOfWeekText}>
                {dName}
              </Text>
            ))}
          </View>

          {/* Monthly Grid cells */}
          {loading ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color={Colors.light.accent} />
              <Text style={styles.loadingText}>Loading attendance logs...</Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {calendarCells.map((cell, idx) => {
                const isSelected = cell.dateString === selectedDateStr;
                const isHighlighted = cell.dateString && attendanceRecords.some(r => r.dateStr === cell.dateString);
                const isToday = cell.dateString === getLocalDateString();

                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={cell.day ? 0.7 : 1}
                    disabled={!cell.day}
                    onPress={() => handleDaySelect(cell.day, cell.dateString)}
                    style={[
                      styles.cell,
                      !cell.day && styles.emptyCell,
                      isSelected && styles.selectedCell,
                      isHighlighted && styles.presentCell,
                      isToday && styles.todayCell
                    ]}
                  >
                    {cell.day && (
                      <Text style={[
                        styles.dayText,
                        isHighlighted && styles.presentDayText,
                        isSelected && !isHighlighted && styles.selectedDayText,
                        isToday && !isHighlighted && styles.todayText
                      ]}>
                        {cell.day}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Card>

        {/* Selected Day Details Panel */}
        {selectedDateStr && (
          <Card style={styles.detailsDrawer} elevation="sm">
            <View style={styles.drawerHeader}>
              <Ionicons name="calendar-outline" size={20} color={Colors.light.accent} />
              <Text style={styles.drawerTitle}>
                Date: {new Date(selectedDateStr).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>
            <View style={styles.drawerDivider} />

            <View style={styles.statusDetailsRow}>
              <Text style={styles.statusLabel}>Status:</Text>
              <View style={[
                styles.statusBadge,
                selectedDayRecord ? styles.presentBadge : styles.absentBadge
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  selectedDayRecord ? styles.presentBadgeText : styles.absentBadgeText
                ]}>
                  {selectedDayRecord ? 'PRESENT' : 'NOT MARKED'}
                </Text>
              </View>
            </View>

            {selectedDayRecord && (
              <View style={styles.auditInfoContainer}>
                <Ionicons name="checkmark-circle-outline" size={16} color={Colors.light.success} />
                <Text style={styles.auditText}>
                  Marked present on {new Date(selectedDayRecord.markedAt).toLocaleString()}
                </Text>
              </View>
            )}

            {canEdit && selectedMember && (
              <Button
                title={selectedDayRecord ? "Remove Attendance" : "Mark Present"}
                variant={selectedDayRecord ? "outline" : "primary"}
                onPress={handleToggleAttendance}
                loading={toggling}
                style={styles.toggleBtn}
                leftIcon={selectedDayRecord ? "close-outline" : "checkmark-outline"}
              />
            )}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  searchCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
  },
  searchTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.light.primary,
    marginBottom: Spacing.sm,
  },
  searchResultsDropdown: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    backgroundColor: Colors.light.surface,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    zIndex: 10,
    ...Shadows.sm,
  },
  searchSpinner: {
    padding: Spacing.md,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.surfaceDarker,
  },
  searchItemDetails: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  searchItemName: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  searchItemSub: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  noSearchText: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    padding: Spacing.md,
  },
  activeUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    backgroundColor: Colors.light.accentLight,
    padding: Spacing.sm,
    borderRadius: 8,
  },
  activeUserText: {
    ...Typography.bodySmall,
    color: Colors.light.accent,
    marginLeft: Spacing.xs,
    flex: 1,
    fontWeight: '500',
  },
  boldText: {
    fontWeight: '700',
  },
  resetBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.accent,
    borderRadius: 6,
  },
  resetBtnText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.light.accent,
    fontSize: 10,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.light.surface,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  presentIndicator: {
    backgroundColor: '#0D9488',
  },
  absentIndicator: {
    backgroundColor: Colors.light.surfaceDarker,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  legendLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  calendarCard: {
    padding: Spacing.md,
    backgroundColor: Colors.light.surface,
    marginBottom: Spacing.md,
    borderRadius: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  arrowBtn: {
    padding: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.light.surfaceDarker,
  },
  monthLabel: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  daysOfWeekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dayOfWeekText: {
    width: width / 7 - 10,
    textAlign: 'center',
    ...Typography.bodySmall,
    fontWeight: '800',
    color: Colors.light.textLight,
  },
  loadingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  loadingText: {
    ...Typography.bodyMedium,
    color: Colors.light.textSecondary,
    marginTop: Spacing.sm,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  cell: {
    width: (width - Spacing.lg * 2 - Spacing.md * 2) / 7,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 999,
  },
  emptyCell: {
    backgroundColor: 'transparent',
  },
  selectedCell: {
    borderWidth: 1,
    borderColor: Colors.light.accent,
  },
  presentCell: {
    backgroundColor: '#0D9488', // Teal
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: Colors.light.primary,
  },
  dayText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: Colors.light.text,
  },
  presentDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  selectedDayText: {
    color: Colors.light.accent,
    fontWeight: '700',
  },
  todayText: {
    fontWeight: '800',
  },
  detailsDrawer: {
    padding: Spacing.lg,
    backgroundColor: Colors.light.surface,
    marginBottom: Spacing.xl,
    borderRadius: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerTitle: {
    ...Typography.bodyMedium,
    fontWeight: '800',
    color: Colors.light.primary,
    marginLeft: Spacing.sm,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: Spacing.md,
  },
  statusDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statusLabel: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginRight: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 8,
  },
  presentBadge: {
    backgroundColor: Colors.light.successLight,
  },
  absentBadge: {
    backgroundColor: Colors.light.surfaceDarker,
  },
  statusBadgeText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  presentBadgeText: {
    color: Colors.light.success,
  },
  absentBadgeText: {
    color: Colors.light.textLight,
  },
  auditInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surfaceDarker,
    padding: Spacing.sm,
    borderRadius: 8,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  auditText: {
    ...Typography.bodySmall,
    color: Colors.light.textSecondary,
    flex: 1,
  },
  toggleBtn: {
    marginTop: Spacing.xs,
  },
});
