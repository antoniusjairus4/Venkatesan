/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0f7f3',
          100: '#dbeee2',
          200: '#bbdec9',
          300: '#8ec7a8',
          400: '#5da982',
          500: '#398d62',
          600: '#2a724d',
          700: '#165b40', // Rajamanickam Deep Forest Green
          800: '#154b35',
          900: '#123e2d',
        },
        gold: {
          400: '#cfa968',
          500: '#c5a059', // Muted Accent Gold
          600: '#b18545',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}

