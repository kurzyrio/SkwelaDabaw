import { ThemeConfig } from './types';

export const violetTheme: ThemeConfig = {
  id: 'violet',
  name: 'Royal Violet',
  description: 'Clean modern royal purple aesthetic with vibrant violet accents and high-contrast cards',
  isDark: false,
  accentColor: '#7C3AED',
  cardPreviewBg: '#FFFFFF',
  variables: {
    '--canvas-bg': '#F5F3FF',
    '--card-bg': '#FFFFFF',
    '--card-elevated-bg': '#FFFFFF',
    '--card-border': '#EDE9FE',
    '--card-hover-border': '#DDD6FE',
    '--nested-bg': '#F3F0FF',
    '--nested-border': '#DDD6FE',
    '--input-bg': '#F3F0FF',
    '--input-text': '#1E1B4B',
    '--text-primary': '#1E1B4B',
    '--text-secondary': '#6D28D9',
    '--text-tertiary': '#8B5CF6',
    '--nav-bg': 'rgba(255, 255, 255, 0.92)',
    '--header-bg': 'rgba(245, 243, 255, 0.92)',
    '--btn-primary-bg': '#7C3AED',
    '--btn-primary-text': '#FFFFFF',
    '--btn-secondary-bg': '#EDE9FE',
    '--btn-secondary-text': '#6D28D9',
    '--btn-secondary-border': '#C4B5FD',
    '--modal-bg': '#FFFFFF',
    '--modal-overlay': 'rgba(30, 27, 75, 0.45)',
    '--card-shadow': '0 4px 20px -2px rgba(124, 58, 237, 0.08)',
    '--accent-color': '#7C3AED'
  }
};
