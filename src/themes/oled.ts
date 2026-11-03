import { ThemeConfig } from './types';

export const oledTheme: ThemeConfig = {
  id: 'oled',
  name: 'OLED Black Pitch',
  description: 'Pure zero nit pitch black with minimalist subtle dividers for maximum OLED battery savings',
  isDark: true,
  accentColor: '#FFFFFF',
  cardPreviewBg: '#000000',
  variables: {
    '--canvas-bg': '#000000',
    '--card-bg': '#000000',
    '--card-elevated-bg': '#0A0A0A',
    '--card-border': '#1F1F1F',
    '--card-hover-border': '#333333',
    '--nested-bg': '#0D0D0D',
    '--nested-border': '#242424',
    '--input-bg': '#0D0D0D',
    '--input-text': '#FFFFFF',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#A1A1AA',
    '--text-tertiary': '#71717A',
    '--text-muted': '#A1A1AA',
    '--nav-bg': 'rgba(0, 0, 0, 0.98)',
    '--header-bg': 'rgba(0, 0, 0, 0.98)',
    '--btn-primary-bg': '#FFFFFF',
    '--btn-primary-text': '#000000',
    '--btn-secondary-bg': '#171717',
    '--btn-secondary-text': '#FFFFFF',
    '--btn-secondary-border': '#2E2E2E',
    '--modal-bg': '#080808',
    '--modal-overlay': 'rgba(0, 0, 0, 0.9)',
    '--card-shadow': '0 4px 20px -2px rgba(0, 0, 0, 0.9)',
    '--accent-color': '#FFFFFF'
  }
};
