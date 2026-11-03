import { ThemeConfig } from './types';

export const lightTheme: ThemeConfig = {
  id: 'light',
  name: 'Morning Sun Light',
  description: 'Clean Apple iOS grouped inset with pure white cards and high-contrast typography',
  isDark: false,
  accentColor: '#007AFF',
  cardPreviewBg: '#FFFFFF',
  variables: {
    '--canvas-bg': '#F2F2F7',
    '--card-bg': '#FFFFFF',
    '--card-elevated-bg': '#FFFFFF',
    '--card-border': '#E5E5EA',
    '--card-hover-border': '#D1D1D6',
    '--nested-bg': '#E5E5EA',
    '--nested-border': '#D1D1D6',
    '--input-bg': '#E5E5EA',
    '--input-text': '#000000',
    '--text-primary': '#000000',
    '--text-secondary': '#6C6C70',
    '--text-tertiary': '#8E8E93',
    '--text-muted': '#6C6C70',
    '--nav-bg': 'rgba(242, 242, 247, 0.92)',
    '--header-bg': 'rgba(242, 242, 247, 0.92)',
    '--btn-primary-bg': '#000000',
    '--btn-primary-text': '#FFFFFF',
    '--btn-secondary-bg': '#E5E5EA',
    '--btn-secondary-text': '#000000',
    '--btn-secondary-border': '#D1D1D6',
    '--modal-bg': '#FFFFFF',
    '--modal-overlay': 'rgba(0, 0, 0, 0.45)',
    '--card-shadow': '0 2px 10px -1px rgba(0, 0, 0, 0.06)',
    '--accent-color': '#007AFF'
  }
};
