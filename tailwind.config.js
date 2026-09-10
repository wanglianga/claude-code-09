/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f5f7fa',
          100: '#e8edf4',
          700: '#33415c',
          900: '#0f1b2d',
        },
      },
    },
  },
  plugins: [],
}
