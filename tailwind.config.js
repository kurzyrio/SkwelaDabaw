/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dynamic CSS Variable Tokens for System-Wide Theming
        canvas: 'var(--canvas-bg)',
        card: 'var(--card-bg)',
        'card-border': 'var(--card-border)',
        'text-main': 'var(--text-primary)',
        'text-sub': 'var(--text-secondary)',
        accent: 'var(--accent-color)',
        nested: 'var(--nested-bg)',
        'nested-border': 'var(--nested-border)',
        surface: {
          50: '#F4F4F6',
          100: '#E5E5EA',
          200: '#D1D1D6',
          card: 'var(--card-bg)',
          cardElevated: 'var(--card-elevated-bg)',
          nested: 'var(--nested-bg)',
          border: 'var(--card-border)',
        },
        ios: {
          bg: '#000000',
          card: '#1A1A1A',
          cardHover: '#222222',
          graphite: '#282828',
          border: '#2C2C2E',
          divider: 'rgba(255, 255, 255, 0.08)',
          text: '#FFFFFF',
          secondary: '#8E8E93',
          tertiary: '#636366',
        },
        // Isolated functional colors (reserved for data, badges, accents)
        functional: {
          success: '#30D158',
          danger: '#FF453A',
          warning: '#FF9F0A',
          info: '#0A84FF',
          purple: '#BF5AF2',
          teal: '#64D2FF',
        },
        // Keep backwards compatible mappings for safety
        night: {
          50: '#F4F4F6',
          100: '#E5E5EA',
          200: '#D1D1D6',
          300: '#C8BFB3',
          400: '#8E8E93',
          500: '#282828',
          600: '#1E1E1E',
          700: '#1A1A1A',
          800: '#121212',
          900: '#0D0D0D',
          950: '#000000',
        },
        dawn: {
          50: '#F4F4F6',
          100: '#E5E5EA',
          500: '#FFFFFF',
          600: '#E5E5EA',
          700: '#8E8E93',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'input': '0px 2px 3px -1px rgba(0, 0, 0, 0.1), 0px 1px 0px 0px rgba(25, 28, 33, 0.02), 0px 0px 0px 1px rgba(25, 28, 33, 0.08)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.06)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        'glow': '0 0 20px -3px rgba(245, 158, 11, 0.3)',
        'glow-lg': '0 0 32px -4px rgba(245, 158, 11, 0.4)',
        'glow-amber': '0 0 24px -4px rgba(251, 191, 36, 0.25)',
        'elevated': '0 4px 24px -4px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'elevated-dark': '0 4px 24px -4px rgba(0, 0, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.2)',
      },
      backdropBlur: {
        'xs': '2px',
        'glass': '24px',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 2s linear infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'mesh-shift': 'meshShift 20s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translate3d(0, 4px, 0)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translate3d(0, 16px, 0)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale3d(0.95, 0.95, 1)' },
          '100%': { opacity: '1', transform: 'scale3d(1, 1, 1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6', transform: 'scale3d(0.98, 0.98, 1)' },
          '50%': { opacity: '1', transform: 'scale3d(1.02, 1.02, 1)' },
        },
        meshShift: {
          '0%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(-2%, 3%, 0) scale(1.02)' },
          '100%': { transform: 'translate3d(2%, -2%, 0) scale(1)' },
        },
      }
    },
  },
  plugins: [],
}
