import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Download, Share2, Shield,
  Calendar, CheckCircle2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { openDatabase } from '@/database';
import { useSettingsStore } from '@/store/useSettingsStore';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { isAtLimit, getRemainingUsage } from '@/services/entitlementService';
import { AIRBNB } from '@/theme/airbnb';

// ─── Airbnb Compliance Reports for StayMate ──────────────────────────────────
// Direct port of openReports() from staymate-airbnb-redesign/app.html
// ─────────────────────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { businessName } = useSettingsStore();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const [guestsData, setGuestsData] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<'month' | 'range' | 'room'>('month');

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const { propertyId } = useSettingsStore.getState();
      const activePropertyId = propertyId || 'HS-DEFAULT';
      const db = await openDatabase();

      const guests = await db.getAllAsync<any>(`
        SELECT g.*, r.room_number, r.room_type, r.price, s.check_in_date, s.check_out_date
        FROM guests g
        LEFT JOIN stays s ON s.guest_id = g.id
        LEFT JOIN rooms r ON r.id = s.room_id
        WHERE g.property_id = ? OR g.property_id IS NULL OR g.property_id = ''
        ORDER BY g.id DESC
      `, [activePropertyId]);

      setGuestsData(guests);
    } catch (e) {
      console.error('Failed to load reports', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReportData();
    setRefreshing(false);
  }, []);

  const handleExportCSV = async () => {
    try {
      if (isAtLimit('monthlyExports')) {
        Alert.alert(
          'Export Limit Reached',
          'You have reached your monthly export limit. Upgrade to export unlimited compliance reports.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View Plans', onPress: () => router.push('/subscription/pricing') },
          ]
        );
        return;
      }

      setExportingCsv(true);
      let csvContent = 'ID,Full Name,Phone,Email,ID Type,ID Number,Nationality,Gender,Room,Check In Date,Check Out Date,Address\n';

      guestsData.forEach(g => {
        csvContent += `"${g.id}","${g.full_name || ''}","${g.phone || ''}","${g.email || ''}","${g.id_type || ''}","${g.id_number || ''}","${g.nationality || 'Indian'}","${g.gender || ''}","${g.room_number || ''}","${g.check_in_date || ''}","${g.check_out_date || ''}","${g.address || ''}"\n`;
      });

      const fileUri = `${FileSystem.documentDirectory}StayMate_Police_Form_C_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: 'utf8' });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
        useSubscriptionStore.getState().incrementExport();
      }
    } catch (e: any) {
      Alert.alert('Export Error', e?.message || 'Failed to export CSV');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      if (isAtLimit('monthlyExports')) {
        Alert.alert(
          'Export Limit Reached',
          'You have reached your monthly export limit. Upgrade to export unlimited compliance reports.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View Plans', onPress: () => router.push('/subscription/pricing') },
          ]
        );
        return;
      }

      setExportingPdf(true);
      const rows = guestsData.map((g, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><b>${g.full_name}</b><br/><small>${g.gender || 'N/A'}, ${g.nationality || 'Indian'}</small></td>
          <td>${g.phone || 'N/A'}</td>
          <td>${g.id_type || 'ID'}: ${g.id_number || 'N/A'}</td>
          <td>Room ${g.room_number || 'N/A'}</td>
          <td>${g.check_in_date || 'Recent'}</td>
          <td>${g.address || 'N/A'}</td>
        </tr>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, sans-serif; padding: 24px; color: #222; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p { font-size: 12px; color: #666; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f7f7f7; font-weight: 600; }
          </style>
        </head>
        <body>
          <h1>${businessName || 'StayMate'} — Police Form C Register</h1>
          <p>Generated on ${new Date().toLocaleDateString('en-IN')}</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Guest</th>
                <th>Phone</th>
                <th>ID Document</th>
                <th>Room</th>
                <th>Check-in</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
        useSubscriptionStore.getState().incrementExport();
      }
    } catch (e: any) {
      Alert.alert('Export Error', e?.message || 'Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <ChevronLeft size={18} color={AIRBNB.colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Compliance reports</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={AIRBNB.colors.primary}
            onRefresh={onRefresh}
          />
        }
      >
        {/* Filter Chips Horizontal Row */}
        <View style={styles.chipsRow}>
          {[
            { id: 'month', label: 'This month' },
            { id: 'range', label: 'Custom range' },
            { id: 'room', label: 'By room' },
          ].map(f => {
            const active = timeFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.8}
                onPress={() => setTimeFilter(f.id as any)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Police Form C Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconWell}>
            <Shield size={20} color={AIRBNB.colors.ink} />
          </View>
          <Text style={styles.heroTitle}>Police Form C</Text>
          <Text style={styles.heroSubtitle}>
            {`${guestsData.length} registration${guestsData.length !== 1 ? 's' : ''} logged, ready for export`}
          </Text>

          <View style={styles.heroBtnRow}>
            <Button
              label="CSV"
              variant="soft"
              isLoading={exportingCsv}
              icon={<Download size={16} color={AIRBNB.colors.ink} />}
              style={{ flex: 1 }}
              onPress={handleExportCSV}
            />
            <Button
              label="PDF"
              variant="primary"
              isLoading={exportingPdf}
              icon={<Share2 size={16} color="#ffffff" />}
              style={{ flex: 1 }}
              onPress={handleExportPDF}
            />
          </View>
        </View>

        {/* Export History Section */}
        <Text style={styles.sectionLabel}>EXPORT HISTORY</Text>
        {['August 2026', 'July 2026', 'June 2026'].map((m, i, arr) => (
          <TouchableOpacity
            key={m}
            style={[styles.historyRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={handleExportCSV}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.historyIconWell}>
                <Calendar size={15} color={AIRBNB.colors.ink} />
              </View>
              <Text style={styles.historyMonth}>{m}</Text>
            </View>
            <Download size={16} color={AIRBNB.colors.mutedSoft} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
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
    gap: 14,
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: AIRBNB.colors.ink,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: AIRBNB.radius.full,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairline,
    backgroundColor: AIRBNB.colors.canvas,
  },
  chipActive: {
    backgroundColor: AIRBNB.colors.ink,
    borderColor: AIRBNB.colors.ink,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: AIRBNB.colors.ink,
  },
  chipTextActive: {
    color: '#ffffff',
  },

  // Hero Card
  heroCard: {
    backgroundColor: AIRBNB.colors.canvas,
    borderWidth: 1,
    borderColor: AIRBNB.colors.hairlineSoft,
    borderRadius: AIRBNB.radius.md,
    padding: 18,
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 24,
    ...AIRBNB.shadow.card,
  },
  heroIconWell: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: AIRBNB.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AIRBNB.colors.ink,
  },
  heroSubtitle: {
    fontSize: 13.5,
    color: AIRBNB.colors.body,
    marginTop: 4,
    textAlign: 'center',
  },
  heroBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    width: '100%',
  },

  // History Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: AIRBNB.colors.muted,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AIRBNB.colors.hairlineSoft,
  },
  historyIconWell: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: AIRBNB.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyMonth: {
    fontSize: 15,
    color: AIRBNB.colors.body,
  },
});
