import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  FlatList,
  ViewStyle,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Shadows } from '../constants/theme';

interface DateTimePickerProps {
  label: string;
  value: string; // YYYY-MM-DD for date, HH:MM for time
  onChange: (value: string) => void;
  type: 'date' | 'time';
  placeholder?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
}

export default function DateTimePicker({
  label,
  value,
  onChange,
  type,
  placeholder,
  leftIcon,
  containerStyle,
}: DateTimePickerProps) {
  const [showModal, setShowModal] = useState(false);
  const resolvedIcon = leftIcon ?? (type === 'date' ? 'calendar-outline' : 'time-outline');

  const displayValue = () => {
    if (!value) return placeholder ?? (type === 'date' ? 'Select Date' : 'Select Time');
    if (type === 'date') {
      // Format YYYY-MM-DD → "15 Jun 2026"
      const parts = value.split('-');
      if (parts.length === 3) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const m = parseInt(parts[1], 10) - 1;
        return `${parseInt(parts[2], 10)} ${months[m] ?? ''} ${parts[0]}`;
      }
    }
    if (type === 'time') {
      // Format HH:MM → "hh:mm AM/PM" (12-hour format)
      const parts = value.split(':');
      if (parts.length === 2) {
        let hour = parseInt(parts[0], 10);
        const min = parts[1];
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour ? hour : 12; // 0 should be 12
        const hourStr = String(hour).padStart(2, '0');
        return `${hourStr}:${min} ${ampm}`;
      }
    }
    return value;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>

      {/* Pressable is more reliable than TouchableOpacity inside ScrollView on Android */}
      <Pressable
        onPress={() => setShowModal(true)}
        style={({ pressed }) => [styles.pickerBox, pressed && styles.pickerBoxPressed]}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        <Ionicons name={resolvedIcon} size={20} color={Colors.light.textLight} style={styles.leftIcon} />
        <Text style={[styles.valueText, !value && styles.placeholderText]} numberOfLines={1}>
          {displayValue()}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Colors.light.textSecondary} />
      </Pressable>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowModal(false)}
      >
        {/* Tap outside to dismiss */}
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          {/* Stop press propagation so tapping inside doesn't close the modal */}
          <Pressable style={styles.modalContent} onPress={() => {}}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {type === 'date' ? 'Choose Date' : 'Choose Time'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={26} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            </View>

            {type === 'date' ? (
              <DatePickerContent
                value={value}
                onChange={(v) => {
                  onChange(v);
                  setShowModal(false);
                }}
              />
            ) : (
              <TimePickerContent
                value={value}
                onChange={(v) => {
                  onChange(v);
                  setShowModal(false);
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// DATE PICKER
// ─────────────────────────────────────────────────────────
function DatePickerContent({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = new Date();
  const safeDate = value ? new Date(value + 'T00:00:00') : today;
  const initial = isNaN(safeDate.getTime()) ? today : safeDate;

  const [currentYear, setCurrentYear] = useState(initial.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initial.getMonth());

  const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const selectDay = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${currentYear}-${mm}-${dd}`);
  };

  // Selected day highlight
  const selectedDay = (() => {
    if (!value) return null;
    const d = new Date(value + 'T00:00:00');
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) return d.getDate();
    return null;
  })();

  // Build grid cells (nulls = empty padding cells)
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  return (
    <View>
      {/* Month / Year navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={20} color={Colors.light.accent} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTHS[currentMonth]} {currentYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-forward" size={20} color={Colors.light.accent} />
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <Text key={d} style={styles.weekDayLabel}>{d}</Text>
        ))}
      </View>

      {/* Days grid */}
      <View style={styles.daysGrid}>
        {cells.map((day, idx) => {
          if (day === null) return <View key={`e-${idx}`} style={styles.dayCell} />;
          const isSelected = selectedDay === day;
          const isToday = today.getFullYear() === currentYear
            && today.getMonth() === currentMonth
            && today.getDate() === day;
          return (
            <TouchableOpacity
              key={`d-${day}`}
              onPress={() => selectDay(day)}
              activeOpacity={0.7}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                !isSelected && isToday && styles.dayCellToday,
              ]}
            >
              <Text style={[
                styles.dayCellText,
                isSelected && styles.dayCellTextSelected,
                !isSelected && isToday && styles.dayCellTextToday,
              ]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// TIME PICKER
// ─────────────────────────────────────────────────────────
function TimePickerContent({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const getInitialState = () => {
    if (!value) {
      return { hour: '09', minute: '00', ampm: 'AM' };
    }
    const [h, m] = value.split(':');
    const hNum = parseInt(h, 10);
    const ampmVal = hNum >= 12 ? 'PM' : 'AM';
    let dispH = hNum % 12;
    dispH = dispH === 0 ? 12 : dispH;
    return {
      hour: String(dispH).padStart(2, '0'),
      minute: m || '00',
      ampm: ampmVal
    };
  };

  const initialState = getInitialState();
  const [selHour, setSelHour] = useState(initialState.hour);
  const [selMin, setSelMin]   = useState(initialState.minute);
  const [selAmpm, setSelAmpm] = useState(initialState.ampm);

  const hours   = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  const ampms   = ['AM', 'PM'];

  const renderHour = ({ item }: { item: string }) => (
    <TouchableOpacity
      onPress={() => setSelHour(item)}
      activeOpacity={0.7}
      style={[styles.timeItem, selHour === item && styles.timeItemActive]}
    >
      <Text style={[styles.timeItemText, selHour === item && styles.timeItemTextActive]}>{item}</Text>
    </TouchableOpacity>
  );

  const renderMinute = ({ item }: { item: string }) => (
    <TouchableOpacity
      onPress={() => setSelMin(item)}
      activeOpacity={0.7}
      style={[styles.timeItem, selMin === item && styles.timeItemActive]}
    >
      <Text style={[styles.timeItemText, selMin === item && styles.timeItemTextActive]}>{item}</Text>
    </TouchableOpacity>
  );

  const handleConfirm = () => {
    let hNum = parseInt(selHour, 10);
    if (selAmpm === 'PM' && hNum !== 12) {
      hNum += 12;
    } else if (selAmpm === 'AM' && hNum === 12) {
      hNum = 0;
    }
    const hStr = String(hNum).padStart(2, '0');
    onChange(`${hStr}:${selMin}`);
  };

  return (
    <View>
      {/* Live preview */}
      <View style={styles.timePreview}>
        <Text style={styles.timePreviewText}>{selHour}:{selMin} {selAmpm}</Text>
      </View>

      <View style={styles.timeSelectorRow}>
        {/* Hours */}
        <View style={styles.timeColumn}>
          <Text style={styles.timeColumnTitle}>Hour</Text>
          <FlatList
            data={hours}
            keyExtractor={item => item}
            renderItem={renderHour}
            style={styles.timeScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            initialScrollIndex={Math.max(0, hours.indexOf(selHour))}
            getItemLayout={(_, index) => ({ length: 44, offset: 44 * index, index })}
          />
        </View>

        <Text style={styles.timeDivider}>:</Text>

        {/* Minutes */}
        <View style={styles.timeColumn}>
          <Text style={styles.timeColumnTitle}>Minute</Text>
          <FlatList
            data={minutes}
            keyExtractor={item => item}
            renderItem={renderMinute}
            style={styles.timeScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            initialScrollIndex={Math.max(0, minutes.indexOf(selMin))}
            getItemLayout={(_, index) => ({ length: 44, offset: 44 * index, index })}
          />
        </View>

        {/* AM/PM */}
        <View style={[styles.timeColumn, { marginLeft: Spacing.sm }]}>
          <Text style={styles.timeColumnTitle}>AM/PM</Text>
          <View style={styles.ampmColumnContainer}>
            {ampms.map(item => (
              <TouchableOpacity
                key={item}
                onPress={() => setSelAmpm(item)}
                activeOpacity={0.7}
                style={[
                  styles.ampmItem,
                  selAmpm === item && styles.ampmItemActive
                ]}
              >
                <Text style={[
                  styles.ampmItemText,
                  selAmpm === item && styles.ampmItemTextActive
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity onPress={handleConfirm} style={styles.confirmBtn} activeOpacity={0.85}>
        <Ionicons name="checkmark-circle" size={20} color="#FFF" />
        <Text style={styles.confirmBtnText}>Confirm  {selHour}:{selMin} {selAmpm}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────
const CELL_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.label,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
    paddingLeft: 2,
  },
  pickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: Spacing.md,
  },
  pickerBoxPressed: {
    backgroundColor: Colors.light.surfaceDarker,
    borderColor: Colors.light.accent,
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  valueText: {
    flex: 1,
    color: Colors.light.text,
    ...Typography.bodyMedium,
  },
  placeholderText: {
    color: Colors.light.textLight,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.light.primary,
    fontWeight: '800',
  },

  // Calendar
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  monthLabel: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  navBtn: {
    padding: 6,
    backgroundColor: Colors.light.surfaceDarker,
    borderRadius: 8,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  weekDayLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
    ...Typography.label,
    color: Colors.light.textLight,
    fontWeight: '700',
    fontSize: 11,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginBottom: 4,
  },
  dayCellSelected: {
    backgroundColor: Colors.light.accent,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: Colors.light.accent,
  },
  dayCellText: {
    ...Typography.bodyMedium,
    color: Colors.light.text,
  },
  dayCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayCellTextToday: {
    color: Colors.light.accent,
    fontWeight: '700',
  },

  // Time Picker
  timePreview: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    backgroundColor: Colors.light.surfaceDarker,
    borderRadius: 12,
    paddingVertical: Spacing.sm,
  },
  timePreviewText: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: 4,
  },
  timeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 220,
    marginBottom: Spacing.lg,
  },
  timeColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'stretch',
  },
  timeColumnTitle: {
    ...Typography.label,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  timeScroll: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    backgroundColor: Colors.light.surfaceDarker,
  },
  timeItem: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  timeItemActive: {
    backgroundColor: Colors.light.accent,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  timeItemText: {
    ...Typography.bodyMedium,
    color: Colors.light.text,
  },
  timeItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timeDivider: {
    ...Typography.h2,
    color: Colors.light.textSecondary,
    marginHorizontal: Spacing.sm,
    marginTop: 20,
  },
  confirmBtn: {
    backgroundColor: Colors.light.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  confirmBtnText: {
    ...Typography.bodyLarge,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ampmColumnContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    backgroundColor: Colors.light.surfaceDarker,
    justifyContent: 'center',
    padding: 6,
    gap: Spacing.sm,
  },
  ampmItem: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  ampmItemActive: {
    backgroundColor: Colors.light.accent,
  },
  ampmItemText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.light.text,
  },
  ampmItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
