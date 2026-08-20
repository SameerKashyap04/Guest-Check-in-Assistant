import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {C, R} from '../theme/tokens';
import {Icon} from './Icon';
import {ROOMS, STATUS_META} from '../data';

export function RoomCard({
  room,
  onPress,
  selected = false,
  compact = false,
}: {
  room: typeof ROOMS[number];
  onPress?: () => void;
  selected?: boolean;
  compact?: boolean;
}) {
  const m = STATUS_META[room.status];
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        s.card,
        compact && s.compact,
        selected && s.selected,
      ]}
    >
      {/* Top row */}
      <View style={s.top}>
        <View style={[s.bed, compact && s.bedCompact]}>
          <Icon name="bed" size={compact ? 16 : 18} color={C.primary}/>
        </View>
        <View
          style={[
            s.status,
            compact && s.statusCompact,
            {borderColor: m.color, backgroundColor: m.bg},
          ]}
        >
          <Icon
            name={room.status === 'available' ? 'check' : 'info'}
            size={compact ? 9 : 10}
            color={m.color}
          />
          <Text
            style={[
              s.statusText,
              compact && s.statusTextCompact,
              {color: m.color},
            ]}
          >
            {compact && room.status === 'maintenance' ? 'Maint.' : m.label}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={s.body}>
        <Text style={[s.num, compact && s.numCompact]}>{room.num}</Text>
        <Text style={[s.type, compact && s.typeCompact]}>{room.type}</Text>
        <Text style={[s.price, compact && s.priceCompact]}>
          ₹{room.price.toLocaleString('en-IN')}
          <Text style={[s.caption, compact && {fontSize: 10.5}]}> / night</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderWidth: 1.2,
    borderColor: '#ECEAF0',
    borderRadius: 22,
    padding: 14,
    minHeight: 144,
    justifyContent: 'space-between',
    shadowColor: '#241840',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  compact: {
    minHeight: 128,
    borderRadius: 20,
    padding: 12,
  },
  selected: {
    borderColor: C.primary,
    borderWidth: 2,
    shadowColor: C.primary,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bed: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F7F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bedCompact: {
    width: 28,
    height: 28,
    borderRadius: 9,
  },
  status: {
    borderWidth: 1.2,
    borderRadius: R.full,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    gap: 3,
  },
  statusText: {
    fontFamily: 'Inter',
    fontSize: 10.5,
    fontWeight: '700',
  },
  statusTextCompact: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  body: {
    marginTop: 10,
  },
  num: {
    fontFamily: 'Inter',
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: '#222222',
    lineHeight: 29,
  },
  numCompact: {
    fontSize: 23,
    lineHeight: 25,
  },
  type: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '500',
    color: '#929292',
    marginTop: 3,
  },
  typeCompact: {
    fontSize: 12,
    marginTop: 2,
  },
  price: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '800',
    color: '#222222',
    marginTop: 6,
  },
  priceCompact: {
    fontSize: 13.5,
    marginTop: 4,
  },
  caption: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    fontWeight: '400',
    color: '#929292',
  },
});
