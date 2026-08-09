/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef8f4',
          100: '#dcf0e8',
          200: '#bce0d1',
          300: '#8ccaaf',
          400: '#58ae87',
          500: '#389269',
          600: '#2b7554',
          700: '#255e44',
          800: '#1f4c39',
          900: '#1b3f30',
          950: '#0e241c',
        },
        accent: {
          50: '#f0f6fc',
          100: '#ddecf8',
          200: '#c2ddf3',
          300: '#97c7eb',
          400: '#66aae0',
          500: '#438ed2',
          600: '#3173be',
          700: '#285da8',
          800: '#254e8a',
          900: '#214272',
          950: '#14294a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
