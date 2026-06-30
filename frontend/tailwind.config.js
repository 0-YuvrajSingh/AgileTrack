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
          bg: '#f6f9fc',       // Signature app background
          textDark: '#0a2540', // Deep slate for headers
          textLight: '#425466',// Muted slate for body
          primary: '#635bff',  // The Stripe Blurple
          primaryHover: '#0a2540', // Stripe buttons turn dark on hover
          border: '#e6ebf1',
          surface: '#ffffff',
        }
      },
      boxShadow: {
        'stripe': '0 2px 5px 0 rgba(0,0,0,0.08), 0 1px 1.5px 0 rgba(0,0,0,0.04)',
        'stripe-hover': '0 6px 12px -2px rgba(50,50,93,0.25), 0 3px 7px -3px rgba(0,0,0,0.3)',
        'stripe-modal': '0 15px 35px rgba(50,50,93,0.1), 0 5px 15px rgba(0,0,0,0.07)',
      }
    },
  },
  plugins: [],
}
