import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  Image, StyleSheet, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search, ChevronLeft, ChevronRight, X, Phone,
  Edit, Check, Image as ImageIcon,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { openDatabase } from '@/database';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button } from '@/components/Button';
import { AIRBNB } from '@/theme/airbnb';

// ─── Airbnb Search Screen for StayMate ────────────────────────────────────────
// Direct port of openSearch() from staymate-airbnb-redesign/app.html
// ─────────────────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<any | null>(null);
  const router = useRouter();

  const handleSearch = async (searchTerm: string) => {
    setQuery(searchTerm);
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    try {
      const { propertyId } = useSettingsStore.getState();
      const activePropertyId = propertyId || 'HS-DEFAULT';
      const db = await openDatabase();
      const searchPattern = `%${searchTerm.trim()}%`;

      const searchResults = await db.getAllAsync(`
        SELECT g.*, r.room_number, r.room_type, s.check_in_date, s.check_out_date
        FROM guests g
        LEFT JOIN stays s ON s.guest_id = g.id
        LEFT JOIN rooms r ON r.id = s.room_id
        WHERE (g.property_id = ? OR g.property_id IS NULL OR g.property_id = '')
          AND (g.full_name LIKE ? OR g.phone LIKE ? OR g.id_number LIKE ? OR r.room_number LIKE ? OR g.address LIKE ?)
        ORDER BY g.id DESC
        LIMIT 25
      `, [activePropertyId, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern]);

      setResults(searchResults as any[]);
    } catch (e) {
      console.error('Search error', e);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(n => n[0].toUpperCase())
      .join('');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      {/* Header with Back button and Search Pill */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <ChevronLeft size={18} color={AIRBNB.colors.ink} />
        </TouchableOpacity>

        <View style={styles.searchPill}>
          <Search size={17} color={AIRBNB.colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Name, phone, room, ID…"
            placeholderTextColor={AIRBNB.colors.mutedSoft}
            value={query}
            onChangeText={handleSearch}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <X size={16} color={AIRBNB.colors.mutedSoft} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results Header */}
      {query.trim().length > 0 && (
        <View style={styles.resultsBar}>
          <Text style={styles.captionText}>
            {`FOUND ${results.length} RECORD${results.length !== 1 ? 'S' : ''}`}
          </Text>
        </View>
      )}

      {/* Results List */}
      <FlatList
        data={results}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {query.length > 0
                ? `No guests found for "${query}"`
                : 'Type a guest name, phone, ID, or room number to search'}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.guestRow}
            activeOpacity={0.7}
            onPress={() => setSelectedGuest(item)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(item.full_name)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.guestName} numberOfLines={1}>{item.full_name}</Text>
              <Text style={styles.guestSubtitle}>
                Room {item.room_number || 'N/A'} · {item.phone || item.id_number || 'Verified'}
              </Text>
            </View>
            <ChevronRight size={17} color={AIRBNB.colors.mutedSoft} />
          </TouchableOpacity>
        )}
      />

      {/* Guest Detail Bottom Sheet */}
      <Modal visible={!!selectedGuest} transparent animationType="slide">
        <TouchableOpacity
          style={styles.scrim}
          activeOpacity={1}
          onPress={() => setSelectedGuest(null)}
        >
          <TouchableOpacity
            style={styles.sheet}
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
          >
            <View style={styles.sheetHandle} />
            {selectedGuest && (
              <View>
                <View style={styles.sheetHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.avatar, { width: 52, height: 52, borderRadius: 26 }]}>
                      <Text style={[styles.avatarText, { fontSize: 18 }]}>
                        {getInitials(selectedGuest.full_name)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.sheetGuestName}>{selectedGuest.full_name}</Text>
                      <Text style={styles.sheetStatusText}>Verified guest</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => setSelectedGuest(null)}
                  >
                    <X size={16} color={AIRBNB.colors.ink} />
                  </TouchableOpacity>
                </View>

                <View style={styles.metaCard}>
                  {[
                    { label: 'Room', val: `Room ${selectedGuest.room_number || 'N/A'}` },
                    { label: 'Document', val: `${selectedGuest.id_type || 'Aadhaar'} — ${selectedGuest.id_number || 'N/A'}` },
                    { label: 'Phone', val: selectedGuest.phone || 'N/A' },
                    { label: 'Address', val: selectedGuest.address || 'N/A', last: true },
                  ].map((row, i, arr) => (
                    <View key={i} style={[styles.metaRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                      <Text style={styles.metaLabel}>{row.label}</Text>
                      <Text style={styles.metaVal}>{row.val}</Text>
                    </View>
                  ))}
                </View>

                <Button
                  label="Close"
                  variant="secondary"
                  onPress={() => setSelectedGuest(null)}
                />
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function InputRaw(props: any) {
  return (
    <TextInput
      {...props}
      style={{
        flex: 1,
        fontSize: 14.5,
        color: AIRBNB.colors.ink,
        paddingVertical: 8,
      }}
      placeholderTextColor={AIRBNB.colors.mutedSoft}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AIRBNB.colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AIRBNB.colors.hairlineSoft,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AIRBNB.colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairline,
    borderRadius: AIRBNB.radius.full,
    paddingHorizontal: 16,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    color: AIRBNB.colors.ink,
    paddingVertical: 0,
  },
  resultsBar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: AIRBNB.colors.surfaceSoft,
  },
  captionText: {
    fontSize: 11,
    fontWeight: '700',
    color: AIRBNB.colors.muted,
    letterSpacing: 0.2,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffd1da',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: AIRBNB.colors.avatarText,
  },
  guestName: {
    fontSize: 15,
    fontWeight: '500',
    color: AIRBNB.colors.ink,
  },
  guestSubtitle: {
    fontSize: 13.5,
    color: AIRBNB.colors.muted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: AIRBNB.colors.hairlineSoft,
  },
  emptyState: {
    paddingTop: 60,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 14,
    color: AIRBNB.colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Sheet
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: AIRBNB.colors.canvas,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: AIRBNB.colors.hairline,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetGuestName: {
    fontSize: 16,
    fontWeight: '600',
    color: AIRBNB.colors.ink,
  },
  sheetStatusText: {
    fontSize: 13.5,
    color: AIRBNB.colors.muted,
    marginTop: 1,
  },
  metaCard: {
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairlineSoft,
    borderRadius: AIRBNB.radius.md,
    padding: 14,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: AIRBNB.colors.hairlineSoft,
  },
  metaLabel: {
    fontSize: 13.5,
    color: AIRBNB.colors.mutedSoft,
  },
  metaVal: {
    fontSize: 13.5,
    fontWeight: '500',
    color: AIRBNB.colors.ink,
    textAlign: 'right',
    maxWidth: '65%',
  },
});
