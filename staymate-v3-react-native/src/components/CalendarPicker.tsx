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
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(value || formatISO(new Date()));
  const [viewMode, setViewMode] = useState<'calendar' | 'year' | 'month'>('calendar');

  useEffect(() => {
    if (value) {
      const d = parseDate(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelectedDate(value);
    }
  }, [value]);

  function formatISO(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const iso = `${viewYear}-${mStr}-${dStr}`;
    setSelectedDate(iso);
  };

  const handleSelectYear = (yr: number) => {
    setViewYear(yr);
    // After selecting year, smoothly prompt to select month
    setViewMode('month');
  };

  const handleSelectMonth = (mIndex: number) => {
    setViewMonth(mIndex);
    // Update selected date with new month & year while preserving or adjusting day
    const maxDays = new Date(viewYear, mIndex + 1, 0).getDate();
    const currentDay = Number(selectedDate.split('-')[2]) || 1;
    const adjustedDay = Math.min(currentDay, maxDays);
    const mStr = String(mIndex + 1).padStart(2, '0');
    const dStr = String(adjustedDay).padStart(2, '0');
    setSelectedDate(`${viewYear}-${mStr}-${dStr}`);
    // Transition back to calendar view
    setViewMode('calendar');
  };

  const handleConfirm = () => {
    onChange(selectedDate);
    setModalVisible(false);
    setViewMode('calendar');
  };

  const handlePreset = (daysOffset: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    const iso = formatISO(target);
    setSelectedDate(iso);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    onChange(iso);
    setModalVisible(false);
    setViewMode('calendar');
  };

  // Calendar math
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const todayISO = formatISO(new Date());

  // Generate years list (1940 to 2035)
  const currentYear = new Date().getFullYear();
  const yearsList = mode === 'dob'
    ? Array.from({length: 85}, (_, i) => currentYear - i) // 2026 down to 1941
    : Array.from({length: 15}, (_, i) => currentYear - 2 + i); // 2024 to 2038

  return (
    <View style={{marginBottom: 14}}>
      {label && <Text style={s.fieldLabel}>{label}</Text>}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          setViewMode('calendar');
          setModalVisible(true);
        }}
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

            {/* Header */}
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>{label || 'Select Date'}</Text>
                <Text style={s.sheetSubtitle}>
                  {formatDisplay(selectedDate)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setViewMode('calendar');
                }}
                style={s.closeBtn}
                activeOpacity={0.7}
              >
                <Icon name="x" size={18} color={C.ink} />
              </TouchableOpacity>
            </View>

            {/* Quick Presets for Stay dates */}
            {mode === 'stay' && viewMode === 'calendar' && (
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

            {/* Quick Mode Switcher Tabs */}
            <View style={s.navBar}>
              <View style={s.tabsGroup}>
                <TouchableOpacity
                  onPress={() => setViewMode(viewMode === 'month' ? 'calendar' : 'month')}
                  style={[s.tabPill, viewMode === 'month' && s.tabPillActive]}
                  activeOpacity={0.75}
                >
                  <Text style={[s.tabPillText, viewMode === 'month' && s.tabPillTextActive]}>
                    {MONTHS[viewMonth]}
                  </Text>
                  <Icon name="chevronDown" size={12} color={viewMode === 'month' ? '#ffffff' : C.ink} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setViewMode(viewMode === 'year' ? 'calendar' : 'year')}
                  style={[s.tabPill, viewMode === 'year' && s.tabPillActive]}
                  activeOpacity={0.75}
                >
                  <Text style={[s.tabPillText, viewMode === 'year' && s.tabPillTextActive]}>
                    {viewYear}
                  </Text>
                  <Icon name="chevronDown" size={12} color={viewMode === 'year' ? '#ffffff' : C.ink} />
                </TouchableOpacity>
              </View>

              {viewMode === 'calendar' && (
                <View style={{flexDirection: 'row', gap: 6}}>
                  <TouchableOpacity onPress={handlePrevMonth} style={s.navArrow} activeOpacity={0.75}>
                    <Icon name="chevronLeft" size={16} color={C.ink} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleNextMonth} style={s.navArrow} activeOpacity={0.75}>
                    <Icon name="chevronRight" size={16} color={C.ink} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* VIEW 1: YEAR SELECTOR */}
            {viewMode === 'year' && (
              <View style={s.pickerContainer}>
                <View style={s.pickerHeader}>
                  <Text style={s.pickerHeaderTitle}>1. SELECT YEAR</Text>
                  <Text style={s.pickerHeaderSub}>Tap a year to choose month next</Text>
                </View>
                <ScrollView
                  style={{maxHeight: 220}}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={s.yearsGrid}
                >
                  {yearsList.map((yr) => {
                    const active = viewYear === yr;
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

            {/* VIEW 2: MONTH SELECTOR */}
            {viewMode === 'month' && (
              <View style={s.pickerContainer}>
                <View style={s.pickerHeader}>
                  <Text style={s.pickerHeaderTitle}>2. SELECT MONTH ({viewYear})</Text>
                  <Text style={s.pickerHeaderSub}>Choose month for {viewYear}</Text>
                </View>
                <View style={s.monthsGrid}>
                  {MONTHS.map((mName, idx) => {
                    const active = viewMonth === idx;
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

            {/* VIEW 3: CALENDAR DAYS GRID */}
            {viewMode === 'calendar' && (
              <View>
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
                    const mStr = String(viewMonth + 1).padStart(2, '0');
                    const dStr = String(day).padStart(2, '0');
                    const currentISO = `${viewYear}-${mStr}-${dStr}`;
                    const isSelected = selectedDate === currentISO;
                    const isToday = todayISO === currentISO;

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
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setViewMode('calendar');
                }}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 6,
  },
  tabsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
  },
  tabPillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  tabPillText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  tabPillTextActive: {
    color: '#ffffff',
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
  pickerContainer: {
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginVertical: 6,
  },
  pickerHeader: {
    marginBottom: 10,
  },
  pickerHeaderTitle: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  pickerHeaderSub: {
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
    paddingHorizontal: 15,
    paddingVertical: 9,
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCardActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  monthCardShort: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  monthCardShortActive: {
    color: '#ffffff',
  },
  monthCardFull: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  monthCardFullActive: {
    color: '#94A3B8',
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
    marginTop: 18,
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
