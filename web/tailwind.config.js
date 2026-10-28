/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans Thai"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#effcf9',
          100: '#d7f7f0',
          200: '#b3eee2',
          300: '#80dfcf',
          400: '#49c8b6',
          500: '#26ad9d',
          600: '#168b80',
          700: '#176f68',
          800: '#175954',
          900: '#174a47',
          950: '#082d2c',
        },
        canvas: '#f7faf9',
      },
      boxShadow: {
        soft: '0 18px 50px -24px rgba(8, 45, 44, 0.28)',
        card: '0 12px 30px -20px rgba(8, 45, 44, 0.22)',
      },
      minHeight: {
        hero: '34rem',
      },
    },
  },
  plugins: [],
};
