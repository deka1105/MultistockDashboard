/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        bg: {
          base:    '#080b12',
          surface: '#0d1117',
          card:    '#111827',
          border:  '#1f2937',
          hover:   '#1a2332',
        },
        accent: {
          cyan:  '#00d4ff',
          green: '#00ff88',
          red:   '#ff3b5c',
          amber: '#ffb800',
          blue:  '#3b82f6',
        },
        text: {
          primary:   '#f0f4f8',
          secondary: '#8892a4',
          muted:     '#4b5563',
          inverse:   '#080b12',
        },
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'flash-green': 'flashGreen 0.6s ease-out',
        'flash-red':   'flashRed 0.6s ease-out',
        'fade-in':     'fadeIn 0.3s ease-out',
        'slide-up':    'slideUp 0.4s ease-out',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        flashGreen: {
          '0%':   { backgroundColor: 'rgba(0,255,136,0.25)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashRed: {
          '0%':   { backgroundColor: 'rgba(255,59,92,0.25)' },
          '100%': { backgroundColor: 'transparent' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
