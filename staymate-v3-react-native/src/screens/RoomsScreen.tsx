import React, {useMemo, useState} from 'react';
import {ScrollView, View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {C, R} from '../theme/tokens';
import {ROOMS, STATUS_META, RoomStatus} from '../data';
import {RoomCard} from '../components/RoomCard';
import {Icon} from '../components/Icon';

export function RoomsScreen({
  onSelect,
  onAddRoom,
}: {
  onSelect?: (room: string) => void;
  onAddRoom?: () => void;
}) {
  const [filter, setFilter] = useState<'all' | RoomStatus>('all');
  const [list, setList] = useState(false);

  const filtered = useMemo(
    () => (filter === 'all' ? ROOMS : ROOMS.filter((r) => r.status === filter)),
    [filter]
  );

  const counts = {
    all: ROOMS.length,
    available: ROOMS.filter((r) => r.status === 'available').length,
    occupied: ROOMS.filter((r) => r.status === 'occupied').length,
    cleaning: ROOMS.filter((r) => r.status === 'cleaning').length,
    maintenance: ROOMS.filter((r) => r.status === 'maintenance').length,
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
            {ROOMS.length} rooms <Text style={{color: '#B5BAC3'}}>•</Text> {counts.available} available now
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setList(!list)}
          activeOpacity={0.8}
          style={s.iconBtn}
        >
          <Icon name={list ? 'grid' : 'list'} size={18} color={C.ink}/>
        </TouchableOpacity>
      </View>

      {/* 5-Stat bar — all numbers colored solid black #222222 */}
      <View style={s.stats}>
        {(['all', 'available', 'occupied', 'cleaning', 'maintenance'] as const).map((k) => {
          const label =
            k === 'all' ? 'Total' : k === 'maintenance' ? 'Maint.' : STATUS_META[k].label;
          return (
            <TouchableOpacity
              key={k}
              activeOpacity={0.7}
              onPress={() => setFilter(k)}
              style={s.stat}
            >
              <Text style={s.statNum}>{counts[k]}</Text>
              <Text style={s.statLabel}>{label}</Text>
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
              {k === 'all' ? 'All' : STATUS_META[k].label}{' '}
              <Text style={{opacity: 0.7}}>{counts[k]}</Text>
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid or List */}
      {list ? (
        <View style={{gap: 10, marginTop: 16}}>
          {filtered.map((r) => (
            <TouchableOpacity
              key={r.num}
              onPress={() => onSelect?.(r.num)}
              activeOpacity={0.85}
              style={s.listCard}
            >
              <View style={s.listBed}>
                <Icon name="bed" size={18} color={C.primary}/>
              </View>
              <View style={{flex: 1, minWidth: 0}}>
                <View style={s.listCardTop}>
                  <Text style={s.listNum}>{r.num}</Text>
                  <StatusPill status={r.status}/>
                </View>
                <Text style={s.listMeta}>
                  {r.type} · ₹{r.price.toLocaleString('en-IN')}/night
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={s.grid}>
          {filtered.map((r) => (
            <View key={r.num} style={s.gridItem}>
              <RoomCard room={r} onPress={() => onSelect?.(r.num)}/>
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
        <Icon name="plus" size={19} color="#fff"/>
        <Text style={s.addBtnText}>Add room</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatusPill({status}: {status: RoomStatus}) {
  const m = STATUS_META[status];
  return (
    <View style={[s.statusPill, {backgroundColor: m.bg, borderColor: m.color}]}>
      <Icon name={status === 'available' ? 'check' : 'info'} size={10} color={m.color}/>
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
  },
  statNum: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 23,
    color: '#222222',
  },
  statLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#6a6a6a',
    marginTop: 4,
  },
  chipsRow: {
    gap: 8,
    marginTop: 14,
    paddingBottom: 2,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: '#dddddd',
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#222222',
    borderColor: '#222222',
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  chipText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#222222',
  },
  chipTextActive: {
    color: '#fff',
  },
  grid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  gridItem: {
    width: '48.2%',
  },
  listCard: {
    minHeight: 70,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECEAF0',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#241840',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 1,
  },
  listBed: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F7F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  listCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listNum: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '800',
    color: '#222222',
  },
  listMeta: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '400',
    color: '#6a6a6a',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.full,
    borderWidth: 1.2,
  },
  statusPillText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
  },
  addBtn: {
    height: 52,
    borderRadius: 16,
    marginTop: 18,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: C.primary,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 4,
  },
  addBtnText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
