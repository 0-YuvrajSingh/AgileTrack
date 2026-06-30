/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        stripe: {
          bg: '#f6f9fc',
          textDark: '#0a2540',
          textLight: '#425466',
          primary: '#635bff',
          primaryHover: '#0a2540',
          border: '#e6ebf1',
          surface: '#ffffff',
          error: '#cd3d64',
          success: '#00d924'
        }
      },
      boxShadow: {
        'stripe': '0 2px 5px -1px rgba(50,50,93,0.25), 0 1px 3px -1px rgba(0,0,0,0.3)',
        'stripe-hover': '0 6px 12px -2px rgba(50,50,93,0.25), 0 3px 7px -3px rgba(0,0,0,0.3)',
        'stripe-focus': '0 0 0 3px rgba(99, 91, 255, 0.4)',
      }
    },
  },
  plugins: [],
}
