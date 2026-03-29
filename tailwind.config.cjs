/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './content/**/*.{ts,tsx}',
    './engine/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './gameData.ts',
    './types.ts',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
