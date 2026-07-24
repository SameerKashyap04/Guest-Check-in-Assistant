import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Calendar as CalendarIcon, X, Check } from 'lucide-react-native';
import { Input } from './Input';

interface DatePickerProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChangeText: (formattedDate: string) => void;
  placeholder?: string;
  error?: string;
  autoSelectToday?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ITEM_HEIGHT = 44;
const PADDING_VERTICAL = 81;

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChangeText,
  placeholder = 'YYYY-MM-DD',
  error,
  autoSelectToday = true,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const monthScrollRef = useRef<ScrollView>(null);
  const dayScrollRef = useRef<ScrollView>(null);
  const yearScrollRef = useRef<ScrollView>(null);

  const getTodayFormatted = () => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Auto-select today's date if value is empty and autoSelectToday is enabled
  useEffect(() => {
    if (autoSelectToday && (!value || value.trim() === '')) {
      onChangeText(getTodayFormatted());
    }
  }, []);

  const today = new Date();
  const parseDateValue = () => {
    if (value && value.length === 10) {
      const parts = value.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return { year: y, month: m, day: d };
      }
    }
    return { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };
  };

  const [selectedYear, setSelectedYear] = useState<number>(parseDateValue().year);
  const [selectedMonth, setSelectedMonth] = useState<number>(parseDateValue().month);
  const [selectedDay, setSelectedDay] = useState<number>(parseDateValue().day);

  useEffect(() => {
    const parsed = parseDateValue();
    setSelectedYear(parsed.year);
    setSelectedMonth(parsed.month);
    setSelectedDay(parsed.day);
  }, [value]);

  const handleOpenPicker = () => {
    if (!value || value.trim() === '') {
      const t = new Date();
      setSelectedYear(t.getFullYear());
      setSelectedMonth(t.getMonth());
      setSelectedDay(t.getDate());
      if (autoSelectToday) {
        onChangeText(getTodayFormatted());
      }
    }
    setModalVisible(true);
  };

  // Calculate days in selected month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const maxDays = getDaysInMonth(selectedYear, selectedMonth);
  const daysArray = Array.from({ length: maxDays }, (_, i) => i + 1);

  // Generate years range (1940 to 2035)
  const currentYear = today.getFullYear();
  const yearsArray = Array.from({ length: 96 }, (_, i) => currentYear + 10 - i);
  const yearIndex = yearsArray.indexOf(selectedYear);

  // Scroll all 3 columns to align selected items in the exact same horizontal row
  const scrollColumnsToSelection = () => {
    monthScrollRef.current?.scrollTo({ y: selectedMonth * ITEM_HEIGHT, animated: true });
    dayScrollRef.current?.scrollTo({ y: (selectedDay - 1) * ITEM_HEIGHT, animated: true });
    if (yearIndex >= 0) {
      yearScrollRef.current?.scrollTo({ y: yearIndex * ITEM_HEIGHT, animated: true });
    }
  };

  useEffect(() => {
    if (modalVisible) {
      const timer = setTimeout(scrollColumnsToSelection, 100);
      return () => clearTimeout(timer);
    }
  }, [modalVisible, selectedMonth, selectedDay, selectedYear]);

  const handleConfirm = () => {
    const mStr = String(selectedMonth + 1).padStart(2, '0');
    const dStr = String(Math.min(selectedDay, maxDays)).padStart(2, '0');
    const formatted = `${selectedYear}-${mStr}-${dStr}`;
    onChangeText(formatted);
    setModalVisible(false);
  };

  const handlePreset = (offsetDays: number) => {
    const target = new Date(Date.now() + offsetDays * 86400000);
    const y = target.getFullYear();
    const m = target.getMonth();
    const d = target.getDate();
    setSelectedYear(y);
    setSelectedMonth(m);
    setSelectedDay(d);
    const mStr = String(m + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    onChangeText(`${y}-${mStr}-${dStr}`);
    setModalVisible(false);
  };

  return (
    <View className="w-full">
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleOpenPicker}
      >
        <View pointerEvents="none">
          <Input
            label={label}
            value={value || getTodayFormatted()}
            onChangeText={onChangeText}
            placeholder={placeholder}
            error={error}
            editable={false}
            icon={<CalendarIcon size={18} color="#9498AA" />}
          />
        </View>
      </TouchableOpacity>

      {/* Sleek Universal JS Modal DatePicker */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{label || 'Select Date'}</Text>
                <Text style={styles.subtitle}>
                  {selectedDay} {MONTHS[selectedMonth]} {selectedYear}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <View style={styles.presetsRow}>
              <TouchableOpacity style={styles.presetChip} onPress={() => handlePreset(0)}>
                <Text style={styles.presetText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.presetChip} onPress={() => handlePreset(1)}>
                <Text style={styles.presetText}>Tomorrow</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.presetChip} onPress={() => handlePreset(7)}>
                <Text style={styles.presetText}>+1 Week</Text>
              </TouchableOpacity>
            </View>

            {/* Selectors Grid */}
            <View style={styles.pickerGridContainer}>
              <View style={styles.pickerGrid}>
                {/* MONTH COLUMN */}
                <View style={styles.column}>
                  <Text style={styles.colHeader}>Month</Text>
                  <ScrollView 
                    ref={monthScrollRef} 
                    style={styles.scrollCol} 
                    contentContainerStyle={{ paddingTop: PADDING_VERTICAL, paddingBottom: PADDING_VERTICAL }}
                    showsVerticalScrollIndicator={false}
                  >
                    {MONTHS.map((mName, idx) => (
                      <TouchableOpacity
                        key={mName}
                        style={[styles.itemPill, selectedMonth === idx && styles.itemPillSelected]}
                        onPress={() => setSelectedMonth(idx)}
                      >
                        <Text style={[styles.itemText, selectedMonth === idx && styles.itemTextSelected]}>
                          {mName.substring(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* DAY COLUMN */}
                <View style={styles.column}>
                  <Text style={styles.colHeader}>Day</Text>
                  <ScrollView 
                    ref={dayScrollRef} 
                    style={styles.scrollCol} 
                    contentContainerStyle={{ paddingTop: PADDING_VERTICAL, paddingBottom: PADDING_VERTICAL }}
                    showsVerticalScrollIndicator={false}
                  >
                    {daysArray.map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.itemPill, selectedDay === d && styles.itemPillSelected]}
                        onPress={() => setSelectedDay(d)}
                      >
                        <Text style={[styles.itemText, selectedDay === d && styles.itemTextSelected]}>
                          {d}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* YEAR COLUMN */}
                <View style={styles.column}>
                  <Text style={styles.colHeader}>Year</Text>
                  <ScrollView 
                    ref={yearScrollRef} 
                    style={styles.scrollCol} 
                    contentContainerStyle={{ paddingTop: PADDING_VERTICAL, paddingBottom: PADDING_VERTICAL }}
                    showsVerticalScrollIndicator={false}
                  >
                    {yearsArray.map((y) => (
                      <TouchableOpacity
                        key={y}
                        style={[styles.itemPill, selectedYear === y && styles.itemPillSelected]}
                        onPress={() => setSelectedYear(y)}
                      >
                        <Text style={[styles.itemText, selectedYear === y && styles.itemTextSelected]}>
                          {y}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Check size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.confirmBtnText}>Set Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  pickerGridContainer: {
    position: 'relative',
    height: 230,
    marginBottom: 20,
  },
  pickerGrid: {
    flexDirection: 'row',
    gap: 12,
    height: 230,
  },
  column: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    overflow: 'hidden',
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginVertical: 6,
    zIndex: 10,
  },
  scrollCol: {
    flex: 1,
    width: '100%',
  },
  itemPill: {
    width: '100%',
    height: ITEM_HEIGHT,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  itemPillSelected: {
    backgroundColor: '#000000',
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  itemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  confirmBtn: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
