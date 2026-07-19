import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0B1220',
          700: '#16233A',
          600: '#243352',
        },
        volt: {
          400: '#3DDBFF',
          600: '#0BA5CC',
        },
        signal: {
          500: '#FFB020',
        },
        paper: {
          50: '#F5F7FA',
          100: '#ECEFF4',
        },
        graphite: {
          900: '#10192B',
        },
        muted: '#6B7686',
        line: '#DCE1E8',
      },
      fontFamily: {
        sans: ['"Golos Text"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        xl: '16px',
        '2xl': '24px',
      },
    },
  },
  plugins: [],
};
export default config;
