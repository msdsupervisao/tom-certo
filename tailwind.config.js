/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-soft': 'var(--bg-soft)',
        panel: 'var(--panel)',
        border: 'var(--border)',
        accent: 'var(--violeta)',
        rosa: 'var(--rosa)',
        amarelo: 'var(--amarelo)',
        violeta: 'var(--violeta)',
        turquesa: 'var(--turquesa)',
        danger: '#e0356f',
        good: 'var(--turquesa)',
        warn: 'var(--amarelo)',
        bad: '#ff4d6a',
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
