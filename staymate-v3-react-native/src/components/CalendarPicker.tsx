import React, {useState, useEffect, useRef} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import {C, R} from '../theme/tokens';
import {Icon} from './Icon';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const SHORT_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface CalendarPickerProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  mode?: 'stay' | 'dob';
  placeholder?: string;
  minDate?: string;
}

export function CalendarPicker({
  label,
  value,
  onChange,
  mode = 'stay',
  placeholder = 'YYYY-MM-DD',
  minDate,
}: CalendarPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const yearScrollRef = useRef<ScrollView>(null);

  // Parse current value or fallback to today
  const parseDate = (val: string) => {
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  };

  const parsed = parseDate(value);
  const [selectedYear, setSelectedYear] = useState(parsed.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(parsed.getMonth());
  const [selectedDay, setSelectedDay] = useState(parsed.getDate());

  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const d = parseDate(value);
      setSelectedYear(d.getFullYear());
      setSelectedMonth(d.getMonth());
      setSelectedDay(d.getDate());
    }
  }, [value]);

  function formatISO(y: number, m: number, d: number): string {
    const mStr = String(m + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    return `${y}-${mStr}-${dStr}`;
  }

  function formatDisplay(val: string): string {
    if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return placeholder;
    const [y, m, d] = val.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  const currentISO = formatISO(selectedYear, selectedMonth, selectedDay);

  // Generate years list
  const currentYear = new Date().getFullYear();
  const yearsList = mode === 'dob'
    ? Array.from({length: 85}, (_, i) => currentYear - i) // 2026 down to 1942
    : Array.from({length: 12}, (_, i) => currentYear - 1 + i); // 2025 to 2036

  // Scroll to active year when modal opens
  useEffect(() => {
    if (modalVisible) {
      const idx = yearsList.indexOf(selectedYear);
      if (idx >= 0 && yearScrollRef.current) {
        setTimeout(() => {
          yearScrollRef.current?.scrollTo({x: Math.max(0, idx * 68 - 120), animated: true});
        }, 150);
      }
    }
  }, [modalVisible, selectedYear]);

  // Calendar math
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 is Sunday
  const todayISO = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
  };

  const handleSelectMonth = (mIdx: number) => {
    setSelectedMonth(mIdx);
    const maxDays = new Date(selectedYear, mIdx + 1, 0).getDate();
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays);
    }
  };

  const handleSelectYear = (yr: number) => {
    setSelectedYear(yr);
    const maxDays = new Date(yr, selectedMonth + 1, 0).getDate();
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays);
    }
  };

  const handleConfirm = () => {
    const finalISO = formatISO(selectedYear, selectedMonth, selectedDay);
    onChange(finalISO);
    setModalVisible(false);
  };

  const handlePreset = (daysOffset: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    setSelectedYear(target.getFullYear());
    setSelectedMonth(target.getMonth());
    setSelectedDay(target.getDate());
    const iso = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    onChange(iso);
    setModalVisible(false);
  };

  return (
    <View style={{marginBottom: 14}}>
      {label && <Text style={s.fieldLabel}>{label}</Text>}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
        style={s.fieldTrigger}
      >
        <View style={s.triggerLeft}>
          <Icon name="calendar" size={17} color={C.primary} />
          <Text style={[s.triggerText, !value && s.triggerPlaceholder]}>
            {formatDisplay(value)}
          </Text>
        </View>
        <Text style={s.isoBadge}>{value || 'Select'}</Text>
      </TouchableOpacity>

      {/* Single-Flow Unified Calendar Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={s.scrim}>
          <View style={s.sheet}>
            {/* Sheet Handle */}
            <View style={s.handleRow}>
              <View style={s.handle} />
            </View>

            {/* Header with Live Date Preview */}
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>{label || 'Select Date'}</Text>
                <Text style={s.sheetSubtitle}>
                  {formatDisplay(currentISO)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={s.closeBtn}
                activeOpacity={0.7}
              >
                <Icon name="x" size={18} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{maxHeight: 520}}>
              {/* Quick Presets for Stays */}
              {mode === 'stay' && (
                <View style={s.presetRow}>
                  <TouchableOpacity onPress={() => handlePreset(0)} style={s.presetBtn} activeOpacity={0.75}>
                    <Text style={s.presetText}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handlePreset(1)} style={s.presetBtn} activeOpacity={0.75}>
                    <Text style={s.presetText}>Tomorrow</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handlePreset(2)} style={s.presetBtn} activeOpacity={0.75}>
                    <Text style={s.presetText}>+2 Nights</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handlePreset(7)} style={s.presetBtn} activeOpacity={0.75}>
                    <Text style={s.presetText}>+1 Week</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 1. YEAR SELECTOR (Horizontal Scroll Bar) */}
              <View style={s.sectionBlock}>
                <View style={s.sectionHeaderRow}>
                  <Text style={s.sectionSubLabel}>YEAR</Text>
                  <Text style={s.sectionValueBadge}>{selectedYear}</Text>
                </View>
                <ScrollView
                  ref={yearScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.yearsScroll}
                >
                  {yearsList.map((yr) => {
                    const active = selectedYear === yr;
                    return (
                      <TouchableOpacity
                        key={yr}
                        onPress={() => handleSelectYear(yr)}
                        activeOpacity={0.75}
                        style={[s.yearChip, active && s.yearChipActive]}
                      >
                        <Text style={[s.yearChipText, active && s.yearChipTextActive]}>
                          {yr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 2. MONTH SELECTOR (2 Rows of 6 Chips) */}
              <View style={s.sectionBlock}>
                <View style={s.sectionHeaderRow}>
                  <Text style={s.sectionSubLabel}>MONTH</Text>
                  <Text style={s.sectionValueBadge}>{MONTHS[selectedMonth]}</Text>
                </View>
                <View style={s.monthsGrid}>
                  {SHORT_MONTHS.map((mShort, idx) => {
                    const active = selectedMonth === idx;
                    return (
                      <TouchableOpacity
                        key={mShort}
                        onPress={() => handleSelectMonth(idx)}
                        activeOpacity={0.75}
                        style={[s.monthChip, active && s.monthChipActive]}
                      >
                        <Text style={[s.monthChipText, active && s.monthChipTextActive]}>
                          {mShort}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 3. DAY GRID (Live Calendar Days for Selected Year & Month) */}
              <View style={s.sectionBlock}>
                <View style={s.sectionHeaderRow}>
                  <Text style={s.sectionSubLabel}>DAY</Text>
                  <Text style={s.sectionValueBadge}>
                    Day {selectedDay} of {daysInMonth}
                  </Text>
                </View>

                {/* Weekdays Header */}
                <View style={s.weekDaysRow}>
                  {SHORT_DAYS.map((d, i) => (
                    <Text
                      key={d}
                      style={[
                        s.weekDayText,
                        (i === 0 || i === 6) && {color: '#94A3B8'},
                      ]}
                    >
                      {d}
                    </Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={s.daysGrid}>
                  {/* Empty slots for month start offset */}
                  {Array.from({length: firstDayIndex}).map((_, i) => (
                    <View key={`empty-${i}`} style={s.dayCell} />
                  ))}

                  {/* Month days */}
                  {Array.from({length: daysInMonth}).map((_, i) => {
                    const day = i + 1;
                    const isSelected = selectedDay === day;
                    const thisISO = formatISO(selectedYear, selectedMonth, day);
                    const isToday = todayISO === thisISO;

                    return (
                      <TouchableOpacity
                        key={day}
                        onPress={() => handleSelectDay(day)}
                        activeOpacity={0.7}
                        style={[
                          s.dayCell,
                          isSelected && s.dayCellSelected,
                        ]}
                      >
                        <Text
                          style={[
                            s.dayText,
                            isSelected && s.dayTextSelected,
                            isToday && !isSelected && s.dayTextToday,
                          ]}
                        >
                          {day}
                        </Text>
                        {isToday && !isSelected && <View style={s.todayDot} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={s.actionRow}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={s.cancelBtn}
                activeOpacity={0.75}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                style={s.confirmBtn}
                activeOpacity={0.85}
              >
                <Icon name="check" size={16} color="#ffffff" />
                <Text style={s.confirmBtnText}>Set Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#6a6a6a',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  fieldTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#ECEAF0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  triggerText: {
    fontFamily: 'Inter',
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  triggerPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  isoBadge: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '92%',
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 10,
  },
  sheetTitle: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 7,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  presetText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
  },
  sectionBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionSubLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  sectionValueBadge: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: C.primary,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  yearsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  yearChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  yearChipText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  yearChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  monthChip: {
    width: '15.2%',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  monthChipText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  monthChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  weekDayText: {
    width: 38,
    textAlign: 'center',
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  dayCell: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 19,
  },
  dayCellSelected: {
    backgroundColor: '#111827',
  },
  dayText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dayTextToday: {
    color: C.primary,
    fontWeight: '800',
  },
  todayDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.primary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
    elevation: 2,
  },
  confirmBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
