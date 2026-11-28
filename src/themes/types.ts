export interface ThemeVariables {
  '--canvas-bg': string;
  '--card-bg': string;
  '--card-elevated-bg': string;
  '--card-border': string;
  '--card-hover-border': string;
  '--nested-bg': string;
  '--nested-border': string;
  '--input-bg': string;
  '--input-text': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--text-tertiary': string;
  '--text-muted'?: string;
  '--nav-bg': string;
  '--header-bg': string;
  '--btn-primary-bg': string;
  '--btn-primary-text': string;
  '--btn-secondary-bg': string;
  '--btn-secondary-text': string;
  '--btn-secondary-border': string;
  '--modal-bg': string;
  '--modal-overlay': string;
  '--card-shadow': string;
  '--accent-color': string;
  // Optional custom-theme extensions (strictly cleared on official themes)
  '--canvas-gradient'?: string;
  '--canvas-overlay'?: string;
  '--card-backdrop-blur'?: string;
  '--modal-backdrop-blur'?: string;
  '--nav-active-color'?: string;
  '--nav-fab-bg'?: string;
  [key: string]: string | undefined;
}

export interface NativeSurfaceColors {
  cardBg: string;
  itemBg: string;
  stroke: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  badgeBg: string;
  btnBg: string;
  bubbleBg: string;
  bubbleRim: string;
}

export interface ThemeConfig {
  schemaVersion?: number;
  id: string;
  name: string;
  description: string;
  author?: string;
  category?: string;
  isDark: boolean;
  accentColor: string;
  cardPreviewBg: string;
  variables: ThemeVariables;
  wallpaperUrl?: string;
  wallpaperFit?: 'cover' | 'contain';
  wallpaperOpacity?: number;
  previewImages?: string[];
  nativeSurfaces?: Partial<NativeSurfaceColors>;
  isCustom?: boolean;
  hasGif?: boolean;
  downloadsCount?: number;
  createdAt?: string;
}
