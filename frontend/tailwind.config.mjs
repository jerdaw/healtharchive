/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./src/app/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.25rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1120px",
      },
    },
    extend: {
      colors: {
        "ha-bg": "#f3f4f6",
        "ha-card": "#ffffff",
        "ha-border": "#e5e7eb",
        "ha-accent": "#1d4ed8",
        "ha-accent-soft": "#eff6ff",
        "ha-muted": "#6b7280",
        "ha-danger": "#b91c1c",
      },
      boxShadow: {
        "ha-soft": "0 18px 45px rgba(15, 23, 42, 0.08)",
      },
      borderRadius: {
        "2xl": "1.25rem",
      },
      fontFamily: {
        playfair: ["var(--font-playfair)", "serif"],
        merriweather: ["var(--font-merriweather)", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
