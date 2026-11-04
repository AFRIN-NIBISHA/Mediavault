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
        brand: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764'
        },
        surface: {
          50: '#fcfaff',
          100: '#f7f4fa',
          200: '#ede8f5',
          300: '#ded5ea',
          400: '#9b8faf',
          500: '#6e6185',
          600: '#534769',
          700: '#3c324e',
          800: '#261e35',
          900: '#150f21',
          950: '#0c0714'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(147, 51, 234, 0.04), 0 1px 2px -1px rgba(147, 51, 234, 0.04)',
        'premium': '0 4px 20px -2px rgba(147, 51, 234, 0.08), 0 2px 6px -2px rgba(147, 51, 234, 0.04)',
        'elevated': '0 10px 30px -4px rgba(147, 51, 234, 0.12), 0 4px 10px -2px rgba(147, 51, 234, 0.06)'
      }
    },
  },
  plugins: [],
}
