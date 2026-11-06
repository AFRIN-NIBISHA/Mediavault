/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // MediaVault by Secure Hardline Design Tokens
        brand: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7', // Primary Accent: Electric Cerulean
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
          950: '#082F49'
        },
        iris: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1', // Secondary Accent: Iris
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81'
        },
        surface: {
          50: '#F9F9FB',  // Background Primary Canvas (Soft Ivory / Off-White)
          100: '#F1F3F7', // Subtle Container / Sidebar Cool Light Slate
          200: '#E2E8F0', // Border Strokes rgba(226, 232, 240, 0.8)
          300: '#CBD5E1',
          400: '#94A3B8', // Metadata / Captions (Soft Fog Gray)
          500: '#64748B',
          600: '#475569', // Secondary / Body (Muted Slate)
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A', // Primary Headings (Deep Slate Ink)
          950: '#020617'
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          'sans-serif'
        ]
      },
      letterSpacing: {
        'tightest': '-0.035em',
        'tighter': '-0.025em',
        'tight': '-0.015em'
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'sm': '0 2px 8px -2px rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.02)',
        'premium': '0 10px 30px -10px rgba(15, 23, 42, 0.05), 0 4px 12px -4px rgba(15, 23, 42, 0.03)',
        'elevated': '0 20px 40px -12px rgba(15, 23, 42, 0.07), 0 8px 16px -6px rgba(15, 23, 42, 0.03)',
        'apple': '0 12px 36px -4px rgba(15, 23, 42, 0.06), 0 4px 12px -2px rgba(15, 23, 42, 0.03)',
        'glow-sky': '0 0 25px -5px rgba(2, 132, 199, 0.25)',
        'glow-iris': '0 0 25px -5px rgba(99, 102, 241, 0.25)'
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px'
      }
    },
  },
  plugins: [],
}
