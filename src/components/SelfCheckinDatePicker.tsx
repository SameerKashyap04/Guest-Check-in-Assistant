import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Calendar, ChevronLeft, ChevronRight, X, Check } from 'lucide-react-native';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export interface SelfCheckinDatePickerProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  mode?: 'stay' | 'dob';
  placeholder?: string;
  minDate?: string;
  disabled?: boolean;
}

export function SelfCheckinDatePicker({
  label,
  value,
  onChange,
  mode = 'stay',
  placeholder = 'Select Date',
  minDate,
  disabled = false,
}: SelfCheckinDatePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'year'>('calendar');

  const today = new Date();

  const parseDate = (val: string) => {
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    if (mode === 'dob') {
      return new Date(2000, 0, 1);
    }
    return new Date();
  };

  const initial = parseDate(value);
  const [selectedYear, setSelectedYear] = useState<number>(initial.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(initial.getMonth());
  const [selectedDay, setSelectedDay] = useState<number>(initial.getDate());

  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      setSelectedYear(y);
      setSelectedMonth(m - 1);
      setSelectedDay(d);
    }
  }, [value]);

  const handleOpen = () => {
    if (disabled) return;
    if (!value && mode === 'dob') {
      setSelectedYear(2000);
      setSelectedMonth(0);
      setSelectedDay(1);
    }
    setViewMode('calendar');
    setModalVisible(true);
  };

  const formatISO = (y: number, m: number, d: number) => {
    const mStr = String(m + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    return `${y}-${mStr}-${dStr}`;
  };

  const formatDisplay = (val: string) => {
    if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return placeholder;
    }
    const [y, m, d] = val.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (isNaN(dateObj.getTime())) return placeholder;
    return dateObj.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    const iso = formatISO(selectedYear, selectedMonth, day);
    onChange(iso);
  };

  const handleConfirm = () => {
    const iso = formatISO(selectedYear, selectedMonth, selectedDay);
    onChange(iso);
    setModalVisible(false);
  };

  const handlePreset = (daysOffset: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    const y = target.getFullYear();
    const m = target.getMonth();
    const d = target.getDate();
    setSelectedYear(y);
    setSelectedMonth(m);
    setSelectedDay(d);
    onChange(formatISO(y, m, d));
    setModalVisible(false);
  };

  // Generate Year Range
  const currentYr = today.getFullYear();
  const yearsList = mode === 'dob'
    ? Array.from({ length: 85 }, (_, i) => currentYr - i) // 2026 down to 1941
    : Array.from({ length: 15 }, (_, i) => currentYr - 1 + i); // 2025 to 2039

  // Calendar Day Grid Computation
  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const prevMonthTotalDays = new Date(selectedYear, selectedMonth, 0).getDate();

  const calendarCells: { day: number; isCurrentMonth: boolean }[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    calendarCells.push({ day: prevMonthTotalDays - i, isCurrentMonth: false });
  }
  for (let i = 1; i <= totalDaysInMonth; i++) {
    calendarCells.push({ day: i, isCurrentMonth: true });
  }
  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({ day: i, isCurrentMonth: false });
  }

  const isSelectedDate = (day: number, isCurrent: boolean) => {
    if (!isCurrent) return false;
    return selectedDay === day;
  };

  const isTodayDate = (day: number, isCurrent: boolean) => {
    if (!isCurrent) return false;
    return (
      today.getDate() === day &&
      today.getMonth() === selectedMonth &&
      today.getFullYear() === selectedYear
    );
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        activeOpacity={0.75}
        onPress={handleOpen}
        style={[styles.trigger, disabled && styles.triggerDisabled]}
      >
        <Calendar size={18} color="#7C3AED" />
        <Text style={[styles.triggerText, !value && styles.triggerPlaceholder]}>
          {formatDisplay(value)}
        </Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent={true}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation?.()}
            style={styles.modalCard}
          >
            {/* Top Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{label || (mode === 'dob' ? 'Select Date of Birth' : 'Select Date')}</Text>
                <Text style={styles.modalSubtitle}>
                  {formatDisplay(formatISO(selectedYear, selectedMonth, selectedDay))}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Quick Presets for Stay */}
            {mode === 'stay' && (
              <View style={styles.presetsRow}>
                <TouchableOpacity style={styles.presetChip} onPress={() => handlePreset(0)}>
                  <Text style={styles.presetText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetChip} onPress={() => handlePreset(1)}>
                  <Text style={styles.presetText}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetChip} onPress={() => handlePreset(2)}>
                  <Text style={styles.presetText}>+2 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetChip} onPress={() => handlePreset(7)}>
                  <Text style={styles.presetText}>+1 Week</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Month & Year Navigation Bar */}
            <View style={styles.navBar}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                style={styles.navBtn}
                activeOpacity={0.7}
              >
                <ChevronLeft size={20} color="#0F172A" />
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  onPress={() => setViewMode(viewMode === 'year' ? 'calendar' : 'year')}
                  style={styles.monthYearBtn}
                >
                  <Text style={styles.monthYearText}>
                    {MONTHS[selectedMonth]} {selectedYear}
                  </Text>
                  <Text style={styles.toggleIndicator}>
                    {viewMode === 'year' ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleNextMonth}
                style={styles.navBtn}
                activeOpacity={0.7}
              >
                <ChevronRight size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Content: Year Picker or Calendar Grid */}
            {viewMode === 'year' ? (
              <View style={{ height: 260, paddingVertical: 6 }}>
                <Text style={styles.sectionHeading}>SELECT YEAR</Text>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.yearsGrid}
                >
                  {yearsList.map((yr) => {
                    const isSel = selectedYear === yr;
                    return (
                      <TouchableOpacity
                        key={yr}
                        onPress={() => {
                          setSelectedYear(yr);
                          setViewMode('calendar');
                        }}
                        style={[styles.yearItem, isSel && styles.yearItemActive]}
                      >
                        <Text style={[styles.yearItemText, isSel && styles.yearItemTextActive]}>
                          {yr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <View>
                {/* Weekday headers */}
                <View style={styles.weekdaysRow}>
                  {SHORT_DAYS.map((d, i) => (
                    <Text key={i} style={styles.weekdayText}>
                      {d}
                    </Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.daysGrid}>
                  {calendarCells.map((cell, idx) => {
                    const isSelected = isSelectedDate(cell.day, cell.isCurrentMonth);
                    const isToday = isTodayDate(cell.day, cell.isCurrentMonth);

                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.7}
                        disabled={!cell.isCurrentMonth}
                        onPress={() => handleSelectDay(cell.day)}
                        style={[
                          styles.dayCell,
                          isSelected && styles.dayCellSelected,
                          isToday && !isSelected && styles.dayCellToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            !cell.isCurrentMonth && styles.dayTextMuted,
                            isSelected && styles.dayTextSelected,
                            isToday && !isSelected && styles.dayTextToday,
                          ]}
                        >
                          {cell.day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Bottom Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleConfirm}
                style={styles.confirmBtn}
              >
                <Check size={16} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.confirmBtnText}>Confirm Date</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 2,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  triggerDisabled: {
    backgroundColor: '#F8FAFC',
    opacity: 0.7,
  },
  triggerText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  triggerPlaceholder: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any)
      : {}),
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#7C3AED',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    marginBottom: 4,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 7,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 10,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
  },
  monthYearText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#7C3AED',
  },
  toggleIndicator: {
    fontSize: 10,
    color: '#7C3AED',
  },
  sectionHeading: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingBottom: 10,
  },
  yearItem: {
    width: '22%',
    paddingVertical: 9,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearItemActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  yearItemText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  yearItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  weekdayText: {
    fontFamily: 'Inter',
    width: 38,
    textAlign: 'center',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 4,
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#7C3AED',
  },
  dayText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  dayTextMuted: {
    color: '#CBD5E1',
    fontWeight: '400',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayTextToday: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '600',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1.6,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  confirmBtnText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
