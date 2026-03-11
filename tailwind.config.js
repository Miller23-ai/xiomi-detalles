/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pink: {
          50:  '#fff0f6',
          100: '#ffd6e8',
          200: '#ffadd4',
          300: '#ff85be',
          400: '#ff5ca8',
          500: '#f43f8a',
          600: '#d4246e',
          700: '#a8155a',
          800: '#7d0d45',
          900: '#530830',
        },
        rose: {
          50:  '#fff5f7',
          500: '#e8436a',
          600: '#c73259',
        }
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 20px rgba(244, 63, 138, 0.08)',
        'card': '0 4px 24px rgba(0,0,0,0.06)',
      }
    },
  },
  plugins: [],
}
