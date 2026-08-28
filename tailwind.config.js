/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0B1F3A',
          'navy-light': '#162F52',
          'navy-dark': '#071528',
          blue: '#155EEF',
          'blue-light': '#2E90FA',
          'blue-soft': '#EFF4FF',
          teal: '#0F766E',
          'teal-light': '#14B8A6',
          'teal-soft': '#F0FDFA',
        },
        enterprise: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          'border-subtle': '#F1F5F9',
          text: '#0F172A',
          muted: '#64748B',
          subtle: '#94A3B8'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'drawer': '-4px 0 24px rgba(0, 0, 0, 0.12)',
      }
    },
  },
  plugins: [],
}
