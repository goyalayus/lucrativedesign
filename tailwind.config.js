/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tan': '#e8e6e1',
        'dark-tan': '#d1cdc5',
        'olive': '#aeb3a3',
        'charcoal': '#222',
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'], // Changed to Manrope
      }
    },
  },
  plugins: [],
}
