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
  
  // Single flow: 1 (Year) -> 2 (Month) -> 3 (Date/Calendar)
  const [flowStep, setFlowStep] = useState<1 | 2 | 3>(mode === 'dob' ? 1 : 3);

  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      setSelectedYear(y);
      setSelectedMonth(m - 1);
      setSelectedDay(d);
    }
  }, [value]);

  const handleOpenModal = () => {
    // For DOB, start right at Year selection flow
    // For stay (checkin/checkout), start at Calendar (Step 3)
    setFlowStep(mode === 'dob' ? 1 : 3);
    setModalVisible(true);
  };

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

  // STEP 1: Year Selected -> Auto go to Step 2 (Month)
  const handleSelectYear = (yr: number) => {
    setSelectedYear(yr);
    setFlowStep(2);
  };

  // STEP 2: Month Selected -> Auto go to Step 3 (Date)
  const handleSelectMonth = (mIndex: number) => {
    setSelectedMonth(mIndex);
    // adjust day if exceeds new month max days
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
  };

  // Calendar calculations
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 is Sunday
  const today = new Date();
  const isCurrentMonthToday = today.getFullYear() === selectedYear && today.getMonth() === selectedMonth;

  // Years range
  const currentYear = new Date().getFullYear();
  const yearsList = mode === 'dob'
    ? Array.from({length: 85}, (_, i) => currentYear - i) // 2026 down to 1941
    : Array.from({length: 15}, (_, i) => currentYear - 1 + i); // 2025 to 2039

  const currentFormattedDate = formatISO(selectedYear, selectedMonth, selectedDay);

  return (
    <View style={{marginBottom: 14}}>
      {label && <Text style={s.fieldLabel}>{label}</Text>}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleOpenModal}
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

      {/* Calendar Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={s.scrim}>
          <View style={s.sheet}>
            {/* Sheet Handle */}
            <View style={s.handleRow}>
              <View style={s.handle} />
            </View>

            {/* Header with Title & Formatted Preview */}
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>{label || 'Select Date'}</Text>
                <Text style={s.sheetSubtitle}>
                  {formatDisplay(currentFormattedDate)}
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

            {/* 1-Flow Progress Breadcrumbs */}
            <View style={s.stepperRow}>
              {/* Step 1: Year */}
              <TouchableOpacity
                onPress={() => setFlowStep(1)}
                activeOpacity={0.75}
                style={[
                  s.stepPill,
                  flowStep === 1 && s.stepPillActive,
                  flowStep > 1 && s.stepPillCompleted,
                ]}
              >
                <Text style={[s.stepPillNum, flowStep === 1 && s.stepPillNumActive]}>1</Text>
                <Text style={[s.stepPillText, flowStep === 1 && s.stepPillTextActive]}>
                  {selectedYear}
                </Text>
              </TouchableOpacity>

              <Icon name="chevronRight" size={13} color="#94A3B8" />

              {/* Step 2: Month */}
              <TouchableOpacity
                onPress={() => setFlowStep(2)}
                activeOpacity={0.75}
                style={[
                  s.stepPill,
                  flowStep === 2 && s.stepPillActive,
                  flowStep > 2 && s.stepPillCompleted,
                ]}
              >
                <Text style={[s.stepPillNum, flowStep === 2 && s.stepPillNumActive]}>2</Text>
                <Text style={[s.stepPillText, flowStep === 2 && s.stepPillTextActive]}>
                  {SHORT_MONTHS[selectedMonth]}
                </Text>
              </TouchableOpacity>

              <Icon name="chevronRight" size={13} color="#94A3B8" />

              {/* Step 3: Date */}
              <TouchableOpacity
                onPress={() => setFlowStep(3)}
                activeOpacity={0.75}
                style={[
                  s.stepPill,
                  flowStep === 3 && s.stepPillActive,
                ]}
              >
                <Text style={[s.stepPillNum, flowStep === 3 && s.stepPillNumActive]}>3</Text>
                <Text style={[s.stepPillText, flowStep === 3 && s.stepPillTextActive]}>
                  Day {selectedDay}
                </Text>
              </TouchableOpacity>
            </View>

            {/* QUICK PRESETS for Stay mode when on Step 3 */}
            {mode === 'stay' && flowStep === 3 && (
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

            {/* ============================================================ */}
            {/* FLOW STEP 1: SELECT YEAR                                     */}
            {/* ============================================================ */}
            {flowStep === 1 && (
              <View style={s.stepContainer}>
                <View style={s.stepBanner}>
                  <Text style={s.stepBannerTitle}>STEP 1: SELECT YEAR</Text>
                  <Text style={s.stepBannerSub}>Tap your birth year or target year</Text>
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
                        style={[s.yearChip, active && s.yearChipActive]}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.yearChipText, active && s.yearChipTextActive]}>
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
                  <Text style={s.stepBannerTitle}>STEP 2: SELECT MONTH IN {selectedYear}</Text>
                  <Text style={s.stepBannerSub}>Choose birth month or check-in month</Text>
                </View>
                <View style={s.monthsGrid}>
                  {MONTHS.map((mName, idx) => {
                    const active = selectedMonth === idx;
                    return (
                      <TouchableOpacity
                        key={mName}
                        onPress={() => handleSelectMonth(idx)}
                        style={[s.monthCard, active && s.monthCardActive]}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.monthCardShort, active && s.monthCardShortActive]}>
                          {SHORT_MONTHS[idx]}
                        </Text>
                        <Text style={[s.monthCardFull, active && s.monthCardFullActive]}>
                          {mName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ============================================================ */}
            {/* FLOW STEP 3: SELECT DATE (CALENDAR GRID)                     */}
            {/* ============================================================ */}
            {flowStep === 3 && (
              <View style={s.stepContainer}>
                {/* Month/Year Navigation Bar */}
                <View style={s.monthNavRow}>
                  <TouchableOpacity
                    onPress={() => setFlowStep(1)}
                    style={s.monthYearBtn}
                    activeOpacity={0.75}
                  >
                    <Text style={s.monthYearText}>
                      {MONTHS[selectedMonth]} {selectedYear}
                    </Text>
                    <Icon name="edit" size={13} color={C.primary} />
                  </TouchableOpacity>

                  <View style={{flexDirection: 'row', gap: 6}}>
                    <TouchableOpacity onPress={handlePrevMonth} style={s.navArrow} activeOpacity={0.75}>
                      <Icon name="chevronLeft" size={16} color={C.ink} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleNextMonth} style={s.navArrow} activeOpacity={0.75}>
                      <Icon name="chevronRight" size={16} color={C.ink} />
                    </TouchableOpacity>
                  </View>
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
                  {/* Empty slots */}
                  {Array.from({length: firstDayIndex}).map((_, i) => (
                    <View key={`empty-${i}`} style={s.dayCell} />
                  ))}

                  {/* Days */}
                  {Array.from({length: daysInMonth}).map((_, i) => {
                    const day = i + 1;
                    const isSelected = selectedDay === day;
                    const isToday = isCurrentMonthToday && today.getDate() === day;

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
            )}

            {/* Bottom Actions */}
            <View style={s.actionRow}>
              {flowStep > 1 ? (
                <TouchableOpacity
                  onPress={() => setFlowStep((flowStep - 1) as 1 | 2 | 3)}
                  style={s.cancelBtn}
                  activeOpacity={0.75}
                >
                  <Text style={s.cancelBtnText}>← Previous</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={s.cancelBtn}
                  activeOpacity={0.75}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              )}

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
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  stepPillActive: {
    backgroundColor: '#111827',
  },
  stepPillCompleted: {
    backgroundColor: '#EDE9FE',
  },
  stepPillNum: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  stepPillNumActive: {
    color: '#ffffff',
  },
  stepPillText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  stepPillTextActive: {
    color: '#ffffff',
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
    paddingVertical: 6,
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
    justifyContent: 'center',
  },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
  },
  yearChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  yearChipText: {
    fontFamily: 'Inter',
    fontSize: 14,
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
  },
  monthYearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  weekDayText: {
    width: 40,
    textAlign: 'center',
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  dayCell: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 20,
  },
  dayCellSelected: {
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
    bottom: 4,
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
