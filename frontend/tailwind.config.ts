import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef4ff",
          100: "#dbe7fe",
          200: "#b8d1fe",
          300: "#8db6fc",
          400: "#5b96f7",
          500: "#115ce9",
          600: "#0d4fcc",
          700: "#0a3d9e",
          800: "#082c73",
          900: "#061d4f",
        },
        surface: {
          50: "#f7f7f7",
          100: "#e9e9e7",
          200: "#d0d0cd",
          300: "#b5b5b0",
          400: "#9b9a97",
          500: "#787774",
          600: "#5e5e5a",
          700: "#37352f",
          800: "#2b2a27",
          900: "#1a1a18",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
