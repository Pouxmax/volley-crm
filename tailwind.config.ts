import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['var(--font-syne)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          blue: '#185FA5',
          'blue-dark': '#124a82',
          'blue-light': '#e8f1fb',
          green: '#1A7A56',
          'green-dark': '#145f43',
          'green-light': '#e8f5ef',
        },
      },
    },
  },
  plugins: [],
};

export default config;
