import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { C, R } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { ROOMS, STATUS_META, RoomStatus } from '../data';
import { RoomCard } from '../components/RoomCard';
import { Icon } from '../components/Icon';

export interface RoomItem {
  num: string;
  type: string;
  price: number;
  status: RoomStatus;
  capacity?: number;
  floor?: string;
}

export function RoomsScreen({
  rooms = ROOMS as any,
  onSelect,
  onAddRoom,
}: {
  rooms?: RoomItem[];
  onSelect?: (room: string) => void;
  onAddRoom?: () => void;
}) {
  const { isDark, colors } = useTheme();
  const [filter, setFilter] = useState<'all' | RoomStatus>('all');
  const [list, setList] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let result = filter === 'all' ? rooms : rooms.filter((r) => r.status === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (r) => r.num.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rooms, filter, query]);

  const counts = {
    all: rooms.length,
    available: rooms.filter((r) => r.status === 'available').length,
    occupied: rooms.filter((r) => r.status === 'occupied').length,
    cleaning: rooms.filter((r) => r.status === 'cleaning').length,
    maintenance: rooms.filter((r) => r.status === 'maintenance').length,
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 130 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.head}>
        <View>
          <Text style={[s.h1, { color: colors.ink }]}>Rooms</Text>
          <Text style={[s.sub, { color: colors.muted }]}>
            {rooms.length} rooms <Text style={{ color: colors.mutedSoft }}>•</Text>{' '}
            <Text style={{ color: '#059669', fontWeight: '600' }}>
              {counts.available} available now
            </Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setList(!list)}
            activeOpacity={0.8}
            style={[
              s.iconBtn,
              { backgroundColor: isDark ? '#27272A' : '#f2f2f2' },
            ]}
          >
            <Icon name={list ? 'grid' : 'list'} size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 5-Stat bar */}
      <View
        style={[
          s.stats,
          {
            backgroundColor: isDark ? '#18181B' : '#FAF8FD',
            borderColor: isDark ? '#27272A' : '#ECEAF0',
          },
        ]}
      >
        {(['all', 'available', 'occupied', 'cleaning', 'maintenance'] as const).map((k) => {
          const label =
            k === 'all' ? 'Total' : k === 'maintenance' ? 'Maint.' : STATUS_META[k].label;
          const isSelected = filter === k;
          return (
            <TouchableOpacity
              key={k}
              activeOpacity={0.7}
              onPress={() => setFilter(k)}
              style={[
                s.stat,
                isSelected && [
                  s.statActive,
                  { backgroundColor: isDark ? '#27272A' : '#ffffff' },
                ],
              ]}
            >
              <Text
                style={[
                  s.statNum,
                  { color: colors.ink },
                  k === 'available' && { color: '#059669' },
                  k === 'occupied' && { color: colors.primary },
                  k === 'cleaning' && { color: '#D97706' },
                  k === 'maintenance' && { color: '#DC2626' },
                ]}
              >
                {counts[k]}
              </Text>
              <Text
                style={[
                  s.statLabel,
                  { color: colors.muted },
                  isSelected && { fontWeight: '700', color: colors.ink },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipsRow}
      >
        {(['all', 'available', 'occupied', 'cleaning', 'maintenance'] as const).map((k) => (
          <TouchableOpacity
            key={k}
            activeOpacity={0.75}
            onPress={() => setFilter(k)}
            style={[
              s.chip,
              { backgroundColor: isDark ? '#27272A' : '#f2f2f2' },
              filter === k && { backgroundColor: isDark ? colors.primary : '#222222' },
            ]}
          >
            <Text
              style={[
                s.chipText,
                { color: colors.muted },
                filter === k && s.chipTextActive,
              ]}
            >
              {k === 'all' ? 'All Rooms' : STATUS_META[k].label}{' '}
              <Text style={{ opacity: 0.7 }}>({counts[k]})</Text>
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid or List */}
      {filtered.length === 0 ? (
        <View style={s.emptyState}>
          <Icon name="bed" size={32} color="#94A3B8" />
          <Text style={[s.emptyTitle, { color: colors.ink }]}>No rooms found</Text>
          <Text style={[s.emptySub, { color: colors.muted }]}>
            {query ? `No rooms matching "${query}"` : `No rooms currently in ${filter} status.`}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setFilter('all');
              setQuery('');
            }}
            style={[s.clearBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.75}
          >
            <Text style={s.clearBtnText}>Show All Rooms</Text>
          </TouchableOpacity>
        </View>
      ) : list ? (
        <View style={{ gap: 10, marginTop: 16 }}>
          {filtered.map((r) => (
            <TouchableOpacity
              key={r.num}
              onPress={() => onSelect?.(r.num)}
              activeOpacity={0.85}
              style={[
                s.listCard,
                {
                  backgroundColor: isDark ? '#18181B' : '#ffffff',
                  borderColor: isDark ? '#27272A' : '#ECEAF0',
                },
              ]}
            >
              <View
                style={[
                  s.listBed,
                  { backgroundColor: isDark ? '#2E1065' : '#F7F3FF' },
                ]}
              >
                <Icon name="bed" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={s.listCardTop}>
                  <Text style={[s.listNum, { color: colors.ink }]}>Room {r.num}</Text>
                  <StatusPill status={r.status} isDark={isDark} />
                </View>
                <Text style={[s.listMeta, { color: colors.muted }]}>
                  {r.type} · ₹{r.price.toLocaleString('en-IN')}/night
                  {r.floor ? ` · ${r.floor}` : ''}
                </Text>
              </View>
              <Icon name="chevronRight" size={16} color={colors.mutedSoft} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={s.grid}>
          {filtered.map((r) => (
            <View key={r.num} style={s.gridItem}>
              <RoomCard room={r} onPress={() => onSelect?.(r.num)} />
            </View>
          ))}
        </View>
      )}

      {/* Add room button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onAddRoom}
        style={[s.addBtn, { backgroundColor: colors.primary }]}
      >
        <Icon name="plus" size={19} color="#fff" />
        <Text style={s.addBtnText}>Add Room</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatusPill({ status, isDark }: { status: RoomStatus; isDark?: boolean }) {
  const m = STATUS_META[status];
  return (
    <View
      style={[
        s.statusPill,
        {
          backgroundColor: isDark ? m.color + '22' : m.bg,
          borderColor: isDark ? m.color + '88' : m.color,
        },
      ]}
    >
      <Icon name={status === 'available' ? 'check' : 'info'} size={10} color={m.color} />
      <Text style={[s.statusPillText, { color: m.color }]}>
        {status === 'maintenance' ? 'Maint.' : m.label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  h1: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  sub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    marginTop: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statActive: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statNum: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  statLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  chipsRow: {
    paddingTop: 14,
    paddingBottom: 2,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7.5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  gridItem: {
    width: '48.3%',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  listBed: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  listNum: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
  },
  listMeta: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '400',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.full,
    borderWidth: 1,
  },
  statusPillText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    textAlign: 'center',
    marginTop: 4,
  },
  clearBtn: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: R.full,
  },
  clearBtnText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    marginTop: 20,
  },
  addBtnText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
