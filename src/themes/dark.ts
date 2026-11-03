import { ThemeConfig } from './types';

export const darkTheme: ThemeConfig = {
  id: 'dark',
  name: 'AMOLED Night Dark',
  description: 'Deep pitch black battery saving canvas with refined dark graphite cards and crisp text',
  isDark: true,
  accentColor: '#30D158',
  cardPreviewBg: '#1A1A1A',
  variables: {
    '--canvas-bg': '#000000',
    '--card-bg': '#1A1A1A',
    '--card-elevated-bg': '#1E1E1E',
    '--card-border': '#2C2C2E',
    '--card-hover-border': '#38383A',
    '--nested-bg': '#282828',
    '--nested-border': '#38383A',
    '--input-bg': '#282828',
    '--input-text': '#FFFFFF',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#8E8E93',
    '--text-tertiary': '#636366',
    '--text-muted': '#8E8E93',
    '--nav-bg': 'rgba(0, 0, 0, 0.92)',
    '--header-bg': 'rgba(0, 0, 0, 0.92)',
    '--btn-primary-bg': '#FFFFFF',
    '--btn-primary-text': '#000000',
    '--btn-secondary-bg': '#282828',
    '--btn-secondary-text': '#FFFFFF',
    '--btn-secondary-border': '#38383A',
    '--modal-bg': '#1A1A1A',
    '--modal-overlay': 'rgba(0, 0, 0, 0.75)',
    '--card-shadow': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
    '--accent-color': '#30D158'
  }
};
