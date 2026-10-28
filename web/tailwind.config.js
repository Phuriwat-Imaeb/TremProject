const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // ฟอนต์โหลดจาก Google Fonts ใน public/index.html ถ้าโหลดไม่ได้ก็ใช้ฟอนต์ของเครื่องแทน
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};
