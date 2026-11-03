import { ThemeConfig } from './types';

export const cyberTheme: ThemeConfig = {
  id: 'cyber',
  name: 'Cyber Neon',
  description: 'High energy futuristic cyber glow with electric cyan accents and midnight obsidian cards',
  isDark: true,
  accentColor: '#00E5FF',
  cardPreviewBg: '#0D111A',
  variables: {
    '--canvas-bg': '#050811',
    '--card-bg': '#0D111A',
    '--card-elevated-bg': '#131826',
    '--card-border': '#1F293D',
    '--card-hover-border': '#00E5FF',
    '--nested-bg': '#161E2E',
    '--nested-border': '#24324D',
    '--input-bg': '#161E2E',
    '--input-text': '#E0F7FA',
    '--text-primary': '#FFFFFF',
    '--text-secondary': '#80DEEA',
    '--text-tertiary': '#4DD0E1',
    '--text-muted': '#80DEEA',
    '--nav-bg': 'rgba(5, 8, 17, 0.92)',
    '--header-bg': 'rgba(5, 8, 17, 0.92)',
    '--btn-primary-bg': '#00E5FF',
    '--btn-primary-text': '#050811',
    '--btn-secondary-bg': '#161E2E',
    '--btn-secondary-text': '#E0F7FA',
    '--btn-secondary-border': '#24324D',
    '--modal-bg': '#0D111A',
    '--modal-overlay': 'rgba(0, 0, 0, 0.85)',
    '--card-shadow': '0 4px 25px -2px rgba(0, 229, 255, 0.2)',
    '--accent-color': '#00E5FF'
  }
};
