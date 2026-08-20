import React, {useMemo, useState} from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import {C, R} from '../theme/tokens';
import {ROOMS, STATUS_META, RoomStatus} from '../data';
import {RoomCard} from '../components/RoomCard';
import {Icon} from '../components/Icon';

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
      style={{flex: 1, backgroundColor: '#fff'}}
      contentContainerStyle={{paddingHorizontal: 20, paddingTop: 6, paddingBottom: 130}}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.head}>
        <View>
          <Text style={s.h1}>Rooms</Text>
          <Text style={s.sub}>
            {rooms.length} rooms <Text style={{color: '#B5BAC3'}}>•</Text>{' '}
            <Text style={{color: '#059669', fontWeight: '600'}}>
              {counts.available} available now
            </Text>
          </Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <TouchableOpacity
            onPress={() => setList(!list)}
            activeOpacity={0.8}
            style={s.iconBtn}
          >
            <Icon name={list ? 'grid' : 'list'} size={18} color={C.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 5-Stat bar — all numbers colored solid black #222222 */}
      <View style={s.stats}>
        {(['all', 'available', 'occupied', 'cleaning', 'maintenance'] as const).map((k) => {
          const label =
            k === 'all' ? 'Total' : k === 'maintenance' ? 'Maint.' : STATUS_META[k].label;
          const isSelected = filter === k;
          return (
            <TouchableOpacity
              key={k}
              activeOpacity={0.7}
              onPress={() => setFilter(k)}
              style={[s.stat, isSelected && s.statActive]}
            >
              <Text
                style={[
                  s.statNum,
                  k === 'available' && {color: '#059669'},
                  k === 'occupied' && {color: C.primary},
                  k === 'cleaning' && {color: '#D97706'},
                  k === 'maintenance' && {color: '#DC2626'},
                ]}
              >
                {counts[k]}
              </Text>
              <Text style={[s.statLabel, isSelected && {fontWeight: '700', color: C.ink}]}>
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
            style={[s.chip, filter === k && s.chipActive]}
          >
            <Text style={[s.chipText, filter === k && s.chipTextActive]}>
              {k === 'all' ? 'All Rooms' : STATUS_META[k].label}{' '}
              <Text style={{opacity: 0.7}}>({counts[k]})</Text>
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid or List */}
      {filtered.length === 0 ? (
        <View style={s.emptyState}>
          <Icon name="bed" size={32} color="#94A3B8" />
          <Text style={s.emptyTitle}>No rooms found</Text>
          <Text style={s.emptySub}>
            {query ? `No rooms matching "${query}"` : `No rooms currently in ${filter} status.`}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setFilter('all');
              setQuery('');
            }}
            style={s.clearBtn}
            activeOpacity={0.75}
          >
            <Text style={s.clearBtnText}>Show All Rooms</Text>
          </TouchableOpacity>
        </View>
      ) : list ? (
        <View style={{gap: 10, marginTop: 16}}>
          {filtered.map((r) => (
            <TouchableOpacity
              key={r.num}
              onPress={() => onSelect?.(r.num)}
              activeOpacity={0.85}
              style={s.listCard}
            >
              <View style={s.listBed}>
                <Icon name="bed" size={18} color={C.primary} />
              </View>
              <View style={{flex: 1, minWidth: 0}}>
                <View style={s.listCardTop}>
                  <Text style={s.listNum}>Room {r.num}</Text>
                  <StatusPill status={r.status} />
                </View>
                <Text style={s.listMeta}>
                  {r.type} · ₹{r.price.toLocaleString('en-IN')}/night
                  {r.floor ? ` · ${r.floor}` : ''}
                </Text>
              </View>
              <Icon name="chevronRight" size={16} color="#94A3B8" />
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
        style={s.addBtn}
      >
        <Icon name="plus" size={19} color="#fff" />
        <Text style={s.addBtnText}>Add Room</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatusPill({status}: {status: RoomStatus}) {
  const m = STATUS_META[status];
  return (
    <View style={[s.statusPill, {backgroundColor: m.bg, borderColor: m.color}]}>
      <Icon name={status === 'available' ? 'check' : 'info'} size={10} color={m.color} />
      <Text style={[s.statusPillText, {color: m.color}]}>
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
    color: '#222222',
  },
  sub: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    backgroundColor: '#FAF8FD',
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
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 1,
  },
  statNum: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '800',
    color: '#222222',
    lineHeight: 24,
  },
  statLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '500',
    color: '#6a6a6a',
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
    backgroundColor: '#f2f2f2',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#222222',
  },
  chipText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '500',
    color: '#6a6a6a',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ECEAF0',
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 1,
  },
  listBed: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F7F3FF',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
  },
  listMeta: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '400',
    color: '#6a6a6a',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  emptySub: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  clearBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
  },
  clearBtnText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: C.primary,
  },
  addBtn: {
    marginTop: 24,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#222222',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
  },
  addBtnText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
