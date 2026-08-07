/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.html", "./public/**/*.js"],
  theme: {
    extend: {
      colors: {
        background: "oklch(1 0 0)",
        foreground: "oklch(0.20 0.04 255)",
        primary: {
          DEFAULT: "#0B255A",
          foreground: "oklch(1 0 0)",
        },
        accent: {
          DEFAULT: "#0B255A",
          foreground: "oklch(0.20 0.04 255)",
        },
        card: {
          DEFAULT: "oklch(0.99 0.005 250)",
          foreground: "oklch(0.20 0.04 255)",
        },
        popover: {
          DEFAULT: "oklch(0.99 0.005 250)",
          foreground: "oklch(0.20 0.04 255)",
        },
        muted: {
          DEFAULT: "oklch(0.96 0.02 250)",
          foreground: "oklch(0.45 0.03 255)",
        },
        secondary: {
          DEFAULT: "oklch(0.96 0.02 250)",
          foreground: "oklch(0.20 0.04 255)",
        },
        border: "oklch(0.90 0.02 250)",
        destructive: {
          DEFAULT: "oklch(0.62 0.22 27)",
          foreground: "oklch(1 0 0)",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', "Georgia", "serif"],
        sans: ['"Manrope"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        display: "-0.01em",
      },
      boxShadow: {
        glow: "var(--shadow-glow)",
      },
      backgroundImage: {
        "gradient-hero": "var(--gradient-hero)",
        "gradient-brand": "var(--gradient-gold)",
      },
      animation: {
        "fade-in": "fade-in 0.7s ease-out forwards",
        "scale-in": "scale-in 0.6s ease-out forwards",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
