/** Colours are CSS variables so the app follows the viewer's light/dark setting. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)', card: 'var(--card)', ink: 'var(--ink)', muted: 'var(--muted)', line: 'var(--line)',
        navy: 'var(--navy)', blue: { DEFAULT: 'var(--blue)', soft: 'var(--blue-soft)' },
        orange: { DEFAULT: 'var(--orange)', soft: 'var(--orange-soft)' },
        green: { DEFAULT: 'var(--green)', soft: 'var(--green-soft)' },
        red: { DEFAULT: 'var(--red)', soft: 'var(--red-soft)' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)' },
    },
  },
  plugins: [],
}
