/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'rgba(15, 15, 25, 0.85)',
          light: 'rgba(30, 30, 50, 0.7)',
          card: 'rgba(25, 25, 45, 0.6)'
        },
        severity: {
          chill: '#4ade80',
          warning: '#facc15',
          danger: '#f87171',
          critical: '#ef4444'
        }
      },
      backdropBlur: {
        glass: '20px'
      }
    }
  },
  plugins: []
}
