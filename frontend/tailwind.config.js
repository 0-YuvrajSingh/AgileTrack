/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cloudflare Classic Palette
        cf: {
          orange: '#F38020',       // Primary buttons, active states
          orangeHover: '#D9711C',
          navy: '#1E2B3C',         // Sidebars, Top Nav, dark backgrounds
          navyDark: '#151F2B',     // Active nav items
          textDark: '#333333',     // Main body text
          textMuted: '#777777',    // Secondary text
          bgLight: '#F7F7F9',      // Main app background (off-white)
          border: '#EAEAEA',       // Card and table borders
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'], // Clean, technical font
      },
      boxShadow: {
        'cf-card': '0 1px 3px rgba(0,0,0,0.05)', // Very flat, subtle shadows
      }
    },
  },
  plugins: [],
}
