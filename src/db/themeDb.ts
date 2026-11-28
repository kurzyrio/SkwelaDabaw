import Dexie, { Table } from 'dexie';
import { ThemeConfig } from '../themes/types';

export interface StoredCustomThemeRecord {
  id: string;
  config: ThemeConfig;
  wallpaperBlob?: Blob;
  wallpaperMime?: string;
  thumbnailBlob?: Blob;
  installedAt: number;
  updatedAt: number;
}

/**
 * Isolated IndexedDB store strictly for downloaded community themes & offline wallpaper/GIF blobs.
 * Intentionally separated from SkwelaDabawDB so account switching / logout / clearAllDexieData()
 * NEVER wipes a student's installed themes, and large media blobs never hit the 5MB localStorage limit.
 */
export class SkwelaThemeDatabase extends Dexie {
  customThemes!: Table<StoredCustomThemeRecord, string>;

  constructor() {
    super('SkwelaDabawThemesDB');
    this.version(1).stores({
      customThemes: '&id, installedAt, updatedAt'
    });
  }
}

export const themeDb = new SkwelaThemeDatabase();
