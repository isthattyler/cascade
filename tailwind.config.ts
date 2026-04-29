/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/src/**/*.{ts,tsx}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1a1a2e',
          light: '#222244',
          lighter: '#2a2a4a',
        },
        accent: {
          green: '#22c55e',
          amber: '#f59e0b',
          red: '#ef4444',
          blue: '#3b82f6',
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'flash': 'flash 0.5s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 4px rgba(34,197,94,0.4)', opacity: '0.7' },
          '50%': { boxShadow: '0 0 8px rgba(34,197,94,0.8)', opacity: '1' },
        },
        flash: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
