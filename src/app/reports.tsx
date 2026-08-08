import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/GlassCard';
import { ChevronLeft, Download, TrendingUp, Users, Calendar, FileText, CheckCircle2, BedDouble, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { openDatabase, incrementMonthlyExportCount } from '@/database';
import { useSettingsStore } from '@/store/useSettingsStore';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { EntitlementService } from '@/services/entitlementService';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

export default function ReportsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { businessName } = useSettingsStore();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const [guestsData, setGuestsData] = useState<any[]>([]);
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [occupancyRate, setOccupancyRate] = useState(0);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');

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
      
      const rooms = await db.getAllAsync<any>(`SELECT * FROM rooms`);
      
      const totalRooms = rooms.length;
      const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
      const occRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
      
      let rev = 0;
      guests.forEach((g) => {
        if (g.price) {
          rev += Number(g.price) || 0;
        }
      });

      setGuestsData(guests);
      setRoomsData(rooms);
      setTotalRevenue(rev);
      setOccupancyRate(occRate);
    } catch (e) {
      console.error('Failed to load report metrics', e);
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

  // Helper to check if a date string matches a given target date
  const isSameDay = (dateStr: string | null | undefined, targetDate: Date) => {
    if (!dateStr) return false;

    const tYear = targetDate.getFullYear();
    const tMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
    const tDay = String(targetDate.getDate()).padStart(2, '0');

    const isoDateStr = `${tYear}-${tMonth}-${tDay}`;
    const indianDateStr = `${tDay}/${tMonth}/${tYear}`;

    if (dateStr.includes(isoDateStr) || dateStr.includes(indianDateStr)) return true;

    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) return false;

    return (
      parsedDate.getDate() === targetDate.getDate() &&
      parsedDate.getMonth() === targetDate.getMonth() &&
      parsedDate.getFullYear() === targetDate.getFullYear()
    );
  };

  // Filter guests based on selected time frame
  const getFilteredGuests = () => {
    if (timeFilter === 'all') return guestsData;
    
    const now = new Date();

    return guestsData.filter((g) => {
      const dateString = g.check_in_date || g.created_at || g.stay_created_at;
      if (!dateString) return false;

      if (timeFilter === 'today') {
        return isSameDay(dateString, now);
      }

      const regDate = new Date(dateString);
      if (isNaN(regDate.getTime())) return false;

      if (timeFilter === 'month') {
        return regDate.getMonth() === now.getMonth() && regDate.getFullYear() === now.getFullYear();
      }
      if (timeFilter === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return regDate >= oneWeekAgo;
      }
      return true;
    });
  };

  const currentFilteredGuests = getFilteredGuests();
  const currentRevenue = currentFilteredGuests.reduce((sum, g) => sum + (Number(g.price) || 0), 0);

  // Helper to safely share or present generated report file
  const shareReportFile = async (fileUri: string, mimeType: string, filename: string) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, { 
          UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'com.adobe.pdf', 
          mimeType, 
          dialogTitle: filename 
        });
      } else {
        Alert.alert('Report Created', `${filename} generated successfully!`);
      }
    } catch (e) {
      console.warn('Share error', e);
      Alert.alert('Report Created', `${filename} generated successfully!`);
    }
  };

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const checkExportEntitlement = async (): Promise<boolean> => {
    const { propertyId } = useSettingsStore.getState();
    const status = await EntitlementService.canPerformExport(propertyId || 'HS-DEFAULT');
    if (!status.allowed) {
      setIsUpgradeModalOpen(true);
      return false;
    }
    await incrementMonthlyExportCount(propertyId || 'HS-DEFAULT');
    return true;
  };

  // PDF Export Handler
  const handleExportPDF = async () => {
    const isAllowed = await checkExportEntitlement();
    if (!isAllowed) return;

    const targetGuests = currentFilteredGuests;

    if (targetGuests.length === 0) {
      Alert.alert('No Registrations', `No guest registrations found for ${getDurationLabel()}.`);
      return;
    }

    try {
      setExportingPdf(true);
      const propTitle = businessName || 'Guest Check-in Assistant Property';
      const exportDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
      const exportRevenue = targetGuests.reduce((sum, g) => sum + (Number(g.price) || 0), 0);

      const tableRowsHtml = targetGuests.map((g, idx) => `
        <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; font-weight: bold; color: #0F172A;">${g.full_name || 'N/A'}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: center; color: #0284C7; font-weight: bold;">${g.room_number || 'N/A'}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px;">${g.id_type || 'ID'} - ${g.id_number || 'N/A'}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px;">${g.phone || 'N/A'}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: center; font-weight: bold; color: #16A34A;">${g.check_in_date || 'N/A'}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: center; font-weight: bold; color: #DC2626;">${g.check_out_date || 'N/A'}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: right; font-weight: bold;">₹${g.price || 0}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Guest Registration Report</title>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 30px; color: #1E293B; }
              .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #38BDF8; padding-bottom: 15px; margin-bottom: 20px; }
              .title { font-size: 24px; font-weight: bold; color: #0F172A; }
              .subtitle { font-size: 12px; color: #64748B; margin-top: 4px; }
              .stats-container { display: flex; gap: 15px; margin-bottom: 25px; }
              .stat-box { flex: 1; background: #F1F5F9; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #38BDF8; }
              .stat-label { font-size: 10px; text-transform: uppercase; color: #64748B; font-weight: bold; }
              .stat-val { font-size: 18px; font-weight: bold; color: #0F172A; margin-top: 2px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th { background-color: #0F172A; color: #FFFFFF; font-size: 11px; text-transform: uppercase; padding: 10px 12px; text-align: left; }
              .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="title">${propTitle}</div>
                <div class="subtitle">Official Guest Register & Property Report (${getDurationLabel()})</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 12px; font-weight: bold;">Report Date</div>
                <div class="subtitle">${exportDate}</div>
              </div>
            </div>

            <div class="stats-container">
              <div class="stat-box">
                <div class="stat-label">Total Guest Registrations</div>
                <div class="stat-val">${targetGuests.length}</div>
              </div>
              <div class="stat-box" style="border-left-color: #10B981;">
                <div class="stat-label">Estimated Revenue</div>
                <div class="stat-val">₹${exportRevenue.toLocaleString()}</div>
              </div>
              <div class="stat-box" style="border-left-color: #8B5CF6;">
                <div class="stat-label">Occupancy Rate</div>
                <div class="stat-val">${occupancyRate}%</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="text-align: center;">#</th>
                  <th>Guest Name</th>
                  <th style="text-align: center;">Room</th>
                  <th>Identity Doc</th>
                  <th>Phone</th>
                  <th style="text-align: center;">Check-in Date</th>
                  <th style="text-align: center;">Check-out Date</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>

            <div class="footer">
              Generated securely by Guest Check-in Assistant v1.1.7 • Confidential Property Document
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await shareReportFile(uri, 'application/pdf', 'Guest_Register_Report.pdf');
    } catch (e: any) {
      console.error('PDF generation error', e);
      Alert.alert('Export Error', e?.message || 'Failed to generate PDF report.');
    } finally {
      setExportingPdf(false);
    }
  };

  // CSV Export Handler
  const handleExportCSV = async () => {
    const targetGuests = currentFilteredGuests;

    if (targetGuests.length === 0) {
      Alert.alert('No Registrations', `No guest registrations found for ${getDurationLabel()}.`);
      return;
    }

    try {
      setExportingCsv(true);
      const csvHeader = 'Sl No,Guest Name,Room Number,Room Type,Room Price,ID Type,ID Number,Phone,Date of Birth,Address,Check-in Date,Check-out Date\n';
      const csvRows = targetGuests.map((g, i) => {
        const clean = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
        return [
          i + 1,
          clean(g.full_name),
          clean(g.room_number),
          clean(g.room_type),
          g.price || 0,
          clean(g.id_type),
          clean(g.id_number),
          clean(g.phone),
          clean(g.dob),
          clean(g.address),
          clean(g.check_in_date),
          clean(g.check_out_date)
        ].join(',');
      }).join('\n');

      const csvData = csvHeader + csvRows;
      const fileUri = `${FileSystem.cacheDirectory}Guest_Register_Report.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvData, { encoding: FileSystem.EncodingType.UTF8 });
      await shareReportFile(fileUri, 'text/csv', 'Guest_Register_Report.csv');
    } catch (e: any) {
      console.error('CSV generation error', e);
      Alert.alert('Export Error', e?.message || 'Failed to generate CSV report.');
    } finally {
      setExportingCsv(false);
    }
  };

  const getDurationLabel = () => {
    switch (timeFilter) {
      case 'today': return "Today's";
      case 'week': return "Past 7 Days";
      case 'month': return "This Month's";
      case 'all': return "All Time";
      default: return "";
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background">
      {/* Header Bar */}
      <View className="flex-row items-center justify-between px-4 pt-3 pb-3 border-b border-gray-200/50 dark:border-gray-800">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-3 p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800"
          >
            <ChevronLeft size={26} color="#000000" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-foreground">Property Reports</Text>
            <Text className="text-xs text-gray-500 font-medium">{businessName || 'Property Overview'}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={fetchReportData} className="p-2 bg-primary/10 rounded-full">
          <RefreshControl refreshing={false} />
          <Text className="text-xs font-bold text-primary px-2">Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* DURATION SELECTION TABS */}
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
          Select Duration
        </Text>
        <View className="flex-row gap-2 mb-5 flex-wrap">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Past 7 Days' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All Time' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setTimeFilter(tab.id as any)}
              className={`px-4 py-2 rounded-full border ${
                timeFilter === tab.id 
                  ? 'bg-primary border-primary' 
                  : 'bg-white dark:bg-black/20 border-gray-200 dark:border-gray-800'
              }`}
            >
              <Text className={`text-xs font-bold ${timeFilter === tab.id ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* METRICS CARDS */}
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text className="text-xs text-gray-400 mt-2 font-medium">Calculating property metrics...</Text>
          </View>
        ) : (
          <GlassCard className="mb-6 p-5 rounded-2xl border border-gray-100 dark:border-white/10">
            {/* Revenue Metric */}
            <View className="flex-row items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <View className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/40 rounded-2xl items-center justify-center mr-4 border border-emerald-200 dark:border-emerald-800/30">
                <TrendingUp size={24} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{getDurationLabel()} Revenue</Text>
                <Text className="text-2xl font-extrabold text-foreground mt-0.5">₹{currentRevenue.toLocaleString()}</Text>
              </View>
            </View>

            {/* Total Guests Metric */}
            <View className="flex-row items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <View className="w-12 h-12 bg-sky-100 dark:bg-sky-950/40 rounded-2xl items-center justify-center mr-4 border border-sky-200 dark:border-sky-800/30">
                <Users size={24} color="#0EA5E9" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{getDurationLabel()} Registered Guests</Text>
                <Text className="text-2xl font-extrabold text-foreground mt-0.5">{currentFilteredGuests.length}</Text>
              </View>
            </View>

            {/* Occupancy Rate Metric */}
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-purple-100 dark:bg-purple-950/40 rounded-2xl items-center justify-center mr-4 border border-purple-200 dark:border-purple-800/30">
                <Calendar size={24} color="#9333EA" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Current Occupancy Rate</Text>
                <Text className="text-2xl font-extrabold text-foreground mt-0.5">{occupancyRate}%</Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* EXPORT OPTIONS */}
        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 mt-2">
          Export {getDurationLabel()} Reports
        </Text>

        <Button 
          label={exportingPdf ? "Generating PDF Register..." : `Export ${getDurationLabel()} Register (PDF)`} 
          variant="outline" 
          disabled={exportingPdf}
          icon={exportingPdf ? <ActivityIndicator size="small" color="#38BDF8" className="mr-2" /> : <Download size={18} color="#000000" className="mr-2" />}
          onPress={handleExportPDF}
          className="mb-3"
        />

        <Button 
          label={exportingCsv ? "Generating CSV Spreadsheet..." : `Export ${getDurationLabel()} Report (CSV)`} 
          variant="outline" 
          disabled={exportingCsv}
          icon={exportingCsv ? <ActivityIndicator size="small" color="#38BDF8" className="mr-2" /> : <Download size={18} color="#000000" className="mr-2" />}
          onPress={handleExportCSV}
        />

      </ScrollView>
      {/* REPORT EXPORT LIMIT UPGRADE MODAL */}
      <UpgradeModal
        visible={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        featureName="Monthly Export Limit Reached (5/5)"
        description="You have reached the 5 free PDF/CSV exports included in the Free plan this month. Upgrade to Starter or Professional for unlimited exports."
        requiredPlan="STARTER"
      />
    </SafeAreaView>
  );
}
