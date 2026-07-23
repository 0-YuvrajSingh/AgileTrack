/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // AgileTrack palette — Indigo/Slate SaaS, 60/30/10
        // 60% cf.bgLight (canvas)  30% cf.navy/textDark (structure+content)  10% cf.orange (accent)
        cf: {
          orange: '#5B4FE9',        // Accent (10%): primary CTAs, active states, links, focus
          orangeHover: '#4A3DD1',
          orangeSoft: '#EEEDFC',    // tint for soft badges/backgrounds on light surfaces
          navy: '#161B2E',          // Structure (30%): sidebar, header, dark surfaces
          navyDark: '#0F1320',      // Active nav items, deepest structural surface
          navySoft: '#232A45',      // Hover state on navy surfaces
          textDark: '#1C2130',      // Main body text
          textMuted: '#6B7280',     // Secondary text
          bgLight: '#F5F6FA',       // Main app background (60%, off-white/cool gray)
          border: '#E5E7F0',        // Card and table borders
        },
        status: {
          success: '#16A34A',
          successBg: '#E9F9EE',
          warning: '#D97706',
          warningBg: '#FDF3E1',
          info: '#5B4FE9',
          infoBg: '#EEEDFC',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'], // Clean, technical font
      },
      boxShadow: {
        'cf-card': '0 1px 3px rgba(15,19,32,0.06)', // Very flat, subtle shadows
        'cf-card-lg': '0 8px 24px rgba(15,19,32,0.10)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(2deg)' },
        },
        blob: {
          '0%, 100%': { transform: 'scale(1) translate(0,0)' },
          '33%': { transform: 'scale(1.08) translate(20px,-10px)' },
          '66%': { transform: 'scale(0.95) translate(-15px,15px)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        drawLine: {
          '0%': { strokeDashoffset: '400' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        floatSlow: 'floatSlow 6s ease-in-out infinite',
        blob: 'blob 10s ease-in-out infinite',
        fadeUp: 'fadeUp 0.7s ease-out both',
        drawLine: 'drawLine 2.5s ease-out forwards',
      }
    },
  },
  plugins: [],
}
