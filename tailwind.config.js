/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1677ff',
        'primary-light': '#4096ff',
        'primary-dark': '#0958d9',
      },
    },
  },
  plugins: [],
}
