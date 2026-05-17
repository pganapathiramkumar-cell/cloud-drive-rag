import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        /* Design system palette — mirrors CSS custom properties */
        ds: {
          bg:      '#FFFFFF',
          bg2:     '#FAFBFC',
          bg3:     '#F8FAFC',
          border:  '#E5E7EB',
          divider: '#EDF2F7',

          blue: {
            50:  '#EFF6FF',
            100: '#DBEAFE',
            200: '#BFDBFE',
            400: '#60A5FA',
            500: '#3B82F6',
            600: '#2563EB',
            700: '#1D4ED8',
            800: '#1E40AF',
          },
          green: {
            50:  '#F0FDF4',
            100: '#DCFCE7',
            500: '#22C55E',
            600: '#16A34A',
            700: '#15803D',
          },
          red: {
            50:  '#FFF5F5',
            100: '#FEE2E2',
            500: '#EF4444',
            600: '#DC2626',
            700: '#B91C1C',
          },
          orange: {
            50:  '#FFF7ED',
            100: '#FFEDD5',
            500: '#F97316',
            600: '#EA580C',
            700: '#C2410C',
          },
          purple: {
            50:  '#FAF5FF',
            100: '#F3E8FF',
            500: '#A855F7',
            600: '#9333EA',
          },

          text1: '#111827',
          text2: '#374151',
          text3: '#6B7280',
          text4: '#9CA3AF',
        },
      },
      boxShadow: {
        card:       '0 4px 20px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        'card-hover':'0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
        header:     '0 1px 0 #E5E7EB, 0 2px 8px rgba(0,0,0,0.03)',
      },
      borderRadius: {
        ds: '16px',
      },
    },
  },
  plugins: [],
} satisfies Config
