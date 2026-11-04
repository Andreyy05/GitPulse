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
        pulse: {
          bg: '#090d16',
          card: '#0f172a',
          surface: '#131b2e',
          border: '#1e293b',
          borderGlow: '#334155',
          green: '#10b981',
          greenGlow: 'rgba(16, 185, 129, 0.25)',
          red: '#ef4444',
          redGlow: 'rgba(239, 68, 68, 0.25)',
          accent: '#6366f1',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-green': '0 0 20px -3px rgba(16, 185, 129, 0.45)',
        'glow-red': '0 0 20px -3px rgba(239, 68, 68, 0.45)',
        'glow-accent': '0 0 20px -3px rgba(99, 102, 241, 0.45)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
}
