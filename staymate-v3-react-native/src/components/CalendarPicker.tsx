import React, {useState, useEffect} from 'react';
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
import {useTheme} from '../theme/ThemeContext';
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
  const {isDark, colors} = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

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
  
  // Single flow: 1 (Year) -> 2 (Month) -> 3 (Date/Calendar Grid)
  // By default, always opens directly on the Calendar Grid (Step 3)
  const [flowStep, setFlowStep] = useState<1 | 2 | 3>(3);

  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      setSelectedYear(y);
      setSelectedMonth(m - 1);
      setSelectedDay(d);
    }
  }, [value]);

  const handleOpenModal = () => {
    setFlowStep(3);
    setModalVisible(true);
  };

  function formatISO(y: number, m: number, d: number): string {
    const mStr = String(m + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    return `${y}-${mStr}-${dStr}`;
  }

  function formatDisplay(val: string): string {
    if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return val || placeholder;
    const [y, m, d] = val.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (isNaN(dateObj.getTime())) return val || placeholder;
    return dateObj.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  // STEP 1: Year Selected -> Auto go to Step 2 (Month)
  const handleSelectYear = (yr: number) => {
    setSelectedYear(yr);
    setFlowStep(2);
  };

  // STEP 2: Month Selected -> Auto go to Step 3 (Calendar Grid)
  const handleSelectMonth = (mIndex: number) => {
    setSelectedMonth(mIndex);
    const maxDays = new Date(selectedYear, mIndex + 1, 0).getDate();
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays);
    }
    setFlowStep(3);
  };

  // STEP 3: Day Selected
  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    const iso = formatISO(selectedYear, selectedMonth, day);
    onChange(iso);
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

  const handleConfirm = () => {
    const iso = formatISO(selectedYear, selectedMonth, selectedDay);
    onChange(iso);
    setModalVisible(false);
    setFlowStep(3);
  };

  const handlePreset = (daysOffset: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    setSelectedYear(target.getFullYear());
    setSelectedMonth(target.getMonth());
    setSelectedDay(target.getDate());
    const iso = formatISO(target.getFullYear(), target.getMonth(), target.getDate());
    onChange(iso);
    setModalVisible(false);
    setFlowStep(3);
  };

  // Calendar calculations
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 is Sunday
  const today = new Date();
  const isCurrentMonthToday = today.getFullYear() === selectedYear && today.getMonth() === selectedMonth;

  // Years range (1940 to 2035)
  const currentYear = new Date().getFullYear();
  const yearsList = mode === 'dob'
    ? Array.from({length: 85}, (_, i) => currentYear - i) // 2026 down to 1941
    : Array.from({length: 15}, (_, i) => currentYear - 1 + i); // 2025 to 2039

  const currentFormattedDate = formatISO(selectedYear, selectedMonth, selectedDay);

  return (
    <View style={{marginBottom: 14}}>
      {label && <Text style={[s.fieldLabel, {color: colors.muted}]}>{label}</Text>}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleOpenModal}
        style={[
          s.fieldTrigger,
          isDark && {backgroundColor: colors.inputBg, borderColor: colors.inputBorder},
        ]}
      >
        <Text style={[s.triggerText, {color: colors.ink}, !value && s.triggerPlaceholder]} numberOfLines={1}>
          {formatDisplay(value)}
        </Text>
        <Icon name="calendar" size={15} color={colors.muted} />
      </TouchableOpacity>

      {/* Calendar Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={s.scrim}>
          <View style={[s.sheet, isDark && {backgroundColor: '#18181B'}]}>
            {/* Sheet Handle */}
            <View style={s.handleRow}>
              <View style={[s.handle, isDark && {backgroundColor: '#3F3F46'}]} />
            </View>

            {/* Header with Title & Formatted Preview */}
            <View style={[s.sheetHeader, isDark && {borderBottomColor: '#27272A'}]}>
              <View>
                <Text style={[s.sheetTitle, {color: colors.ink}]}>{label || 'Select Date'}</Text>
                <Text style={s.sheetSubtitle}>
                  {formatDisplay(currentFormattedDate)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setFlowStep(3);
                }}
                style={[s.closeBtn, isDark && {backgroundColor: '#27272A'}]}
                activeOpacity={0.7}
              >
                <Icon name="x" size={18} color={colors.ink} />
              </TouchableOpacity>
            </View>

            {/* QUICK PRESETS for Stay mode when on Step 3 */}
            {mode === 'stay' && flowStep === 3 && (
              <View style={s.presetRow}>
                {['Today', 'Tomorrow', '+2 Nights', '+1 Week'].map((label, idx) => {
                  const offsets = [0, 1, 2, 7];
                  return (
                    <TouchableOpacity
                      key={label}
                      onPress={() => handlePreset(offsets[idx])}
                      style={[s.presetBtn, isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'}]}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.presetText, isDark && {color: colors.ink}]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ============================================================ */}
            {/* FLOW STEP 1: SELECT YEAR                                     */}
            {/* ============================================================ */}
            {flowStep === 1 && (
              <View style={s.stepContainer}>
                <View style={s.stepBanner}>
                  <Text style={[s.stepBannerTitle, isDark && {color: colors.muted}]}>SELECT YEAR</Text>
                  <Text style={s.stepBannerSub}>Tap a year to choose month next</Text>
                </View>
                <ScrollView
                  style={{maxHeight: 240}}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={s.yearsGrid}
                >
                  {yearsList.map((yr) => {
                    const active = selectedYear === yr;
                    return (
                      <TouchableOpacity
                        key={yr}
                        onPress={() => handleSelectYear(yr)}
                        style={[
                          s.yearChip,
                          isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
                          active && (isDark ? {backgroundColor: colors.primary, borderColor: colors.primary} : s.yearChipActive),
                        ]}
                        activeOpacity={0.75}
                      >
                        <Text style={[
                          s.yearChipText,
                          isDark && {color: colors.ink},
                          active && (isDark ? {color: '#ffffff', fontWeight: '700'} : s.yearChipTextActive),
                        ]}>
                          {yr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ============================================================ */}
            {/* FLOW STEP 2: SELECT MONTH                                    */}
            {/* ============================================================ */}
            {flowStep === 2 && (
              <View style={s.stepContainer}>
                <View style={s.stepBanner}>
                  <Text style={[s.stepBannerTitle, isDark && {color: colors.muted}]}>SELECT MONTH IN {selectedYear}</Text>
                  <Text style={s.stepBannerSub}>Choose month to view calendar</Text>
                </View>
                <View style={s.monthsGrid}>
                  {MONTHS.map((mName, idx) => {
                    const active = selectedMonth === idx;
                    return (
                      <TouchableOpacity
                        key={mName}
                        onPress={() => handleSelectMonth(idx)}
                        style={[
                          s.monthCard,
                          isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'},
                          active && (isDark ? {backgroundColor: colors.primary, borderColor: colors.primary} : s.monthCardActive),
                        ]}
                        activeOpacity={0.75}
                      >
                        <Text style={[
                          s.monthCardShort,
                          isDark && {color: colors.ink},
                          active && (isDark ? {color: '#ffffff'} : s.monthCardShortActive),
                        ]}>
                          {SHORT_MONTHS[idx]}
                        </Text>
                        <Text style={[
                          s.monthCardFull,
                          isDark && {color: colors.muted},
                          active && (isDark ? {color: '#ffffff'} : s.monthCardFullActive),
                        ]}>
                          {mName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ============================================================ */}
            {/* FLOW STEP 3: SELECT DATE (7-COLUMN CALENDAR GRID - DEFAULT)  */}
            {/* ============================================================ */}
            {flowStep === 3 && (
              <View style={s.stepContainer}>
                {/* Month/Year Navigation Bar */}
                <View style={s.monthNavRow}>
                  <TouchableOpacity
                    onPress={() => setFlowStep(1)}
                    style={[s.monthYearBtn, isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'}]}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.monthYearText, isDark && {color: colors.ink}]}>
                      {MONTHS[selectedMonth]} {selectedYear}
                    </Text>
                    <Icon name="edit" size={13} color={colors.primary} />
                  </TouchableOpacity>

                  <View style={{flexDirection: 'row', gap: 6}}>
                    <TouchableOpacity onPress={handlePrevMonth} style={[s.navArrow, isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'}]} activeOpacity={0.75}>
                      <Icon name="chevronLeft" size={16} color={colors.ink} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleNextMonth} style={[s.navArrow, isDark && {backgroundColor: '#27272A', borderColor: '#3F3F46'}]} activeOpacity={0.75}>
                      <Icon name="chevronRight" size={16} color={colors.ink} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 7-Column Weekdays Header */}
                <View style={[s.weekDaysRow, isDark && {borderBottomColor: '#27272A'}]}>
                  {SHORT_DAYS.map((d, i) => (
                    <Text
                      key={d}
                      style={[
                        s.weekDayText,
                        isDark ? {color: colors.muted} : ((i === 0 || i === 6) && {color: '#94A3B8'}),
                      ]}
                    >
                      {d}
                    </Text>
                  ))}
                </View>

                {/* 7-Column Days Grid (Strictly 7 items per week row) */}
                <View style={s.daysGrid}>
                  {/* Empty slots for month start offset */}
                  {Array.from({length: firstDayIndex}).map((_, i) => (
                    <View key={`empty-${i}`} style={s.dayCell} />
                  ))}

                  {/* Month Days */}
                  {Array.from({length: daysInMonth}).map((_, i) => {
                    const day = i + 1;
                    const isSelected = selectedDay === day;
                    const isToday = isCurrentMonthToday && today.getDate() === day;

                    return (
                      <TouchableOpacity
                        key={day}
                        onPress={() => handleSelectDay(day)}
                        activeOpacity={0.7}
                        style={s.dayCell}
                      >
                        <View
                          style={[
                            s.dayCircle,
                            isSelected && (isDark ? {backgroundColor: colors.primary} : s.dayCircleSelected),
                          ]}
                        >
                          <Text
                            style={[
                              s.dayText,
                              isDark && {color: colors.ink},
                              isSelected && s.dayTextSelected,
                              isToday && !isSelected && s.dayTextToday,
                            ]}
                          >
                            {day}
                          </Text>
                          {isToday && !isSelected && <View style={s.todayDot} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Bottom Actions */}
            <View style={s.actionRow}>
              {flowStep === 3 && (
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                  }}
                  style={[s.cancelBtn, isDark && {backgroundColor: '#27272A'}]}
                  activeOpacity={0.75}
                >
                  <Text style={[s.cancelBtnText, isDark && {color: colors.muted}]}>Cancel</Text>
                </TouchableOpacity>
              )}

              {flowStep === 2 && (
                <TouchableOpacity
                  onPress={() => setFlowStep(1)}
                  style={[s.cancelBtn, isDark && {backgroundColor: '#27272A'}]}
                  activeOpacity={0.75}
                >
                  <Text style={[s.cancelBtnText, isDark && {color: colors.muted}]}>← Back to Year</Text>
                </TouchableOpacity>
              )}

              {flowStep === 1 && (
                <TouchableOpacity
                  onPress={() => setFlowStep(3)}
                  style={[s.cancelBtn, isDark && {backgroundColor: '#27272A'}]}
                  activeOpacity={0.75}
                >
                  <Text style={[s.cancelBtnText, isDark && {color: colors.muted}]}>← Back to Calendar</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleConfirm}
                style={[s.confirmBtn, {backgroundColor: colors.primary}]}
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
    paddingHorizontal: 12,
    height: 44,
  },
  triggerText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#222222',
    flex: 1,
  },
  triggerPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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
    paddingHorizontal: 4,
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
    marginBottom: 12,
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
  stepContainer: {
    paddingVertical: 4,
  },
  stepBanner: {
    marginBottom: 10,
  },
  stepBannerTitle: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  stepBannerSub: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  yearChip: {
    width: '23%',
    paddingVertical: 11,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  yearChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  yearChipText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
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
    gap: 8,
    justifyContent: 'space-between',
  },
  monthCard: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCardActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  monthCardShort: {
    fontFamily: 'Inter',
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  monthCardShortActive: {
    color: '#ffffff',
  },
  monthCardFull: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  monthCardFullActive: {
    color: '#CBD5E1',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  monthYearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
  },
  monthYearText: {
    fontFamily: 'Inter',
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  navArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDaysRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  weekDayText: {
    width: '14.285%',
    textAlign: 'center',
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 6,
  },
  dayCell: {
    width: '14.285%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: '#111827',
  },
  dayText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
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
    marginTop: 16,
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
