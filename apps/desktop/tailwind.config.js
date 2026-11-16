/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        luna: {
          bg: "#070B14",
          surface: "#0D1422",
          surfaceHover: "#141F35",
          border: "#1B2A4A",
          cyan: "#00CFFF",
          blue: "#367BFF",
          glow: "#00E5FF",
          text: "#F4F8FF",
          muted: "#91A0B7",
          danger: "#FF3366",
          warning: "#FFB020",
          success: "#00E676"
        }
      },
      boxShadow: {
        'hologram': '0 0 25px rgba(0, 207, 255, 0.25)',
        'hologram-lg': '0 0 50px rgba(0, 207, 255, 0.35)',
        'blue-glow': '0 0 20px rgba(54, 123, 255, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
        'spin-reverse': 'spin 18s linear infinite reverse',
      }
    },
  },
  plugins: [],
}
