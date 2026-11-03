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
  [key: string]: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  isDark: boolean;
  accentColor: string;
  cardPreviewBg: string;
  variables: ThemeVariables;
}
