/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'rgba(15, 15, 25, 0.85)',
          light: 'rgba(30, 30, 50, 0.7)',
          card: 'rgba(25, 25, 45, 0.6)'
        },
        severity: {
          focused: '#22c55e',
          drifting: '#eab308',
          distracted: '#f97316',
          procrastinating: '#ef4444',
          crisis: '#a855f7'
        }
      },
      backdropBlur: {
        glass: '20px'
      }
    }
  },
  plugins: []
}
