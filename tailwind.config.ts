import type { Config } from 'tailwindcss'

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        surface2: v('surface-2'),
        line: v('line'),
        ink: v('ink'),
        muted: v('muted'),
        faint: v('faint'),
        accent: v('accent'),
        'accent-ink': v('accent-ink'),
        ok: v('ok'),
        warn: v('warn'),
      },
      fontFamily: {
        sans: ['Satoshi', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Cabinet Grotesk"', 'Satoshi', 'ui-sans-serif', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / .04), 0 8px 24px -12px rgb(0 0 0 / .18)',
        pop: '0 12px 40px -8px rgb(0 0 0 / .28)',
      },
    },
  },
  plugins: [],
} satisfies Config
