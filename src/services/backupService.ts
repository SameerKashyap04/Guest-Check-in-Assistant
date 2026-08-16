// ============================================================
// StayMate — Backup Service Abstraction
// ============================================================
//
// Provides backup/restore foundation for the Professional plan.
// Phase 1: Local SQLite export/import
// Phase 2: Cloud backup (future extension)
//

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { canUseFeature } from '@/services/entitlementService';

export interface BackupMetadata {
  createdAt: string;
  version: string;
  propertyId: string;
  guestCount: number;
  roomCount: number;
  stayCount: number;
  sizeBytes: number;
}

export interface BackupResult {
  success: boolean;
  filePath?: string;
  metadata?: BackupMetadata;
  error?: string;
}

// ------------------------------------------------------------------
// Backup Service
// ------------------------------------------------------------------

class BackupService {
  /**
   * Check if the current plan supports backup/restore.
   */
  isAvailable(): boolean {
    return canUseFeature('backups');
  }

  /**
   * Create a local backup of the SQLite database.
   * Returns the file path of the backup.
   *
   * Professional+ feature only.
   */
  async createLocalBackup(propertyId: string): Promise<BackupResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Backup is available on the Professional plan and above.',
      };
    }

    try {
      if (Platform.OS === 'web') {
        return {
          success: false,
          error: 'Local backup is not available on web. Use cloud backup instead.',
        };
      }

      const dbPath = `${FileSystem.documentDirectory}SQLite/guestcheckin.db`;
      const backupDir = `${FileSystem.documentDirectory}backups/`;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${backupDir}backup_${propertyId}_${timestamp}.db`;

      // Ensure backup directory exists
      await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true }).catch(() => {});

      // Copy database file
      await FileSystem.copyAsync({
        from: dbPath,
        to: backupPath,
      });

      // Get file info for metadata
      const fileInfo = await FileSystem.getInfoAsync(backupPath);

      const metadata: BackupMetadata = {
        createdAt: new Date().toISOString(),
        version: '1.2.0',
        propertyId,
        guestCount: 0,  // TODO: query from DB
        roomCount: 0,
        stayCount: 0,
        sizeBytes: (fileInfo as any).size || 0,
      };

      return {
        success: true,
        filePath: backupPath,
        metadata,
      };
    } catch (error: any) {
      console.error('Backup creation failed:', error);
      return {
        success: false,
        error: error?.message || 'Failed to create backup.',
      };
    }
  }

  /**
   * Share a backup file using the system share sheet.
   */
  async shareBackup(filePath: string): Promise<void> {
    if (Platform.OS === 'web') {
      console.warn('Sharing is not available on web.');
      return;
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device.');
    }

    await Sharing.shareAsync(filePath, {
      mimeType: 'application/x-sqlite3',
      dialogTitle: 'Export Database Backup',
    });
  }

  /**
   * List available local backups.
   */
  async listBackups(): Promise<string[]> {
    try {
      if (Platform.OS === 'web') return [];

      const backupDir = `${FileSystem.documentDirectory}backups/`;
      const dirInfo = await FileSystem.getInfoAsync(backupDir);
      if (!dirInfo.exists) return [];

      const files = await FileSystem.readDirectoryAsync(backupDir);
      return files
        .filter((f) => f.endsWith('.db'))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }
}

// ------------------------------------------------------------------
// Singleton Export
// ------------------------------------------------------------------

export const backupService = new BackupService();
