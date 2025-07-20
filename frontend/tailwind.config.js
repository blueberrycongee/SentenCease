/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'morandi-bg': '#e1dedd',
        'morandi-card': '#c3beba',
        'morandi-text-primary': '#685c53',
        'morandi-text-secondary': '#867d75',
        'morandi-highlight': '#a49d98',
      }
    },
  },
  plugins: [],
} 