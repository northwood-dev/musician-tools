import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#e9eeff',
          200: '#c7d2ff',
          300: '#a3b6ff',
          400: '#7a93ff',
          500: '#4f6cff',
          600: '#3a52cc',
          700: '#2c3ea3',
          800: '#1f2a73',
          900: '#121845',
        },
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c3d66',
        },
        accent: {
          50: '#fef3c7',
          100: '#fde68a',
          200: '#fcd34d',
          300: '#fbbf24',
          400: '#f59e0b',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#92400e',
          900: '#78350f',
        },
        secondary: {
          50: '#f3f0ff',
          100: '#e9d5ff',
          200: '#d8b4fe',
          300: '#c084fc',
          400: '#a855f7',
          500: '#9333ea',
          600: '#7e22ce',
          700: '#6b21a8',
          800: '#581c87',
          900: '#3f0f5c',
        },
      },
      spacing: {
        header: '4rem',
        'header-offset': '1rem',
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      boxShadow: {
        'elevated': '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        'card': '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config
