import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a12',
        panel: '#12121f',
        neon: {
          pink: '#ff2d95',
          cyan: '#22d3ee',
          violet: '#8b5cf6',
          lime: '#a3e635',
        },
      },
      fontFamily: {
        display: ['ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        pop: { '0%': { transform: 'scale(.8)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        pop: 'pop .18s ease-out',
      },
    },
  },
  plugins: [],
};
export default config;
